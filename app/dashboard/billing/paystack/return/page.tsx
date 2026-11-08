import Link from 'next/link';
import { requireSession } from '@/lib/data';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyPaystackTransaction } from '@/lib/paystack';
import { formatNgn } from '@/lib/paystack-checkout';
import { planLabel } from '@/lib/subscriptions';
import { formatDateTime } from '@/lib/time';

export const metadata = { title: 'Payment status' };
export const dynamic = 'force-dynamic';

type Tx = { reference: string; status: string; plan: 'pro' | 'premium'; amount_minor: number; currency: string; period_end: string | null };
const COLUMNS = 'reference, status, plan, amount_minor, currency, period_end';

/**
 * Where Paystack sends the customer after checkout. The address (?reference=...) is NOT proof of payment: this page
 * asks Paystack directly, and only a verified, matching payment activates the plan. The webhook does the same
 * independently, and the database makes the two safe to run together.
 */
export default async function PaystackReturnPage({ searchParams }: { searchParams: { reference?: string; trxref?: string } }) {
  const { supabase, profile } = await requireSession();
  const reference = String(searchParams.reference ?? searchParams.trxref ?? '').trim().slice(0, 100);

  // Row Level Security: a customer can only ever read their own payments.
  const load = async () => {
    const { data } = await supabase.from('paystack_transactions').select(COLUMNS).eq('reference', reference).maybeSingle();
    return (data ?? null) as Tx | null;
  };
  let tx = reference ? await load() : null;
  let unconfirmed = false;

  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (tx && tx.status === 'pending' && secret) {
    const verified = await verifyPaystackTransaction(reference, secret);
    if (!verified.ok) {
      unconfirmed = verified.transient; // Paystack could not be reached: do not guess, ask the customer to refresh
    } else {
      const db = createAdminClient();
      const d = verified.data;
      if (d.status === 'success' && d.reference === reference) {
        await db.rpc('paystack_activate', {
          p_reference: reference,
          p_amount_minor: d.amount,
          p_currency: d.currency,
          p_paystack_id: String(d.id ?? ''),
          p_channel: d.channel ?? '',
          p_customer_code: d.customer?.customer_code ?? ''
        });
      } else if (d.status === 'failed' || d.status === 'abandoned') {
        await db.rpc('paystack_mark_status', { p_reference: reference, p_status: d.status });
      }
      tx = await load();
    }
  }

  let tone = 'bg-warn-bg text-warn';
  let title = 'We could not find that payment';
  let body = 'Open Billing to check your plan. If you were charged, contact support and quote your payment reference.';
  if (tx?.status === 'success') {
    tone = 'bg-ok-bg text-ok';
    title = 'Payment received';
    body = `Your ${planLabel(tx.plan)} plan is active${tx.period_end ? ` until ${formatDateTime(tx.period_end, profile.timezone)}` : ''}.`;
  } else if (tx?.status === 'pending') {
    title = unconfirmed ? 'We could not confirm your payment yet' : 'Your payment is still being confirmed';
    body = 'Nothing is lost. Refresh this page in a minute. Your plan changes only after Paystack confirms the payment.';
  } else if (tx?.status === 'failed' || tx?.status === 'abandoned') {
    tone = 'bg-bad-bg text-bad';
    title = tx.status === 'abandoned' ? 'Payment was not completed' : 'Payment failed';
    body = 'You were not charged for this attempt. You can try again from the Billing page.';
  } else if (tx?.status === 'amount_mismatch') {
    tone = 'bg-bad-bg text-bad';
    title = 'We need to review this payment';
    body = 'The amount received did not match the plan price. Please contact support and quote your payment reference. Your plan has not changed.';
  }

  return (
    <div className="max-w-xl space-y-5">
      <h1 className="text-2xl sm:text-3xl">Payment status</h1>
      <section className="card space-y-3" aria-label="Payment status">
        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>{title}</span>
        <p className="text-sm text-ink">{body}</p>
        {tx ? (
          <p className="text-xs text-muted">
            {planLabel(tx.plan)} plan, {formatNgn(tx.amount_minor)}. Reference: <code className="break-all">{tx.reference}</code>
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2 pt-1">
          <Link href="/dashboard/billing" className="btn-primary">Back to Billing</Link>
          {tx?.status === 'pending' ? <Link href={`/dashboard/billing/paystack/return?reference=${encodeURIComponent(tx.reference)}`} className="btn-secondary">Refresh</Link> : null}
        </div>
      </section>
    </div>
  );
}
