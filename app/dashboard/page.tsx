import Link from 'next/link';
import { CheckCircle2, ChevronRight, Clock, FilePlus2, FileText, GitCompare, LifeBuoy, PlusCircle, Settings as SettingsIcon, ShieldCheck } from 'lucide-react';
import { requireSession, displayStatus, OPEN_CHANGE, type AgreementRow } from '@/lib/data';
import { StatusBadge } from '@/components/StatusBadge';
import { Notice } from '@/components/Notice';
import { SubmitButton } from '@/components/SubmitButton';
import { formatMinorSafe } from '@/lib/money';
import { formatDateTime, formatPlainDate, greeting } from '@/lib/time';
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
    { label: 'Total agreements', value: decorated.length, Icon: FileText, tone: 'bg-brand-soft text-brand' },
    { label: 'Awaiting approval', value: decorated.filter((a) => a.shown === 'awaiting_approval').length, Icon: Clock, tone: 'bg-warn-bg text-warn' },
    { label: 'Approved', value: decorated.filter((a) => a.status === 'approved').length, Icon: CheckCircle2, tone: 'bg-ok-bg text-ok' },
    { label: 'Changes pending', value: decorated.filter((a) => a.shown === 'changes_pending').length, Icon: GitCompare, tone: 'bg-brand-soft text-navy' }
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl">{greeting(profile.timezone)}{profile.display_name ? `, ${profile.display_name.split(' ')[0]}` : ''}</h1>
        <p className="mt-1 text-muted">Manage your agreements and keep track of every decision.</p>
      </div>
      <Notice error={searchParams.error} ok={searchParams.ok} />

      <section aria-label="Summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map(({ label, value, Icon, tone }) => (
          <div key={label} className="card flex items-center gap-3 !p-4">
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon size={20} aria-hidden="true" /></span>
            <div className="min-w-0">
              <p className="text-2xl font-semibold leading-none text-navy">{value}</p>
              <p className="mt-1 text-xs text-muted">{label}</p>
            </div>
          </div>
        ))}
      </section>

      <section aria-label="Quick actions" className="grid gap-3 md:grid-cols-[1fr_1fr]">
        <div className="card">
          <h2 className="text-lg">Quick actions</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/dashboard/agreements/new" className="flex min-h-[44px] items-center gap-3 rounded-xl p-2 hover:bg-brand-soft"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-soft text-brand"><PlusCircle size={18} aria-hidden="true" /></span><span><span className="block font-semibold text-navy">Create new agreement</span><span className="text-xs text-muted">Start a new agreement and get a customer link</span></span></Link></li>
            <li><Link href="/dashboard/settings" className="flex min-h-[44px] items-center gap-3 rounded-xl p-2 hover:bg-brand-soft"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-soft text-brand"><SettingsIcon size={18} aria-hidden="true" /></span><span><span className="block font-semibold text-navy">Business profile</span><span className="text-xs text-muted">Add contact details your customers will see</span></span></Link></li>
            <li><Link href="/contact" className="flex min-h-[44px] items-center gap-3 rounded-xl p-2 hover:bg-brand-soft"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-soft text-brand"><LifeBuoy size={18} aria-hidden="true" /></span><span><span className="block font-semibold text-navy">Help and support</span><span className="text-xs text-muted">Contact JNectar by email or WhatsApp</span></span></Link></li>
          </ul>
        </div>
        <div className="card bg-brand-soft">
          <ShieldCheck className="text-brand" size={28} aria-hidden="true" />
          <h2 className="mt-2 text-lg">Private by design</h2>
          <p className="mt-1 text-sm text-muted">Only you can see your agreements. Customers see only the agreement that was shared with them, through a private link you can revoke at any time.</p>
        </div>
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
                <Link href={`/dashboard/agreements/${a.id}`} className="card grid items-center gap-2 !p-4 hover:border-brand md:grid-cols-[2fr_1.2fr_1.2fr_1fr_24px] md:gap-4">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-navy">{a.project_name}</p>
                    <p className="truncate text-sm text-muted md:hidden">{a.client_name} · {formatMinorSafe(a.current_amount_minor, a.currency)}</p>
                    <p className="text-xs text-muted">Updated {formatDateTime(a.updated_at, profile.timezone)}</p>
                  </div>
                  <p className="hidden truncate text-sm text-ink md:block">{a.client_name}</p>
                  <p className="hidden text-sm text-ink md:block">{formatMinorSafe(a.current_amount_minor, a.currency)}<span className="block text-xs text-muted">Due {formatPlainDate(a.current_delivery_date)}</span></p>
                  <div><StatusBadge status={a.shown} /></div>
                  <ChevronRight size={18} className="hidden text-muted md:block" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
