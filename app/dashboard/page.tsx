import Link from 'next/link';
import { FilePlus2, ChevronRight } from 'lucide-react';
import { requireSession, displayStatus, OPEN_CHANGE, type AgreementRow } from '@/lib/data';
import { StatusBadge } from '@/components/StatusBadge';
import { Notice } from '@/components/Notice';
import { SubmitButton } from '@/components/SubmitButton';
import { formatMinorSafe } from '@/lib/money';
import { formatDateTime } from '@/lib/time';
import { markNotificationsReadAction } from './actions';
import { en } from '@/messages/en';

export const metadata = { title: 'Overview' };

const FILTERS = ['all', 'awaiting_approval', 'approved', 'changes_pending', 'completed', 'declined', 'expired'] as const;

export default async function DashboardPage({ searchParams }: { searchParams: { status?: string; q?: string; error?: string; ok?: string } }) {
  const { supabase, profile } = await requireSession();
  const [{ data: rows }, { data: openChanges }, { data: notes }] = await Promise.all([
    supabase.from('agreements').select('*').order('updated_at', { ascending: false }).limit(200),
    supabase.from('change_requests').select('agreement_id').in('status', OPEN_CHANGE),
    supabase.from('notifications').select('*').is('read_at', null).order('created_at', { ascending: false }).limit(10)
  ]);

  const agreements = (rows ?? []) as AgreementRow[];
  const withOpen = new Set((openChanges ?? []).map((c) => c.agreement_id as string));
  const decorated = agreements.map((a) => ({ ...a, shown: displayStatus(a.status, withOpen.has(a.id)) }));

  const filter = FILTERS.includes(searchParams.status as (typeof FILTERS)[number]) ? (searchParams.status as string) : 'all';
  const q = (searchParams.q ?? '').trim().toLowerCase().slice(0, 80);
  const visible = decorated.filter(
    (a) => (filter === 'all' || a.shown === filter) && (!q || `${a.project_name} ${a.client_name}`.toLowerCase().includes(q))
  );

  const cards = [
    { label: 'Total agreements', value: decorated.length },
    { label: 'Awaiting customer approval', value: decorated.filter((a) => a.shown === 'awaiting_approval').length },
    { label: 'Approved', value: decorated.filter((a) => a.status === 'approved').length },
    { label: 'With pending changes', value: decorated.filter((a) => a.shown === 'changes_pending').length }
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl">Welcome{profile.display_name ? `, ${profile.display_name}` : ''}</h1>
        <p className="mt-1 text-muted">Everything your customers approved, in one place.</p>
      </div>
      <Notice error={searchParams.error} ok={searchParams.ok} />

      <section aria-label="Summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="card !p-4">
            <p className="text-3xl font-semibold text-navy">{c.value}</p>
            <p className="mt-1 text-sm text-muted">{c.label}</p>
          </div>
        ))}
      </section>

      <section id="notifications" aria-label="Notifications" className="card">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg">Notifications</h2>
          {notes && notes.length > 0 ? (
            <form action={markNotificationsReadAction}><SubmitButton variant="secondary">Mark all as read</SubmitButton></form>
          ) : null}
        </div>
        {!notes || notes.length === 0 ? (
          <p className="mt-3 text-sm text-muted">You are all caught up. Customer decisions appear here.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {notes.map((n) => (
              <li key={n.id} className="py-3 text-sm">
                <Link href={n.agreement_id ? `/dashboard/agreements/${n.agreement_id}` : '/dashboard'} className="font-semibold text-navy hover:text-brand">{n.title}</Link>
                <p className="text-muted">{n.body}</p>
                <p className="text-xs text-muted">{formatDateTime(n.created_at, profile.timezone)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Agreements">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg">Agreements</h2>
          <form className="flex w-full gap-2 sm:w-auto" role="search">
            <input type="hidden" name="status" value={filter} />
            <label htmlFor="q" className="sr-only">Search agreements</label>
            <input id="q" name="q" defaultValue={searchParams.q ?? ''} placeholder="Search project or client" className="input sm:w-64" />
            <button className="btn-secondary">Search</button>
          </form>
        </div>
        <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {FILTERS.map((f) => (
            <Link key={f} href={`/dashboard?status=${f}${q ? `&q=${encodeURIComponent(q)}` : ''}`} aria-current={f === filter ? 'page' : undefined}
              className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-medium ${f === filter ? 'border-navy bg-navy text-white' : 'border-line bg-white text-navy hover:bg-brand-soft'}`}>
              {f === 'all' ? 'All' : en.status[f]}
            </Link>
          ))}
        </div>

        {visible.length === 0 ? (
          <div className="card text-center">
            <FilePlus2 className="mx-auto text-brand" size={36} aria-hidden="true" />
            <p className="mt-3 font-semibold text-navy">{decorated.length === 0 ? 'No agreements yet' : 'No agreements match this view'}</p>
            <p className="mt-1 text-sm text-muted">
              {decorated.length === 0 ? 'Create your first agreement and send the approval link to your customer.' : 'Try another filter or search.'}
            </p>
            {decorated.length === 0 ? <Link href="/dashboard/agreements/new" className="btn-primary mt-4">Create your first agreement</Link> : null}
          </div>
        ) : (
          <ul className="space-y-3">
            {visible.map((a) => (
              <li key={a.id}>
                <Link href={`/dashboard/agreements/${a.id}`} className="card flex items-center justify-between gap-3 !p-4 hover:border-brand">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-navy">{a.project_name}</p>
                    <p className="truncate text-sm text-muted">{a.client_name} · {formatMinorSafe(a.current_amount_minor, a.currency)}</p>
                    <p className="mt-1 text-xs text-muted">Updated {formatDateTime(a.updated_at, profile.timezone)}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
                    <StatusBadge status={a.shown} />
                    <ChevronRight size={18} className="text-muted" aria-hidden="true" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
