import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  affiliateErrorCopy, calcCommission, chartScale, commissionRate, conversionRate, csvCell, earnedOf, maskCustomer, moneyText, nextPayoutDate,
  parseApplication, parseDashboard, parseReferrals, parseTotals, referralUrl, toCsv, whatsappShare
} from '@/lib/affiliate';
import { REF_PATTERN, isBotAgent, signRef, verifyRef } from '@/lib/referral-cookie';

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');
const sql = read('supabase/migrations/20261108_affiliates.sql');

describe('commission rates', () => {
  it('month 1 is 50%, months 2 and 3 are 20%, month 4 on is 0%', () => {
    expect([1, 2, 3, 4, 5, 12].map(commissionRate)).toEqual([50, 20, 20, 0, 0, 0]);
  });
  it('matches the published examples when there is no processing fee', () => {
    expect(calcCommission(900, 0, 1).commissionMinor).toBe(450);
    expect(calcCommission(900, 0, 2).commissionMinor).toBe(180);
    expect(calcCommission(900, 0, 3).commissionMinor).toBe(180);
    expect(calcCommission(2400, 0, 1).commissionMinor).toBe(1200);
    expect(calcCommission(2400, 0, 2).commissionMinor).toBe(480);
    expect(calcCommission(2400, 0, 3).commissionMinor).toBe(480);
  });
  it('pays nothing from month 4', () => {
    expect(calcCommission(900, 0, 4).commissionMinor).toBe(0);
    expect(calcCommission(2400, 0, 9).commissionMinor).toBe(0);
  });
  it('uses the NET amount: fees come off first, and cents round down', () => {
    expect(calcCommission(1400000, 21000, 1)).toEqual({ netMinor: 1379000, ratePercent: 50, commissionMinor: 689500 });
    expect(calcCommission(1001, 0, 2).commissionMinor).toBe(200);
    expect(calcCommission(100, 500, 1).netMinor).toBe(0);
  });
});

describe('pay day', () => {
  it('is the 5th: this month up to the 5th, next month after it', () => {
    expect(nextPayoutDate(new Date('2026-11-14T10:00:00Z')).label).toBe('5th December, 2026');
    expect(nextPayoutDate(new Date('2026-11-14T10:00:00Z')).includes).toBe('November 2026');
    expect(nextPayoutDate(new Date('2026-11-05T23:00:00Z')).label).toBe('5th November, 2026');
    expect(nextPayoutDate(new Date('2026-11-01T00:00:00Z')).includes).toBe('October 2026');
    expect(nextPayoutDate(new Date('2026-12-20T10:00:00Z')).label).toBe('5th January, 2027');
    expect(nextPayoutDate(new Date('2026-12-20T10:00:00Z')).includes).toBe('December 2026');
    expect(nextPayoutDate(new Date('2027-01-03T10:00:00Z')).includes).toBe('December 2026');
  });
});

describe('display helpers', () => {
  it('hides customers behind a number', () => {
    expect(maskCustomer(7421)).toBe('Customer #7421');
    expect(maskCustomer(0)).toBe('Adjustment');
  });
  it('builds links and rates', () => {
    expect(referralUrl('JM123ABC', 'https://agreedlink.vercel.app/')).toBe('https://agreedlink.vercel.app/?ref=JM123ABC');
    expect(whatsappShare('https://x.test/?ref=A1')).toContain('wa.me');
    expect(conversionRate(72, 1248)).toBe('5.8%');
    expect(conversionRate(0, 0)).toBe('0%');
  });
  it('shows totals per currency and zero in a fallback currency', () => {
    const t = parseTotals([{ currency: 'NGN', pending_minor: 1000, approved_minor: 0, paid_minor: 500 }, { currency: 'USD', pending_minor: 450, approved_minor: 0, paid_minor: 0 }]);
    expect(earnedOf(t[0])).toBe(1500);
    expect(moneyText(t, (x) => x.paidMinor, 'NGN')).toContain('5.00');
    expect(moneyText([], (x) => x.paidMinor, 'NGN')).toContain('0.00');
  });
  it('scales the chart to the biggest number and never below 5', () => {
    expect(chartScale([])).toBe(5);
    expect(chartScale([{ day: 'a', clicks: 3, registrations: 1, commissions: 0 }])).toBe(5);
    expect(chartScale([{ day: 'a', clicks: 88, registrations: 1, commissions: 0 }])).toBe(100);
    expect(chartScale([{ day: 'a', clicks: 130, registrations: 1, commissions: 0 }])).toBe(200);
  });
});

describe('reading database results safely', () => {
  it('handles junk', () => {
    expect(parseDashboard(null).status).toBe('none');
    expect(parseDashboard({ status: 'hacker' }).status).toBe('none');
    expect(parseDashboard({ status: 'approved', clicks: 'x', code: 'ABC12345', series: 'no' })).toMatchObject({ status: 'approved', clicks: 0, code: 'ABC12345', series: [] });
    expect(parseReferrals('nope')).toEqual([]);
  });
});

describe('application form', () => {
  const ok = { name: 'Ada Obi', email: 'ada@example.com', whatsapp: '+234 800 000 0000', platform: 'Instagram', reason: 'I run a freelancer community.' };
  it('accepts a good application and cleans the phone number', () => {
    const r = parseApplication(ok);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.whatsapp).toBe('+2348000000000');
  });
  it('rejects bad fields', () => {
    for (const bad of [{ name: 'A' }, { email: 'nope' }, { whatsapp: '123' }, { platform: '' }, { reason: 'short' }]) expect(parseApplication({ ...ok, ...bad }).ok, JSON.stringify(bad)).toBe(false);
  });
  it('explains database errors in plain words and hides details', () => {
    expect(affiliateErrorCopy({ message: 'already_applied' })).toContain('already applied');
    expect(affiliateErrorCopy({ code: 'PGRST202' })).toContain('20261108_affiliates.sql');
    expect(affiliateErrorCopy({ message: 'secret table exploded' })).toBe('Something went wrong. Please try again.');
  });
});

describe('csv', () => {
  it('quotes cells and blocks spreadsheet formulas', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvCell('+1')).toBe("'+1");
    expect(csvCell(null)).toBe('');
    expect(toCsv([{ a: 1, b: 'x' }], ['a', 'b'])).toBe('a,b\r\n1,x\r\n');
  });
});

describe('signed referral cookie', () => {
  const secret = 'test-secret';
  it('accepts its own cookie and rejects edits, expiry and junk', async () => {
    const now = Date.now();
    const good = await signRef('JM123ABC', now, secret);
    expect(await verifyRef(good, secret, now + 1000)).toEqual({ code: 'JM123ABC', clickedAtMs: now });
    expect(await verifyRef(good.replace('JM123ABC', 'OTHER123'), secret, now)).toBeNull();
    expect(await verifyRef(good, 'another-secret', now)).toBeNull();
    expect(await verifyRef(good, secret, now + 31 * 24 * 3600 * 1000)).toBeNull();
    expect(await verifyRef(await signRef('JM123ABC', now + 3600_000, secret), secret, now)).toBeNull();
    for (const bad of [undefined, '', 'x', 'a.b', 'JM123ABC.123.sig', 'x'.repeat(200)]) expect(await verifyRef(bad, secret, now), String(bad)).toBeNull();
    expect(await verifyRef(good, secret, now + 29 * 24 * 3600 * 1000)).not.toBeNull();
  });
  it('knows the code shape and ignores bots and link previews', () => {
    expect(REF_PATTERN.test('AFFILIATE123')).toBe(true);
    expect(REF_PATTERN.test('ab')).toBe(false);
    expect(isBotAgent('WhatsApp/2.23')).toBe(true);
    expect(isBotAgent('Googlebot/2.1')).toBe(true);
    expect(isBotAgent(null)).toBe(true);
    expect(isBotAgent('Mozilla/5.0 (Linux; Android 14) Chrome/120 Mobile Safari/537.36')).toBe(false);
  });
});

describe('database security', () => {
  it('has the six required tables with row level security on', () => {
    for (const t of ['affiliates', 'affiliate_referrals', 'affiliate_clicks', 'affiliate_commissions', 'affiliate_payouts', 'affiliate_audit_logs']) {
      expect(sql).toContain(`create table if not exists public.${t} (`);
      expect(sql).toContain(`alter table public.${t} enable row level security`);
    }
  });
  it('lets affiliates read only their own rows and safe columns, and write nothing', () => {
    expect(sql).toContain('revoke all on public.affiliates, public.affiliate_clicks, public.affiliate_referrals, public.affiliate_payouts');
    expect(sql).not.toMatch(/grant (insert|update|delete)/i);
    expect(sql).not.toMatch(/create policy \w+ on public\.\w+ for (insert|update|delete)/i);
    expect(sql).toContain('a.user_id = auth.uid()');
    expect(sql).toContain("grant select (id, ref_no, affiliate_id, referred_at) on public.affiliate_referrals");
    expect(sql).not.toMatch(/grant select \([^)]*referred_user_id/);
    expect(sql).not.toMatch(/grant select \([^)]*visitor_hash/);
    expect(sql).not.toMatch(/grant select \([^)]*payment_ref[,)]/);
  });
  it('pending applicants get no earnings or link, only the pending status', () => {
    expect(sql).toContain("a.status in ('approved', 'suspended')");
    expect(sql).toContain("if a.status not in ('approved', 'suspended') then");
  });
  it('the audit log can never be changed or deleted, and has no grants', () => {
    expect(sql).toContain("raise exception 'audit_log_is_append_only'");
    expect(sql).toContain('before update or delete on public.affiliate_audit_logs');
    expect(sql).not.toMatch(/grant [^;]*affiliate_audit_logs/);
  });
  it('one commission per payment reference, and one owner per customer', () => {
    expect(sql).toContain('create unique index if not exists affiliate_commissions_payment_once on public.affiliate_commissions (lower(payment_ref))');
    expect(sql).toContain('referred_user_id uuid not null unique');
    expect(sql).toContain('on conflict do nothing');
    expect(sql).toContain("return 'duplicate'");
  });
  it('commission maths is in the database: 50, 20, 20, then 0, on the net amount', () => {
    expect(sql).toContain('when 1 then 50 when 2 then 20 when 3 then 20 else 0');
    expect(sql).toContain('net := p_gross_minor - coalesce(p_fee_minor, 0)');
    expect(sql).toContain('floor(net::numeric * pct / 100)::bigint');
    expect(sql).toContain("return 'no_commission_after_month_3'");
    expect(sql).toContain("p_paid_at + interval '7 days'");
  });
  it('failed payments and non-paying rows never create commissions', () => {
    expect(sql).toContain("coalesce(p_gross_minor, 0) <= 0");
    expect(sql).toContain("if new.kind = 'payment' then");
    expect(sql).toContain("raise warning 'affiliate commission failed: %'");
  });
  it('blocks self-referral, late clicks, old clicks and re-attribution', () => {
    for (const s of ["return 'self_referral'", "return 'window_expired'", "return 'not_new_customer'", "return 'already_attributed'", "interval '30 days'", 'lower(u.email) = lower(aff.email)']) expect(sql).toContain(s);
  });
  it('payouts: previous months only, 7 days passed, admin approves, paid only with a real reference', () => {
    expect(sql).toContain('c.payment_date < month_start::timestamptz and c.eligible_after <= run_date::timestamptz');
    expect(sql).toContain('having sum(c.commission_minor) > 0');
    expect(sql).toContain("(date_trunc('month', run_date::timestamp)::date + 4)");
    expect(sql).toContain("if p.status <> 'approved' then raise exception 'invalid_state'");
    expect(sql).toContain("raise exception 'reference_required'");
    expect(sql).toContain("check ((status = 'paid') = (payment_reference is not null and paid_at is not null))");
    expect(sql).toContain("update public.affiliate_commissions set status = 'paid' where payout_id = p_payout and status = 'approved'");
  });
  it('every admin function checks admin; money functions are not callable by signed-in users', () => {
    const adminFns = sql.match(/create or replace function public\.admin_affiliate_\w+/g) ?? [];
    expect(adminFns.length).toBe(11);
    expect((sql.match(/perform public\._require_admin\(\)/g) ?? []).length).toBe(adminFns.length);
    for (const f of ['affiliate_log_click(text, text)', 'affiliate_attribute(uuid, text, timestamptz)', 'affiliate_record_payment(text, uuid, text, bigint, bigint, text, timestamptz)', 'affiliate_reverse_payment(text, text)']) {
      expect(sql).toMatch(new RegExp(`grant execute on function[\\s\\S]*public\\.${f.replace(/[()]/g, '\\$&')}[\\s\\S]*to service_role`));
    }
    expect(sql).not.toMatch(/public\.affiliate_record_payment\([^)]*\)[^;]*to authenticated/);
  });
  it('every adjustment and decision is written to the audit log with a reason', () => {
    expect(sql).toContain("'commission_adjusted'");
    expect(sql).toContain("'affiliate_' || p_decision");
    expect(sql).toContain("raise exception 'reason_required'");
  });
  it('does not touch subscriptions, prices or Paystack data', () => {
    expect(sql).not.toMatch(/alter table public\.(manual_subscriptions|subscriptions|plans|subscription_config|subscription_requests)/i);
    expect(sql).not.toMatch(/(update|delete from|insert into) public\.(manual_subscriptions|subscriptions|plans|subscription_config)/i);
  });
});

describe('app code', () => {
  const mw = read('middleware.ts');
  it('the middleware guards the affiliate area and uses the server key only on the server', () => {
    expect(mw).toContain("const GUARDED = ['/dashboard', '/portal', '/affiliate']");
    expect(mw).toContain("'/affiliate/:path*'");
    expect(mw).toContain('isBotAgent(agent)');
    expect(mw).toContain("rpc('affiliate_log_click'".replace("rpc('", "serverRpc('"));
    expect(mw).toContain('verifyRef(raw, secret)');
    expect(mw).toContain('httpOnly: true');
    expect(mw).not.toContain('NEXT_PUBLIC_SUPABASE_SERVICE');
  });
  it('affiliate pages send pending people to the application page and never read earnings for them', () => {
    expect(read('lib/affiliate-data.ts')).toContain("redirect('/affiliate/profile')");
    for (const p of ['app/affiliate/page.tsx', 'app/affiliate/referrals/page.tsx', 'app/affiliate/earnings/page.tsx', 'app/affiliate/payments/page.tsx']) expect(read(p)).toContain('requireAffiliate');
  });
  it('the dashboard matches the design and uses honest wording', () => {
    const d = read('app/affiliate/page.tsx');
    for (const s of ['Total Clicks',
      'Total Registrations',
      'Paying Customers',
      'Total Commissions',
      'Your Referral Link',
      'Share on WhatsApp',
      'View Sharing Guide',
      'Next Affiliate Payment',
      'Your Performance',
      'Earnings Summary',
      'View Payment History',
      'Recent Referrals',
      'Affiliate Tips',
      'Pending Commissions',
      'Approved Commissions',
      'Total Paid']) expect(d).toContain(s);
    expect(d).toContain('Paid after admin review');
    expect(d).not.toMatch(/paid automatically/i);
  });
  it('admin affiliates page is admin-only and covers every required action', () => {
    const a = read('app/dashboard/admin/affiliates/page.tsx');
    expect(a).toContain("rpc('is_admin')");
    expect(a).toContain('notFound()');
    for (const s of ['approve',
      'reject',
      'suspend',
      'reactivate',
      'Prepare payouts',
      'Approve payout',
      'Record payment',
      'Manual adjustment',
      'Audit log',
      'export?kind=affiliates',
      'export?kind=commissions',
      'export?kind=payouts',
      'Pro sales',
      'Premium sales']) expect(a).toContain(s);
    const route = read('app/api/admin/affiliates/export/route.ts');
    expect(route).toContain("rpc('is_admin')");
    expect(route).toContain('private, no-store');
  });
});
