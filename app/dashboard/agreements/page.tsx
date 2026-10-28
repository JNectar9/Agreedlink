import Link from 'next/link';
import { FilePlus2, PlusCircle, Search } from 'lucide-react';
import { requireSession, loadAgreements } from '@/lib/data';
import { en } from '@/messages/en';
import { AgreementRow } from '@/components/AgreementRow';

export const metadata = { title: 'Agreements' };

const FILTERS = ['all', 'awaiting_approval', 'approved', 'changes_pending', 'completed', 'declined', 'expired', 'cancelled'] as const;

export default async function AgreementsPage({ searchParams }: { searchParams: { status?: string; q?: string } }) {
  const { supabase, profile } = await requireSession();
  const agreements = await loadAgreements(supabase);
  const filter = FILTERS.includes(searchParams.status as (typeof FILTERS)[number]) ? (searchParams.status as string) : 'all';
  const q = (searchParams.q ?? '').trim().toLowerCase().slice(0, 80);
  const visible = agreements.filter((a) => (filter === 'all' || a.shown === filter) && (!q || `${a.project_name} ${a.client_name}`.toLowerCase().includes(q)));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl sm:text-3xl">Agreements</h1>
        <Link href="/dashboard/agreements/new" className="btn-primary w-full sm:w-auto"><PlusCircle size={16} aria-hidden="true" /> Create agreement</Link>
      </div>

      <form role="search" className="flex gap-2">
        <input type="hidden" name="status" value={filter} />
        <label htmlFor="q" className="sr-only">Search agreements</label>
        <div className="relative min-w-0 flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input id="q" name="q" defaultValue={searchParams.q ?? ''} placeholder="Search project or client" className="input !pl-9" />
        </div>
        <button className="btn-secondary shrink-0 whitespace-nowrap">Search</button>
      </form>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none" role="navigation" aria-label="Filter by status">
        {FILTERS.map((f) => (
          <Link key={f} href={`/dashboard/agreements?status=${f}${q ? `&q=${encodeURIComponent(q)}` : ''}`} aria-current={f === filter ? 'page' : undefined}
            className={`shrink-0 whitespace-nowrap rounded-full border px-3.5 py-2 text-sm font-medium ${f === filter ? 'border-navy bg-navy text-white' : 'border-line bg-white text-navy hover:bg-brand-soft'}`}>
            {f === 'all' ? 'All' : en.status[f]}
          </Link>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="card text-center">
          <FilePlus2 className="mx-auto text-brand" size={36} aria-hidden="true" />
          <p className="mt-3 font-semibold text-navy">{agreements.length === 0 ? 'No agreements yet' : 'No agreements match this view'}</p>
          <p className="mt-1 text-sm text-muted">{agreements.length === 0 ? 'Create your first agreement and send the approval link to your customer.' : 'Try another filter or search.'}</p>
          {agreements.length === 0 ? <Link href="/dashboard/agreements/new" className="btn-primary mt-4">Create your first agreement</Link> : null}
        </div>
      ) : (
        <ul className="space-y-3">{visible.map((a) => (<li key={a.id}><AgreementRow a={a} timeZone={profile.timezone} /></li>))}</ul>
      )}
    </div>
  );
}
