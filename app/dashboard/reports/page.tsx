import Link from 'next/link';
import { CalendarClock, Hourglass, Layers, ShieldAlert } from 'lucide-react';
import { requireSession } from '@/lib/data';
import { en } from '@/messages/en';
import { formatDateTime, formatPlainDate } from '@/lib/time';
import { formatMinorSafe } from '@/lib/money';
import { Notice } from '@/components/Notice';
import {
  barPercent, formatHours, monthName, parseReport, parseReportRange, prettyEvent, reportErrorCopy, signedMoney
} from '@/lib/reports';

export const metadata = { title: 'Reports' };
export const dynamic = 'force-dynamic';

const STATUS_BAR: Record<string, string> = {
  draft: 'bg-slate-400', awaiting_approval: 'bg-warn', approved: 'bg-ok', completed: 'bg-brand', declined: 'bg-bad', expired: 'bg-slate-400', cancelled: 'bg-slate-400'
};

function statusLabel(key: string): string {
  const known = (en.status as Record<string, string>)[key];
  return known ?? prettyEvent(key);
}

export default async function ReportsPage({ searchParams }: { searchParams: { range?: string } }) {
  const { supabase, profile } = await requireSession();
  const range = parseReportRange(searchParams.range);
  const subRes = await supabase.rpc('my_subscription');
  const plan = (subRes.data as { effective_plan?: string } | null)?.effective_plan ?? 'free';
  const premium = plan === 'premium';
  const reportRes = premium ? await supabase.rpc('report_overview', { p_months: range }) : null;
  const report = reportRes ? parseReport(reportRes.data) : null;
  const tz = profile.timezone;

  if (!premium) {
    return (
      <div className="max-w-3xl space-y-4">
        <h1 className="text-2xl sm:text-3xl">Reports</h1>
        <section className="card space-y-3">
          <h2 className="text-lg">Advanced reporting is part of Premium</h2>
          <p className="text-sm text-muted">
            Premium shows how your agreements are going: status breakdown, agreed value by currency,
            how fast customers approve, change requests, upcoming deadlines and recent activity
            across all your agreements. It uses your real agreements only.
          </p>
          <p className="text-sm text-muted">You are on the {plan === 'pro' ? 'Pro' : 'Free'} plan. Each agreement still has its own full history on its page.</p>
          <Link href="/dashboard/billing" className="btn-primary w-full sm:w-auto">See plans on Billing</Link>
        </section>
      </div>
    );
  }

  const maxStatus = report ? Math.max(0, ...Object.values(report.byStatus)) : 0;
  const maxMonth = report ? Math.max(0, ...report.monthly.flatMap((m) => [m.created, m.approved])) : 0;
  const changeTotal = report ? Object.values(report.changesByStatus).reduce((a: number, b: number) => a + b, 0) : 0;

  return (
    <div className="max-w-5xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl">Reports</h1>
          {report?.generatedAt ? <p className="text-xs text-muted">Live from your agreements. Updated {formatDateTime(report.generatedAt, tz)}.</p> : null}
        </div>
        <div className="flex gap-1 text-sm" role="group" aria-label="Report range">
          {([6, 12] as const).map((m) => (
            <Link key={m} href={m === 6 ? '/dashboard/reports' : `/dashboard/reports?range=${m}`} aria-current={m === range ? 'true' : undefined}
              className={`rounded-full px-3 py-1.5 font-medium ${m === range ? 'bg-brand text-white' : 'border border-line bg-white text-navy'}`}>Last {m} months</Link>
          ))}
        </div>
      </div>

      {reportRes?.error ? <Notice error={reportErrorCopy(reportRes.error)} /> : null}

      {report ? (
        <>
          {report.agreementsTotal === 0 ? <p className="card text-sm text-muted">You have no agreements yet, so there is nothing to report. Create an agreement and these figures will fill in.</p> : null}

          <section aria-label="Key figures" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="card"><p className="flex items-center gap-2 text-sm text-muted"><Layers size={16} aria-hidden="true" /> All agreements</p><p className="mt-1 text-3xl font-bold text-navy">{report.agreementsTotal}</p></div>
            <div className="card">
              <p className="flex items-center gap-2 text-sm text-muted"><Hourglass size={16} aria-hidden="true" /> Average time to approval</p>
              <p className="mt-1 text-2xl font-bold text-navy">{formatHours(report.avgApprovalHours)}</p>
              <p className="text-xs text-muted">
                From creating an agreement to the first approval, across {report.approvalsCount} approved.
              </p>
            </div>
            <div className="card">
              <p className="flex items-center gap-2 text-sm text-muted"><ShieldAlert size={16} aria-hidden="true" /> Past delivery date</p>
              <p className={`mt-1 text-3xl font-bold ${report.overdue > 0 ? 'text-bad' : 'text-navy'}`}>{report.overdue}</p>
              <p className="text-xs text-muted">Approved agreements whose delivery date has passed.</p>
            </div>
            <div className="card"><p className="flex items-center gap-2 text-sm text-muted"><CalendarClock size={16} aria-hidden="true" /> Due in the next 14 days</p><p className="mt-1 text-3xl font-bold text-navy">{report.upcoming.length}</p></div>
          </section>

          <section className="card" aria-label="Agreed value">
            <h2 className="text-lg">Value by currency</h2>
            <p className="text-xs text-muted">Currencies are never added together. Agreed means approved or completed. Pipeline means draft or awaiting approval.</p>
            {report.value.length === 0 ? <p className="mt-3 text-sm text-muted">No agreements yet.</p> : (
              <ul className="mt-3 divide-y divide-line">
                {report.value.map((v) => (
                  <li key={v.currency} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                    <span className="font-semibold text-navy">{v.currency}</span>
                    <span>Agreed <strong className="text-navy">{formatMinorSafe(v.agreedMinor, v.currency)}</strong></span>
                    <span className="text-muted">Pipeline {formatMinorSafe(v.pipelineMinor, v.currency)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="card" aria-label="Agreements by status">
              <h2 className="text-lg">Agreements by status</h2>
              {Object.keys(report.byStatus).length === 0 ? <p className="mt-3 text-sm text-muted">No agreements yet.</p> : (
                <ul className="mt-3 space-y-3">
                  {Object.entries(report.byStatus).sort((a, b) => b[1] - a[1]).map(([key, n]) => (
                    <li key={key} className="text-sm">
                      <div className="flex justify-between"><span>{statusLabel(key)}</span><strong className="text-navy">{n}</strong></div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-line"><div className={`h-full rounded-full ${STATUS_BAR[key] ?? 'bg-brand'}`} style={{ width: `${barPercent(n, maxStatus)}%` }} /></div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="card" aria-label="Created and approved by month">
              <h2 className="text-lg">Created and approved by month</h2>
              <div className="mt-1 flex gap-4 text-xs text-muted">
                <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-brand" /> Created</span>
                <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-ok" /> Approved</span>
              </div>
              <div className="mt-4 flex h-40 items-end gap-1" role="img" aria-label={`Agreements created and approved in each of the last ${range} months`}>
                {report.monthly.map((m) => (
                  <div key={m.month} className="flex h-full min-w-0 flex-1 flex-col justify-end">
                    <div className="flex flex-1 items-end justify-center gap-0.5">
                      <div className="w-1/2 rounded-t bg-brand" style={{ height: `${barPercent(m.created, maxMonth)}%` }} title={`${monthName(m.month)}: ${m.created} created`} />
                      <div className="w-1/2 rounded-t bg-ok" style={{ height: `${barPercent(m.approved, maxMonth)}%` }} title={`${monthName(m.month)}: ${m.approved} approved`} />
                    </div>
                    <p className="mt-1 truncate text-center text-[10px] text-muted">{monthName(m.month)}</p>
                  </div>
                ))}
              </div>
              <ul className="sr-only">{report.monthly.map((m) => <li key={m.month}>{monthName(m.month)}: {m.created} created, {m.approved} approved</li>)}</ul>
            </section>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="card" aria-label="Change requests">
              <h2 className="text-lg">Change requests</h2>
              {changeTotal === 0 ? <p className="mt-3 text-sm text-muted">No change requests yet.</p> : (
                <>
                  <ul className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    {Object.entries(report.changesByStatus).map(([key, n]) => <li key={key} className="rounded-lg bg-page p-2"><span className="text-muted">{prettyEvent(key)}</span> <strong className="float-right text-navy">{n}</strong></li>)}
                  </ul>
                  {report.changeValue.length > 0 ? (
                    <div className="mt-3 border-t border-line pt-3 text-sm">
                      <p className="font-medium text-navy">Price change from approved requests</p>
                      <ul className="mt-1 text-muted">{report.changeValue.map((c) => <li key={c.currency}>{c.currency}: {signedMoney(c.deltaMinor, c.currency)}</li>)}</ul>
                    </div>
                  ) : null}
                </>
              )}
            </section>

            <section className="card" aria-label="Upcoming deadlines">
              <h2 className="text-lg">Upcoming deadlines</h2>
              {report.upcoming.length === 0 ? <p className="mt-3 text-sm text-muted">No approved agreements are due in the next 14 days.</p> : (
                <ul className="mt-2 divide-y divide-line">
                  {report.upcoming.map((u) => (
                    <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                      <Link href={`/dashboard/agreements/${u.id}`} className="min-w-0 font-semibold text-brand"><span className="break-words">{u.projectName}</span></Link>
                      <span className="text-muted">{u.clientName}, due {formatPlainDate(u.deliveryDate)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <section className="card" aria-label="Recent activity">
            <h2 className="text-lg">Recent activity across all agreements</h2>
            {report.activity.length === 0 ? <p className="mt-3 text-sm text-muted">No activity yet.</p> : (
              <ul className="mt-2 divide-y divide-line">
                {report.activity.map((e, i) => (
                  <li key={`${e.agreementId}-${e.createdAt}-${i}`} className="space-y-0.5 py-3 text-sm">
                    <p><Link href={`/dashboard/agreements/${e.agreementId}`} className="font-semibold text-brand">{e.projectName}</Link> <span className="text-muted">- {prettyEvent(e.eventType)}{e.actorName ? ` by ${e.actorName}` : ''}</span></p>
                    {e.message ? <p className="break-words text-muted">{e.message}</p> : null}
                    <p className="text-xs text-muted">{formatDateTime(e.createdAt, tz)}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
