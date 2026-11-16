import { requireAffiliate } from '@/lib/affiliate-data';
import { COMMISSION_STATUS_LABEL, maskCustomer, parseEarnings, planName } from '@/lib/affiliate';
import { formatMinorSafe } from '@/lib/money';

export const metadata = { title: 'My earnings' };

const TONE: Record<string, string> = { pending: 'bg-warn-bg text-warn', approved: 'bg-brand-soft text-brand', paid: 'bg-ok-bg text-ok', reversed: 'bg-bad-bg text-bad' };
const day = (iso: string) => (iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : '');

export default async function EarningsPage() {
  const { supabase } = await requireAffiliate();
  const { data } = await supabase.rpc('affiliate_earnings_list', { p_limit: 300 });
  const rows = parseEarnings(data);
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">My Earnings</h1>
        <p className="mt-1 text-muted">Month 1: 50%. Months 2 and 3: 20%. Month 4 on: 0%. Rates apply to the net amount received after payment fees.</p>
      </div>
      <section className="rounded-2xl border border-line bg-white shadow-sm">
        {rows.length === 0 ? <p className="p-4 text-sm text-muted">No commissions yet. They appear here after a referred customer pays.</p> : (
          <>
            <div className="hidden grid-cols-[1.2fr_1fr_1fr_1fr_1fr_1fr] gap-3 border-b border-line bg-page px-4 py-2 text-xs font-semibold text-muted md:grid">
              <span>Customer</span><span>Plan</span><span>Month</span><span>Date</span><span className="text-right">Commission</span><span>Status</span>
            </div>
            <ul className="divide-y divide-line">
              {rows.map((r, i) => (
                <li key={`${r.paymentDate}-${i}`} className="grid grid-cols-2 gap-x-3 gap-y-1 px-4 py-3 text-sm md:grid-cols-[1.2fr_1fr_1fr_1fr_1fr_1fr] md:items-center">
                  <span className="font-medium text-navy">{r.kind === 'adjustment' ? 'Adjustment' : maskCustomer(r.refNo)}</span>
                  <span className="text-right md:text-left">{r.kind === 'adjustment' ? '-' : planName(r.plan)}</span>
                  <span>{r.kind === 'adjustment' ? 'Admin' : `Month ${r.monthNo}`}</span>
                  <span className="text-right text-muted md:text-left">{day(r.paymentDate)}</span>
                  <span className="font-semibold text-navy md:text-right">{formatMinorSafe(r.commissionMinor, r.currency)}</span>
                  <span className="text-right md:text-left">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONE[r.status] ?? 'bg-slate-100 text-slate-700'}`}>{COMMISSION_STATUS_LABEL[r.status] ?? r.status}</span>
                    </span>
                  {r.kind === 'adjustment' && r.reason ? <span className="col-span-2 break-words text-xs text-muted">{r.reason}</span> : null}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
