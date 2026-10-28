import Link from 'next/link';
import { Bell, CheckCheck, CheckCircle2, Clock, CreditCard, FilePlus2, FileText, LayoutTemplate, LifeBuoy, PlusCircle, Sparkles, Users } from 'lucide-react';
import { requireSession, loadAgreements, ACTIVE_STATUSES } from '@/lib/data';
import { PLAN_CONFIG, isPlanId } from '@/lib/plans';
import { isOwnerEmail } from '@/lib/admin';
import { platformStats } from '@/lib/platform';
import { bucketByDay } from '@/lib/stats';
import { formatDateTime, greeting } from '@/lib/time';
import { en } from '@/messages/en';
import { Notice } from '@/components/Notice';
import { StatCard } from '@/components/StatCard';
import { ActivityChart } from '@/components/ActivityChart';
import { AgreementRow } from '@/components/AgreementRow';
import { SubmitButton } from '@/components/SubmitButton';
import { markNotificationsReadAction } from './actions';

export const metadata = { title: 'Dashboard' };

type EventRow = { id: number; agreement_id: string; event_type: string; actor_name: string | null; created_at: string };

export default async function DashboardPage({ searchParams }: { searchParams: { error?: string; ok?: string } }) {
  const { supabase, user, profile } = await requireSession();
  const [agreements, { data: notes }, { data: eventRows }, planRes] = await Promise.all([
    loadAgreements(supabase),
    supabase.from('notifications').select('*').is('read_at', null).order('created_at', { ascending: false }).limit(5),
    supabase.from('agreement_events').select('id, agreement_id, event_type, actor_name, created_at').order('id', { ascending: false }).limit(6),
    supabase.rpc('my_plan')
  ]);
  const plan = PLAN_CONFIG[isPlanId(planRes.data) ? planRes.data : 'free'];
  const events = (eventRows ?? []) as EventRow[];
  const names = new Map(agreements.map((a) => [a.id, a.project_name]));
  const owner = isOwnerEmail(user.email) ? await platformStats() : null;

  const total = agreements.length;
  const active = agreements.filter((a) => ACTIVE_STATUSES.includes(a.status)).length;
  const completed = agreements.filter((a) => a.status === 'completed').length;
  const pending = agreements.filter((a) => a.shown === 'awaiting_approval' || a.shown === 'changes_pending').length;
  const week = bucketByDay(agreements.map((a) => a.created_at), 7, new Date(), profile.timezone);
  const first = profile.display_name ? profile.display_name.split(' ')[0] : '';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl">{greeting(profile.timezone)}{first ? `, ${first}` : ''}</h1>
          <p className="mt-1 text-muted">Here is what is happening with your agreements.</p>
        </div>
        <Link href="/dashboard/agreements/new" className="btn-primary w-full sm:w-auto md:hidden"><PlusCircle size={16} aria-hidden="true" /> Create agreement</Link>
      </div>
      <Notice error={searchParams.error} ok={searchParams.ok} />

      <section aria-label="Summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total agreements" value={total} Icon={FileText} tone="bg-brand-soft text-brand" />
        <StatCard label="Active agreements" value={active} hint={`of ${plan.activeAgreements} on your plan`} Icon={CheckCircle2} tone="bg-ok-bg text-ok" />
        <StatCard label="Completed" value={completed} Icon={CheckCheck} tone="bg-brand-soft text-navy" />
        <StatCard label="Pending" value={pending} Icon={Clock} tone="bg-warn-bg text-warn" />
      </section>

      {owner ? (
        <section aria-label="Platform statistics" className="space-y-3 rounded-2xl border border-dashed border-brand/40 bg-brand-soft/60 p-4">
          <p className="text-sm font-semibold text-navy">Platform statistics <span className="font-normal text-muted">(real counts, visible only to you)</span></p>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <StatCard label="Total users" value={owner.users} Icon={Users} tone="bg-white text-brand" />
            <StatCard label="Paid subscribers" value={owner.subscribers} Icon={CreditCard} tone="bg-white text-ok" hint="Billing is not connected yet" />
            <div className="col-span-2 lg:col-span-1"><StatCard label="Agreements created (all users)" value={owner.agreements} Icon={FileText} tone="bg-white text-navy" /></div>
          </div>
          <div className="card !p-4">
            <h2 className="text-sm">User growth, last 30 days</h2>
            <ActivityChart data={bucketByDay(owner.signups, 30, new Date(), profile.timezone)} label="New users per day, last 30 days" emptyText="No new users in the last 30 days" />
          </div>
        </section>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-4">
          <section className="card" aria-label="Agreement activity">
            <h2 className="text-lg">Agreements created, last 7 days</h2>
            <div className="mt-3"><ActivityChart data={week} label="Agreements created per day, last 7 days" emptyText="No agreements created in the last 7 days" /></div>
          </section>

          <section aria-label="Recent agreements">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-lg">Recent agreements</h2>
              <Link href="/dashboard/agreements" className="text-sm font-semibold text-brand">View all</Link>
            </div>
            {agreements.length === 0 ? (
              <div className="card text-center">
                <FilePlus2 className="mx-auto text-brand" size={36} aria-hidden="true" />
                <p className="mt-3 font-semibold text-navy">No agreements yet</p>
                <p className="mt-1 text-sm text-muted">Create your first agreement and send the approval link to your customer.</p>
                <Link href="/dashboard/agreements/new" className="btn-primary mt-4">Create your first agreement</Link>
              </div>
            ) : (
              <ul className="space-y-3">{agreements.slice(0, 5).map((a) => (<li key={a.id}><AgreementRow a={a} timeZone={profile.timezone} /></li>))}</ul>
            )}
          </section>
        </div>

        <div className="min-w-0 space-y-4">
          <section className="card" aria-label="Quick actions">
            <h2 className="text-lg">Quick actions</h2>
            <ul className="mt-3 space-y-1 text-sm">
              {[
                { href: '/dashboard/agreements/new', title: 'Create new agreement', sub: 'Start a new agreement', Icon: PlusCircle, primary: true },
                { href: '/dashboard/templates', title: 'Use a template', sub: 'Start from ready-made text', Icon: LayoutTemplate },
                { href: '/dashboard/clients', title: 'View clients', sub: 'See agreements by client', Icon: Users },
                { href: '/contact', title: 'Help and support', sub: 'Email or WhatsApp JNectar', Icon: LifeBuoy }
              ].map(({ href, title, sub, Icon, primary }) => (
                <li key={href}>
                  <Link href={href} className={`flex min-h-[48px] items-center gap-3 rounded-xl p-2 ${primary ? 'bg-brand text-white hover:bg-brand-hover' : 'hover:bg-brand-soft'}`}>
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${primary ? 'bg-white/20' : 'bg-brand-soft text-brand'}`}><Icon size={18} aria-hidden="true" /></span>
                    <span className="min-w-0"><span className={`block truncate font-semibold ${primary ? '' : 'text-navy'}`}>{title}</span><span className={`block truncate text-xs ${primary ? 'text-blue-100' : 'text-muted'}`}>{sub}</span></span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="card" aria-label="Subscription plan">
            <h2 className="text-lg">Subscription plan</h2>
            <div className="mt-3 flex items-center justify-between gap-2">
              <p className="font-semibold text-navy">{plan.name} plan</p>
              <span className="rounded-full bg-ok-bg px-2.5 py-1 text-xs font-semibold text-ok">Active</span>
            </div>
            <Link href="/dashboard/billing" className="btn-secondary mt-3 w-full">Manage billing</Link>
          </section>

          <section className="rounded-2xl bg-brand p-5 text-white shadow-[0_8px_30px_rgba(23,105,255,0.3)]" aria-label="Upgrade">
            <Sparkles size={26} aria-hidden="true" />
            <h2 className="mt-2 text-lg !text-white">Need more room?</h2>
            <p className="mt-1 text-sm text-blue-100">Pro allows 50 active agreements and Premium 200. Online payment is not available yet, and nobody is charged today.</p>
            <Link href="/pricing" className="btn mt-3 w-full bg-white text-navy hover:bg-brand-soft">View plans</Link>
          </section>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="card min-w-0" aria-label="Recent activity">
          <h2 className="text-lg">Recent activity</h2>
          {events.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Activity appears here as you create agreements and customers respond.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {events.map((e) => (
                <li key={e.id} className="py-2.5 text-sm">
                  <Link href={`/dashboard/agreements/${e.agreement_id}`} className="font-semibold text-navy hover:text-brand">{en.events[e.event_type] ?? e.event_type}</Link>
                  <p className="truncate text-muted">{names.get(e.agreement_id) ?? 'Agreement'}</p>
                  <p className="text-xs text-muted">{formatDateTime(e.created_at, profile.timezone)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section id="notifications" className="card min-w-0" aria-label="Notifications">
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg"><Bell size={18} aria-hidden="true" /> Notifications</h2>
            <Link href="/dashboard/notifications" className="text-sm font-semibold text-brand">View all</Link>
          </div>
          {!notes || notes.length === 0 ? (
            <p className="mt-3 text-sm text-muted">You are all caught up. Customer decisions appear here.</p>
          ) : (
            <>
              <ul className="mt-3 divide-y divide-line">
                {notes.map((n) => (
                  <li key={n.id} className="py-2.5 text-sm">
                    <Link href={n.agreement_id ? `/dashboard/agreements/${n.agreement_id}` : '/dashboard'} className="font-semibold text-navy hover:text-brand">{n.title}</Link>
                    <p className="text-muted">{n.body}</p>
                    <p className="text-xs text-muted">{formatDateTime(n.created_at, profile.timezone)}</p>
                  </li>
                ))}
              </ul>
              <form action={markNotificationsReadAction} className="mt-3"><SubmitButton variant="secondary">Mark all as read</SubmitButton></form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
