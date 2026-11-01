import Link from 'next/link';
import { BadgeCheck, CircleAlert, FileText } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Notice } from '@/components/Notice';
import { StatusBadge } from '@/components/StatusBadge';
import { SubmitButton } from '@/components/SubmitButton';
import { formatMinorSafe } from '@/lib/money';
import { formatPlainDate } from '@/lib/time';
import type { DisplayStatus } from '@/lib/data';
import { claimRecordsAction } from './actions';

export const metadata = { title: 'My agreements' };

type Item = { id: string; project_name: string; business: string; status: string; currency: string; amount_minor: number; delivery_date: string; version: number; open_change: boolean };

export default async function PortalPage({ searchParams }: { searchParams: { error?: string; ok?: string } }) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const confirmed = Boolean(user?.email_confirmed_at);
  const { data, error } = await supabase.rpc('portal_overview');
  const items = (Array.isArray(data) ? data : []) as Item[];
  const groups = new Map<string, Item[]>();
  for (const i of items) groups.set(i.business, [...(groups.get(i.business) ?? []), i]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl sm:text-3xl">My agreements</h1>
        <p className="mt-1 text-sm text-muted">Agreements from every business that has your email, in one place.</p>
      </div>
      <Notice error={searchParams.error ?? (error ? 'The customer portal is not set up yet. Ask the AgreedLink owner to run the latest database migrations.' : undefined)} ok={searchParams.ok} />

      <section className="card" aria-label="Your account">
        <p className="text-sm text-muted">Signed in as</p>
        <p className="break-words font-semibold text-navy">{user?.email}</p>
        <p className={`mt-2 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${confirmed ? 'bg-ok-bg text-ok' : 'bg-warn-bg text-warn'}`}>
          {confirmed ? <BadgeCheck size={14} aria-hidden="true" /> : <CircleAlert size={14} aria-hidden="true" />} {confirmed ? 'Email confirmed' : 'Email not confirmed'}
        </p>
        <p className="mt-3 text-sm text-muted">Agreements appear here after a business adds your email and you link them to your account. This works only with a confirmed email, so nobody else can see your agreements.</p>
        <form action={claimRecordsAction} className="mt-3"><SubmitButton pendingText="Looking…" variant="secondary">Find agreements sent to my email</SubmitButton></form>
      </section>

      {items.length === 0 ? (
        <div className="card text-center">
          <FileText className="mx-auto text-brand" size={36} aria-hidden="true" />
          <p className="mt-3 font-semibold text-navy">No agreements linked yet</p>
          <p className="mt-1 text-sm text-muted">You can still approve any agreement through the private link a business sends you. This page just keeps them together.</p>
        </div>
      ) : (
        [...groups].map(([business, list]) => (
          <section key={business} aria-label={business} className="space-y-3">
            <h2 className="text-lg">{business}</h2>
            <ul className="space-y-3">
              {list.map((a) => (
                <li key={a.id}>
                  <Link href={`/portal/${a.id}`} className="card flex min-w-0 flex-wrap items-center justify-between gap-3 !p-4 hover:border-brand">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-navy">{a.project_name}</p>
                      <p className="text-sm text-muted">{formatMinorSafe(a.amount_minor, a.currency)} · due {formatPlainDate(a.delivery_date)} · version {a.version}</p>
                    </div>
                    <StatusBadge status={(a.status === 'approved' && a.open_change ? 'changes_pending' : a.status) as DisplayStatus} />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
