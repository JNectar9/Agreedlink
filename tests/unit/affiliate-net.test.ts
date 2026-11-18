import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { REVERSAL_EVENTS, computePaystackCharges, netRevenueMinor, reversalReference, vatModeFromEnv } from '../../lib/paystack-charges';
import { recordAffiliateCommission } from '../../lib/affiliate-commission';
import { calcCommission } from '../../lib/affiliate';

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');
const sql = read('supabase/migrations/20261109_affiliate_net_commission.sql');

// Example Paystack fees (kobo) used only to exercise the maths. Real figures come from Paystack for every payment.
const PRO = { gross: 1_400_000, fees: 31_000 }; // ₦14,000, example fee ₦310
const PREMIUM = { gross: 3_600_000, fees: 64_000 }; // ₦36,000, example fee ₦640

function commissions(gross: number, fees: number, mode: 'additional' | 'included') {
  const ch = computePaystackCharges(fees, mode)!;
  const net = netRevenueMinor(gross, ch)!;
  return { ch, net, months: [1, 2, 3, 4].map((m) => calcCommission(gross, ch.feeMinor, m, ch.vatMinor).commissionMinor) };
}

describe('net revenue = payment - Paystack fee - VAT on that fee', () => {
  it('Pro, VAT on top of the fee', () => {
    const r = commissions(PRO.gross, PRO.fees, 'additional');
    expect(r.ch).toMatchObject({ feeMinor: 31_000, vatMinor: 2_325, totalChargesMinor: 33_325 });
    expect(r.net).toBe(1_366_675);
    expect(r.months).toEqual([683_337, 273_335, 273_335, 0]);
  });
  it('Premium, VAT on top of the fee', () => {
    const r = commissions(PREMIUM.gross, PREMIUM.fees, 'additional');
    expect(r.ch).toMatchObject({ feeMinor: 64_000, vatMinor: 4_800 });
    expect(r.net).toBe(3_531_200);
    expect(r.months).toEqual([1_765_600, 706_240, 706_240, 0]);
  });
  it('Pro, fee already includes VAT', () => {
    const r = commissions(PRO.gross, PRO.fees, 'included');
    expect(r.ch).toMatchObject({ feeMinor: 28_837, vatMinor: 2_163, totalChargesMinor: 31_000 });
    expect(r.net).toBe(1_369_000);
    expect(r.months).toEqual([684_500, 273_800, 273_800, 0]);
  });
  it('Premium, fee already includes VAT', () => {
    const r = commissions(PREMIUM.gross, PREMIUM.fees, 'included');
    expect(r.net).toBe(3_536_000);
    expect(r.months).toEqual([1_768_000, 707_200, 707_200, 0]);
  });
  it('a waived fee of 0 is valid, but a missing or malformed fee is never guessed', () => {
    expect(computePaystackCharges(0)).toMatchObject({ feeMinor: 0, vatMinor: 0 });
    for (const bad of [null, undefined, -1, 1.5, '300', NaN]) expect(computePaystackCharges(bad)).toBeNull();
  });
  it('charges larger than the payment give no net revenue', () => {
    expect(netRevenueMinor(1000, computePaystackCharges(5000)!)).toBeNull();
  });
  it('the VAT mode defaults to "additional" and only "included" changes it', () => {
    expect([undefined, '', 'x', 'additional'].map(vatModeFromEnv)).toEqual(['additional', 'additional', 'additional', 'additional']);
    expect(vatModeFromEnv(' Included ')).toBe('included');
  });
});

type Call = [string, Record<string, unknown>];
const fakeDb = (result: { data: unknown; error: { message: string; code?: string } | null }) => {
  const calls: Call[] = [];
  return { calls, rpc: async (fn: string, args: Record<string, unknown>) => { calls.push([fn, args]); return result; } };
};
const payment = (over: Record<string, unknown> = {}) => ({ id: 1, status: 'success', reference: 'agl_7c9832047352b93667855b4e', amount: PRO.gross, currency: 'NGN', fees: PRO.fees, ...over });

describe('recording a commission from a verified payment', () => {
  it('sends only the reference, the fee, the VAT and how the VAT was worked out (the database reads the rest)', async () => {
    const db = fakeDb({ data: 'recorded', error: null });
    const r = await recordAffiliateCommission(db, payment(), {});
    expect(r).toEqual({ outcome: 'recorded', retry: false, note: null });
    expect(db.calls).toEqual([['affiliate_record_paystack_payment', { p_reference: 'agl_7c9832047352b93667855b4e', p_fee_minor: 31_000, p_vat_minor: 2_325, p_vat_basis: 'additional' }]]);
  });
  it('Premium works the same way', async () => {
    const db = fakeDb({ data: 'recorded', error: null });
    await recordAffiliateCommission(db, payment({ amount: PREMIUM.gross, fees: PREMIUM.fees }), {});
    expect(db.calls[0][1]).toMatchObject({ p_fee_minor: 64_000, p_vat_minor: 4_800 });
  });
  it('PAYSTACK_FEE_VAT_MODE=included splits the reported fee instead of adding VAT', async () => {
    const db = fakeDb({ data: 'recorded', error: null });
    await recordAffiliateCommission(db, payment(), { PAYSTACK_FEE_VAT_MODE: 'included' });
    expect(db.calls[0][1]).toMatchObject({ p_fee_minor: 28_837, p_vat_minor: 2_163, p_vat_basis: 'included' });
  });
  it('records nothing and calls nothing for refunded, reversed, failed or abandoned payments', async () => {
    for (const status of ['reversed', 'failed', 'abandoned', 'ongoing']) {
      const db = fakeDb({ data: 'recorded', error: null });
      expect((await recordAffiliateCommission(db, payment({ status }), {})).outcome).toBe('not_successful');
      expect(db.calls).toHaveLength(0);
    }
  });
  it('rejects unexpected currencies before touching the database', async () => {
    const db = fakeDb({ data: 'recorded', error: null });
    expect((await recordAffiliateCommission(db, payment({ currency: 'USD' }), {})).outcome).toBe('currency_not_supported');
    expect(db.calls).toHaveLength(0);
  });
  it('does not estimate: when Paystack gives no fee, nothing is recorded and a person is told', async () => {
    const db = fakeDb({ data: 'recorded', error: null });
    const r = await recordAffiliateCommission(db, payment({ fees: undefined }), {});
    expect(r.outcome).toBe('fee_unavailable');
    expect(r.note).toContain('no commission was recorded');
    expect(db.calls).toHaveLength(0);
  });
  it('a repeated webhook for the same payment records nothing new', async () => {
    const r = await recordAffiliateCommission(fakeDb({ data: 'duplicate', error: null }), payment(), {});
    expect(r).toEqual({ outcome: 'duplicate', retry: false, note: null });
  });
  it('a temporary database error asks Paystack to retry; a missing migration does not', async () => {
    expect((await recordAffiliateCommission(fakeDb({ data: null, error: { message: 'boom', code: 'XX000' } }), payment(), {})).retry).toBe(true);
    const missing = await recordAffiliateCommission(fakeDb({ data: null, error: { message: 'x', code: 'PGRST202' } }), payment(), {});
    expect(missing).toMatchObject({ outcome: 'not_installed', retry: false });
  });
});

describe('refunds and disputes', () => {
  it('only a processed refund and an opened dispute cancel a commission', () => {
    expect(Object.keys(REVERSAL_EVENTS).sort()).toEqual(['charge.dispute.create', 'refund.processed']);
  });
  it('finds the original transaction reference in both event shapes and nowhere else', () => {
    const ref = 'agl_7c9832047352b93667855b4e';
    expect(reversalReference({ data: { transaction_reference: ref, refund_reference: 'rf_123456789' } })).toBe(ref);
    expect(reversalReference({ data: { transaction: { reference: ref } } })).toBe(ref);
    expect(reversalReference({ data: { reference: ref } })).toBeNull();
    expect(reversalReference({ data: { transaction_reference: 'bad ref!' } })).toBeNull();
    expect(reversalReference(null)).toBeNull();
  });
});

describe('the migration', () => {
  it('records VAT in its own column and adds no table', () => {
    expect(sql).toContain('add column if not exists vat_minor bigint not null default 0');
    expect(sql).not.toMatch(/create table/i);
  });
  it('the Paystack commission function is server-only and reads the payment from the database', () => {
    expect(sql).toMatch(/revoke all on function public\.affiliate_record_paystack_payment\(text, bigint, bigint, text\) from public, anon, authenticated/);
    expect(sql).toMatch(/grant execute on function public\.affiliate_record_paystack_payment\(text, bigint, bigint, text\) to service_role/);
    expect(sql).toContain("if t.status <> 'success' then return 'not_successful'");
    expect(sql).toContain("if t.currency <> 'NGN' then return 'currency_not_supported'");
    expect(sql).toContain('where lower(payment_ref) = lower(p_reference)');
  });
  it('failed payments cannot advance the month: only successful Paystack payments are counted', () => {
    expect(sql).toContain("x.status = 'success'");
    expect(sql).toContain('greatest(paid_rank, sale_rows + 1)');
  });
  it('self-referral is blocked by user id and by normalised email', () => {
    expect(sql).toContain('if aff.user_id = p_user then return \'self_referral\'');
    expect(sql).toContain('_normalize_email(ref_email)');
    expect(sql).toContain('_normalize_email(aff_login_email)');
  });
  it('affiliates still cannot see VAT, payment references or customer ids: nothing here grants them', () => {
    expect(sql).not.toMatch(/grant select/i);
  });
});

describe('both payment paths record the commission', () => {
  it('the webhook records it for activated AND already-processed payments, and handles refunds and disputes', () => {
    const w = read('app/api/paystack/webhook/route.ts');
    expect(w).toContain("outcome === 'activated' || outcome === 'already_processed'");
    expect(w).toContain('recordAffiliateCommission(db, d)');
    expect(w).toContain('REVERSAL_EVENTS');
    expect(w).toContain("'affiliate_handle_reversal'");
  });
});
