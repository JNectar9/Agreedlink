import { COMMISSION_STATUS_LABEL, maskCustomer, planName, subscriptionStatus, type ReferralRow } from '@/lib/affiliate';
import { formatMinorSafe } from '@/lib/money';

const STATUS_TONE: Record<string, string> = { Active: 'bg-green-100 text-green-700', 'Not active': 'bg-slate-100 text-slate-700' };
const COMM_TONE: Record<string, string> = { pending: 'text-warn', approved: 'text-brand', paid: 'text-ok', none: 'text-muted' };
const day = (iso: string) => (iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : '');

/** Customers show only as a number. Rows stack on phones and become a table from the medium size up. */
export function ReferralList({ rows, fallbackCurrency }: { rows: ReferralRow[]; fallbackCurrency: string }) {
  if (rows.length === 0) return <p className="px-1 py-4 text-sm text-muted">No referrals yet. Share your link to get started.</p>;
  return (
    <div>
      <div className="hidden grid-cols-[1.2fr_1fr_1fr_1fr_1fr] gap-3 border-b border-line bg-page px-3 py-2 text-xs font-semibold text-muted md:grid">
        <span>Customer</span><span>Plan</span><span>Status</span><span>Date</span><span className="text-right">Commission</span>
      </div>
      <ul className="divide-y divide-line">
        {rows.map((r) => {
          const status = subscriptionStatus(r.currentPlan);
          const amount = formatMinorSafe(r.commissionMinor, r.currency || fallbackCurrency);
          return (
            <li key={r.refNo} className="grid grid-cols-2 gap-x-3 gap-y-1 px-3 py-3 text-sm md:grid-cols-[1.2fr_1fr_1fr_1fr_1fr] md:items-center">
              <span className="font-medium text-navy">{maskCustomer(r.refNo)}</span>
              <span className="text-right text-ink md:text-left">{planName(r.plan || r.currentPlan)}</span>
              <span><span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_TONE[status]}`}>{status}</span></span>
              <span className="text-right text-muted md:text-left">{day(r.referredAt)}</span>
              <span className={`col-span-2 text-right font-semibold md:col-span-1 ${COMM_TONE[r.commissionStatus] ?? 'text-muted'}`}>
                {r.commissionStatus === 'none' ? COMMISSION_STATUS_LABEL.none : `${amount} (${COMMISSION_STATUS_LABEL[r.commissionStatus] ?? r.commissionStatus})`}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
