// Records the affiliate commission for one VERIFIED Paystack payment. Used by the webhook and by the payment return page.
// It is safe to call more than once for the same payment: the database keeps one commission per payment reference.
import { computePaystackCharges, vatModeFromEnv } from './paystack-charges';
import type { PaystackVerifyData } from './paystack';

type RpcResult = { data: unknown; error: { message: string; code?: string } | null };
export type RpcClient = { rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<RpcResult> };

export type CommissionResult = {
  outcome: string;
  /** true: a temporary problem, ask Paystack to send the webhook again. */
  retry: boolean;
  /** Set when a person should look at it. It is stored on the webhook event row. */
  note: string | null;
};

/** Outcomes that are normal and need nobody's attention. */
const QUIET = new Set([
  'recorded', 'duplicate', 'no_referral', 'affiliate_not_active', 'no_commission_after_month_3', 'not_successful',
  'currency_not_supported', 'payment_reversed'
]);

export async function recordAffiliateCommission(db: RpcClient, d: PaystackVerifyData, env: Record<string, string | undefined> = process.env): Promise<CommissionResult> {
  // Only a payment Paystack itself reports as successful. Refunded, reversed and disputed payments are never "success".
  if (d.status !== 'success') return { outcome: 'not_successful', retry: false, note: null };
  if (String(d.currency ?? '').toUpperCase() !== 'NGN') return { outcome: 'currency_not_supported', retry: false, note: null };

  const charges = computePaystackCharges(d.fees, vatModeFromEnv(env.PAYSTACK_FEE_VAT_MODE));
  if (!charges) {
    return { outcome: 'fee_unavailable', retry: false, note: 'affiliate: Paystack gave no fee for this payment, so no commission was recorded' };
  }

  const { data, error } = await db.rpc('affiliate_record_paystack_payment', {
    p_reference: d.reference,
    p_fee_minor: charges.feeMinor,
    p_vat_minor: charges.vatMinor,
    p_vat_basis: charges.vatMode
  });
  if (error) {
    if (error.code === '42883' || error.code === 'PGRST202') {
      return { outcome: 'not_installed', retry: false, note: 'affiliate: run migration 20261109_affiliate_net_commission.sql' };
    }
    return { outcome: 'error', retry: true, note: `affiliate: ${error.message}`.slice(0, 300) };
  }
  const outcome = typeof data === 'string' ? data : 'unknown';
  return { outcome, retry: false, note: QUIET.has(outcome) ? null : `affiliate: ${outcome}` };
}
