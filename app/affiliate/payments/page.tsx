import { requireAffiliate } from '@/lib/affiliate-data';
import { nextPayoutDate } from '@/lib/affiliate';
import { formatMinorSafe } from '@/lib/money';

export const metadata = { title: 'Payment history' };

type Payout = { id: string; currency: string; scheduled_for: string; total_minor: number; status: string; payment_reference: string | null; paid_at: string | null };
const TONE: Record<string, string> = { pending: 'bg-warn-bg text-warn', approved: 'bg-brand-soft text-brand', paid: 'bg-ok-bg text-ok', cancelled: 'bg-slate-100 text-slate-700' };
const LABEL: Record<string, string> = { pending: 'Pending review', approved: 'Approved, awaiting payment', paid: 'Paid', cancelled: 'Cancelled' };
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : '-');

export default async function PaymentsPage() {
  const { supabase } = await requireAffiliate();
  const { data } = await supabase.from('affiliate_payouts').select('id, currency, scheduled_for, total_minor, status, payment_reference, paid_at').order('scheduled_for', { ascending: false }).limit(100);
  const rows = (data ?? []) as Payout[];
  const next = nextPayoutDate();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Payment History</h1>
        <p className="mt-1 text-muted">Next payment date: <strong className="text-navy">{next.label}</strong>. An admin reviews every payment first.</p>
      </div>
      <section className="rounded-2xl border border-line bg-white shadow-sm">
        {rows.length === 0 ? <p className="p-4 text-sm text-muted">No payments yet. Commissions are paid on the 5th, after the 7-day refund period.</p> : (
          <>
            <div className="hidden grid-cols-[1fr_1fr_1.4fr_1fr] gap-3 border-b border-line bg-page px-4 py-2 text-xs font-semibold text-muted md:grid">
              <span>Payment date</span><span>Amount paid</span><span>Payment reference</span><span>Status</span>
            </div>
            <ul className="divide-y divide-line">
              {rows.map((r) => (
                <li key={r.id} className="grid grid-cols-2 gap-x-3 gap-y-1 px-4 py-3 text-sm md:grid-cols-[1fr_1fr_1.4fr_1fr] md:items-center">
                  <span className="font-medium text-navy">{r.status === 'paid' ? day(r.paid_at) : `Due ${day(r.scheduled_for)}`}</span>
                  <span className="text-right font-semibold text-navy md:text-left">{formatMinorSafe(r.total_minor, r.currency)}</span>
                  <span className="col-span-2 break-all text-muted md:col-span-1">{r.payment_reference ?? 'Not paid yet'}</span>
                  <span className="col-span-2 md:col-span-1"><span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONE[r.status] ?? 'bg-slate-100 text-slate-700'}`}>{LABEL[r.status] ?? r.status}</span></span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
