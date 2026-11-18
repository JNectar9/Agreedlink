import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Download } from 'lucide-react';
import { requireSession } from '@/lib/data';
import { formatMinorSafe } from '@/lib/money';
import { isUuid } from '@/lib/subscriptions';
import { moneyText, nextPayoutDate, parseTotals, referralUrl, type Totals } from '@/lib/affiliate';
import { siteBase } from '@/lib/affiliate-data';
import { Notice } from '@/components/Notice';
import { SubmitButton } from '@/components/SubmitButton';
import { ClearNoticeParams } from '@/components/ClearNoticeParams';
import { adjustAction, approvePayoutAction, cancelPayoutAction, decideAction, preparePayoutsAction, recordPayoutAction, reverseAction } from './actions';

export const metadata = { title: 'Admin: affiliates' };
export const dynamic = 'force-dynamic';

const BASE = '/dashboard/admin/affiliates';
const TABS = [['applications', 'Applications'], ['affiliates', 'Affiliates'], ['payouts', 'Payouts'], ['activity', 'Activity']] as const;
type Row = Record<string, unknown>;
const rows = (v: unknown): Row[] => (Array.isArray(v) ? (v as Row[]) : []);
const str = (v: unknown) => (typeof v === 'string' ? v : '');
const num = (v: unknown) => (typeof v === 'number' ? v : Number(v) || 0);
const day = (v: unknown) => { const t = str(v); return t ? new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : '-'; };
const TONE: Record<string, string> = {
  pending: 'bg-warn-bg text-warn', approved: 'bg-ok-bg text-ok', paid: 'bg-ok-bg text-ok', rejected: 'bg-bad-bg text-bad',
  suspended: 'bg-bad-bg text-bad', cancelled: 'bg-slate-100 text-slate-700', reversed: 'bg-bad-bg text-bad'
};
const Badge = ({ s }: { s: string }) => <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${TONE[s] ?? 'bg-slate-100 text-slate-700'}`}>{s}</span>;
const BTN2 = 'btn-secondary w-full';

export default async function AdminAffiliatesPage({ searchParams }: { searchParams: { tab?: string; affiliate?: string; error?: string; ok?: string } }) {
  const { supabase, profile } = await requireSession();
  const { data: isAdmin } = await supabase.rpc('is_admin');
  if (isAdmin !== true) notFound();

  const tab = TABS.some(([k]) => k === searchParams.tab) ? (searchParams.tab as string) : 'applications';
  const focus = isUuid(searchParams.affiliate) ? searchParams.affiliate : undefined;
  const here = `${BASE}?tab=${tab}${focus ? `&affiliate=${focus}` : ''}`;
  const cur = profile.default_currency;

  const [overviewRes, payoutsRes, auditRes, commissionsRes] = await Promise.all([
    supabase.rpc('admin_affiliate_overview'),
    tab === 'payouts' ? supabase.rpc('admin_affiliate_payouts', { p_status: null }) : Promise.resolve({ data: [], error: null }),
    tab === 'activity' || focus ? supabase.rpc('admin_affiliate_audit', { p_affiliate: focus ?? null, p_limit: 100 }) : Promise.resolve({ data: [], error: null }),
    focus ? supabase.rpc('admin_affiliate_commissions', { p_affiliate: focus }) : Promise.resolve({ data: [], error: null })
  ]);
  const all = rows(overviewRes.data);
  const pending = all.filter((a) => a.status === 'pending');
  const others = all.filter((a) => a.status !== 'pending');
  const payouts = rows(payoutsRes.data);
  const audit = rows(auditRes.data);
  const selected = focus ? all.find((a) => a.id === focus) : undefined;
  const next = nextPayoutDate();
  const setupError = overviewRes.error;

  return (
    <div className="max-w-5xl space-y-5">
      <ClearNoticeParams />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl sm:text-3xl">Affiliates (admin)</h1>
        <Link href="/dashboard/admin/subscriptions" className="btn-secondary"><ArrowLeft size={16} aria-hidden="true" /> Admin dashboard</Link>
      </div>
      <Notice error={searchParams.error} ok={searchParams.ok} />
      {setupError ? <Notice error="Affiliates are not set up in the database yet. Run the migration 20261108_affiliates.sql." /> : null}

      <section className="grid grid-cols-3 gap-3" aria-label="Summary">
        <div className="card !p-3 text-center"><p className="text-2xl font-bold text-navy">{pending.length}</p><p className="text-xs text-muted">Applications to review</p></div>
        <div className="card !p-3 text-center"><p className="text-2xl font-bold text-navy">{all.filter((a) => a.status === 'approved').length}</p><p className="text-xs text-muted">Active affiliates</p></div>
        <div className="card !p-3 text-center"><p className="text-2xl font-bold text-navy">{next.label.replace(/, \d{4}$/, '')}</p><p className="text-xs text-muted">Next pay day</p></div>
      </section>

      <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Sections">
        {TABS.map(([k, label]) => (
          <Link key={k} href={`${BASE}?tab=${k}`} aria-current={tab === k ? 'page' : undefined}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${tab === k ? 'bg-brand text-white' : 'border border-line bg-white text-navy'}`}>
            {label}{k === 'applications' && pending.length > 0 ? ` (${pending.length})` : ''}
          </Link>
        ))}
      </div>

      {tab === 'applications' ? (
        <section className="space-y-3" aria-label="Applications">
          {pending.length === 0 ? <p className="card text-sm text-muted">No applications waiting.</p> : null}
          {pending.map((a) => (
            <article key={str(a.id)} className="card space-y-3 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0"><p className="break-words text-base font-semibold text-navy">{str(a.name)}</p><p className="break-all text-muted">{str(a.email)}</p></div>
                <Badge s="pending" />
              </div>
              <dl className="grid gap-2 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-semibold uppercase text-muted">WhatsApp</dt>
                  <dd>
                  <a className="font-medium text-brand" href={`https://wa.me/${str(a.whatsapp).replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">{str(a.whatsapp)}</a>
                  </dd>
                  </div>
                <div><dt className="text-xs font-semibold uppercase text-muted">Applied</dt><dd>{day(a.created_at)}</dd></div>
                <div className="sm:col-span-2"><dt className="text-xs font-semibold uppercase text-muted">Platform</dt><dd className="break-words">{str(a.platform)}</dd></div>
                <div className="sm:col-span-2"><dt className="text-xs font-semibold uppercase text-muted">Why they want to join</dt><dd className="whitespace-pre-wrap break-words">{str(a.reason)}</dd></div>
              </dl>
              <form action={decideAction} className="space-y-2 border-t border-line pt-3">
                <input type="hidden" name="back" value={here} />
                <input type="hidden" name="affiliate_id" value={str(a.id)} />
                <label htmlFor={`note-${str(a.id)}`} className="label">Note (required to reject)</label>
                <input id={`note-${str(a.id)}`} name="note" maxLength={500} className="input" />
                <div className="grid grid-cols-2 gap-2">
                  <SubmitButton name="decision" value="approve" pendingText="Approving...">Approve</SubmitButton>
                  <SubmitButton name="decision" value="reject" variant="secondary" pendingText="Rejecting...">Reject</SubmitButton>
                </div>
              </form>
            </article>
          ))}
        </section>
      ) : null}

      {tab === 'affiliates' ? (
        <section className="space-y-3" aria-label="Affiliates">
          <div className="flex justify-end"><a href="/api/admin/affiliates/export?kind=affiliates" className="btn-secondary"><Download size={16} aria-hidden="true" /> Export affiliates (CSV)</a></div>
          {others.length === 0 ? <p className="card text-sm text-muted">No affiliates yet.</p> : null}
          {others.map((a) => {
            const totals: Totals[] = parseTotals(a.totals);
            return (
              <article key={str(a.id)} className="card space-y-3 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0"><p className="break-words text-base font-semibold text-navy">{str(a.name)}</p><p className="break-all text-muted">{str(a.email)}</p></div>
                  <Badge s={str(a.status)} />
                </div>
                {a.code ? <p className="break-all rounded-lg bg-page p-2 text-xs text-ink">{referralUrl(str(a.code), siteBase())}</p> : null}
                <dl className="grid grid-cols-3 gap-2 text-center sm:grid-cols-5">
                  {[['Clicks', a.clicks], ['Sign-ups', a.registrations], ['Paying', a.paying], ['Pro sales', a.pro_sales], ['Premium sales', a.premium_sales]].map(([label, v]) => (
                    <div key={String(label)} className="rounded-lg bg-page p-2"><dd className="text-lg font-bold text-navy">{num(v)}</dd><dt className="text-[11px] text-muted">{String(label)}</dt></div>
                  ))}
                </dl>
                <p className="text-xs text-muted">Pending {moneyText(totals, (t) => t.pendingMinor, cur)} | Approved {moneyText(totals, (t) => t.approvedMinor, cur)} | Paid {moneyText(totals, (t) => t.paidMinor, cur)}</p>
                <div className="flex flex-wrap gap-2">
                  <Link href={`${BASE}?tab=affiliates&affiliate=${str(a.id)}#detail`} className="btn-secondary">View commissions</Link>
                </div>
                {a.status === 'approved' || a.status === 'suspended' ? (
                  <form action={decideAction} className="space-y-2 border-t border-line pt-3">
                    <input type="hidden" name="back" value={here} />
                    <input type="hidden" name="affiliate_id" value={str(a.id)} />
                    <input type="hidden" name="decision" value={a.status === 'approved' ? 'suspend' : 'reactivate'} />
                    <label htmlFor={`sn-${str(a.id)}`} className="label">{a.status === 'approved' ? 'Reason to suspend' : 'Note (optional)'}</label>
                    <input id={`sn-${str(a.id)}`} name="note" maxLength={500} required={a.status === 'approved'} className="input" />
                    <SubmitButton variant={a.status === 'approved' ? 'danger' : 'primary'} pendingText="Saving..." className="w-full">{a.status === 'approved' ? 'Suspend affiliate' : 'Reactivate affiliate'}</SubmitButton>
                  </form>
                ) : null}
              </article>
            );
          })}

          {selected ? (
            <section id="detail" className="card space-y-4" aria-label="Commission details">
              <h2 className="text-lg">Commissions: {str(selected.name)}</h2>
              <p className="text-xs text-muted">Commission = rate % of net. Net = amount paid minus payment fee. Amounts are shown in the currency each payment was made in.</p>
              {rows(commissionsRes.data).length === 0 ? <p className="text-sm text-muted">No commissions yet.</p> : (
                <ul className="divide-y divide-line">
                  {rows(commissionsRes.data).map((c) => {
                    const cc = str(c.currency);
                    const sale = c.kind === 'sale';
                    return (
                      <li key={str(c.id)} className="space-y-1 py-3 text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-semibold text-navy">{sale ? `${str(c.plan) === 'premium' ? 'Premium' : 'Pro'}, month ${num(c.month_no)} at ${num(c.rate_percent)}%` : 'Adjustment'}</p>
                          <Badge s={str(c.status)} />
                        </div>
                        {sale ? (
                          <p className="text-xs text-muted">
                            Paid {formatMinorSafe(num(c.gross_minor), cc)} - fee {formatMinorSafe(num(c.fee_minor), cc)} - VAT {formatMinorSafe(num(c.vat_minor), cc)} = net {formatMinorSafe(num(c.net_minor), cc)}.{' '}
                            Commission <p className="text-xs text-muted">Commission = rate % of net. Net = amount paid minus the Paystack fee and the VAT on that fee. Amounts are shown in the currency each payment was made in.</p>
                        )
                          : <p className="text-xs text-muted">Amount <strong className="text-navy">{formatMinorSafe(num(c.commission_minor), cc)}</strong>. {str(c.reason)}</p>}
                        <p className="break-all text-xs text-muted">Ref {str(c.payment_ref)} | Paid on {day(c.payment_date)} | Eligible after {day(c.eligible_after)}</p>
                        {sale && c.status !== 'reversed' ? (
                          <details className="rounded-lg border border-line p-2">
                            <summary className="cursor-pointer text-xs font-semibold text-bad">Reverse (refund)</summary>
                            <form action={reverseAction} className="mt-2 space-y-2">
                              <input type="hidden" name="back" value={here} /><input type="hidden" name="commission_id" value={str(c.id)} />
                              <label htmlFor={`rv-${str(c.id)}`} className="label">Reason</label>
                              <input id={`rv-${str(c.id)}`} name="reason" required minLength={5} maxLength={500} className="input" />
                              <SubmitButton variant="danger" pendingText="Reversing..." className="w-full">Reverse commission</SubmitButton>
                            </form>
                          </details>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
              <form action={adjustAction} className="space-y-3 rounded-xl border border-line p-3">
                <h3 className="text-base">Manual adjustment</h3>
                <input type="hidden" name="back" value={here} /><input type="hidden" name="affiliate_id" value={str(selected.id)} />
                <div className="grid grid-cols-2 gap-3">
                  <div><label htmlFor="direction" className="label">Type</label><select id="direction" name="direction" className="input"><option value="add">Add</option><option value="subtract">Subtract</option></select></div>
                  <div><label htmlFor="currency" className="label">Currency</label><input id="currency" name="currency" defaultValue={cur} maxLength={3} required className="input uppercase" /></div>
                </div>
                <div><label htmlFor="amount" className="label">Amount</label><input id="amount" name="amount" inputMode="decimal" required className="input" /></div>
                <div><label htmlFor="areason" className="label">Reason (kept in the audit log)</label><input id="areason" name="reason" required minLength={5} maxLength={500} className="input" /></div>
                <SubmitButton pendingText="Saving..." className="w-full">Save adjustment</SubmitButton>
              </form>
              <div>
                <h3 className="text-base">Audit log</h3>
                {audit.length === 0 ? <p className="text-sm text-muted">Nothing yet.</p> : (
                  <ul className="mt-1 divide-y divide-line text-xs">{audit.slice(0, 20).map((l) => <li key={num(l.id)} className="py-2">
                    <strong className="text-navy">{str(l.action).replace(/_/g, ' ')}</strong> {str(l.reason) ? `- ${str(l.reason)}` : ''} <span className="text-muted">{day(l.created_at)}</span>
                    </li>)}</ul>
                )}
              </div>
            </section>
          ) : null}
        </section>
      ) : null}

      {tab === 'payouts' ? (
        <section className="space-y-3" aria-label="Payouts">
          <div className="card space-y-3 text-sm">
            <p>
              Pay day is the 5th of every month. Next: <strong className="text-navy">{next.label}</strong>.{' '}
              Preparing adds every unpaid commission from before this month that is at least 7 days old.
              Newer ones roll over. Nothing is sent automatically.
            </p>
            <form action={preparePayoutsAction} className="flex flex-wrap gap-2">
              <input type="hidden" name="back" value={here} />
              <SubmitButton pendingText="Preparing...">Prepare payouts</SubmitButton>
              <a href="/api/admin/affiliates/export?kind=payouts" className="btn-secondary"><Download size={16} aria-hidden="true" /> Payouts (CSV)</a>
              <a href="/api/admin/affiliates/export?kind=commissions" className="btn-secondary"><Download size={16} aria-hidden="true" /> Commissions (CSV)</a>
            </form>
          </div>
          {payouts.length === 0 ? <p className="card text-sm text-muted">No payouts yet.</p> : null}
          {payouts.map((p) => {
            const id = str(p.id);
            const s = str(p.status);
            return (
              <article key={id} className="card space-y-3 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="break-words text-base font-semibold text-navy">{str(p.name)}</p>
                    <p className="text-xs text-muted">Pay day {day(p.scheduled_for)} | {num(p.commissions)} commission{num(p.commissions) === 1 ? '' : 's'}</p>
                    </div>
                  <div className="text-right"><p className="text-lg font-bold text-navy">{formatMinorSafe(num(p.total_minor), str(p.currency))}</p><Badge s={s} /></div>
                </div>
                {s === 'paid' ? <p className="break-all text-xs text-muted">Paid on {day(p.paid_at)}. Reference: {str(p.payment_reference)}</p> : null}
                {s === 'pending' ? (
                  <form action={approvePayoutAction}>
                    <input type="hidden" name="back" value={here} />
                    <input type="hidden" name="payout_id" value={id} />
                    <SubmitButton pendingText="Approving..." className="w-full">Approve payout</SubmitButton>
                    </form>
                ) : null}
                {s === 'approved' ? (
                  <form action={recordPayoutAction} className="space-y-2 rounded-xl border border-line p-3">
                    <p className="text-xs text-muted">Pay the affiliate first. Then enter the real payment reference. It is marked Paid only after you save it.</p>
                    <input type="hidden" name="back" value={here} /><input type="hidden" name="payout_id" value={id} />
                    <div><label htmlFor={`ref-${id}`} className="label">Payment reference</label><input id={`ref-${id}`} name="reference" required minLength={3} maxLength={120} className="input" /></div>
                    <div><label htmlFor={`pd-${id}`} className="label">Date paid</label><input id={`pd-${id}`} name="paid_at" type="date" required className="input" /></div>
                    <SubmitButton pendingText="Saving..." className="w-full">Record payment</SubmitButton>
                  </form>
                ) : null}
                {s === 'pending' || s === 'approved' ? (
                  <details className="rounded-lg border border-line p-2">
                    <summary className="cursor-pointer text-xs font-semibold text-bad">Cancel this payout</summary>
                    <form action={cancelPayoutAction} className="mt-2 space-y-2">
                      <input type="hidden" name="back" value={here} /><input type="hidden" name="payout_id" value={id} />
                      <label htmlFor={`cr-${id}`} className="label">Reason</label><input id={`cr-${id}`} name="reason" required minLength={5} maxLength={500} className="input" />
                      <SubmitButton variant="danger" pendingText="Cancelling..." className={BTN2}>Cancel payout</SubmitButton>
                    </form>
                  </details>
                ) : null}
              </article>
            );
          })}
        </section>
      ) : null}

      {tab === 'activity' ? (
        <section className="card" aria-label="Activity">
          <h2 className="text-lg">Audit log</h2>
          {audit.length === 0 ? <p className="mt-2 text-sm text-muted">Nothing yet.</p> : (
            <ul className="mt-2 divide-y divide-line text-sm">
              {audit.map((l) => (
                <li key={num(l.id)} className="py-2">
                  <p><strong className="text-navy">{str(l.action).replace(/_/g, ' ')}</strong> <span className="text-xs text-muted">{day(l.created_at)}</span></p>
                  {str(l.reason) ? <p className="break-words text-xs text-muted">{str(l.reason)}</p> : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}
