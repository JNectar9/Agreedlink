import Link from 'next/link';
import { BadgeCheck, CircleAlert, Search, Users } from 'lucide-react';
import { requireSession, loadAgreements } from '@/lib/data';
import { formatMinorSafe } from '@/lib/money';
import { customerVerification, safeSearchTerm } from '@/lib/customers';
import { Notice } from '@/components/Notice';
import { SubmitButton } from '@/components/SubmitButton';
import { importClientsAction } from '../actions';

export const metadata = { title: 'Clients' };

type Customer = { id: string; name: string; email: string | null; phone: string; claimed_by: string | null; email_verified_at: string | null; updated_at: string };

export default async function ClientsPage({ searchParams }: { searchParams: { q?: string; error?: string; ok?: string } }) {
  const { supabase } = await requireSession();
  const q = safeSearchTerm(searchParams.q);
  let query = supabase.from('customers').select('id, name, email, phone, claimed_by, email_verified_at, updated_at').order('updated_at', { ascending: false }).limit(200);
  if (q) query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`);
  const [{ data, error: loadError }, agreements] = await Promise.all([query, loadAgreements(supabase)]);
  const customers = (data ?? []) as Customer[];
  const unlinked = agreements.filter((a) => !a.customer_id).length;
  const stats = new Map<string, { count: number; totals: Map<string, number> }>();
  for (const a of agreements) {
    if (!a.customer_id) continue;
    const s = stats.get(a.customer_id) ?? { count: 0, totals: new Map() };
    s.count += 1;
    s.totals.set(a.currency, (s.totals.get(a.currency) ?? 0) + a.current_amount_minor);
    stats.set(a.customer_id, s);
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl sm:text-3xl">Clients</h1>
        <p className="mt-1 text-sm text-muted">Your customers and every agreement linked to them. Totals stay in each agreement&apos;s own currency.</p>
      </div>
      <Notice error={searchParams.error ?? (loadError ? 'Clients could not be loaded. Run the latest database migrations (0006 and 0007).' : undefined)} ok={searchParams.ok} />

      <form role="search" className="flex gap-2">
        <label htmlFor="q" className="sr-only">Search clients</label>
        <div className="relative min-w-0 flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input id="q" name="q" defaultValue={searchParams.q ?? ''} placeholder="Search name, email or phone" className="input !pl-9" />
        </div>
        <button className="btn-secondary shrink-0 whitespace-nowrap">Search</button>
      </form>

      {unlinked > 0 ? (
        <div className="card flex flex-wrap items-center justify-between gap-3 !p-4">
          <p className="min-w-0 text-sm text-ink">{unlinked} older agreement{unlinked === 1 ? ' is' : 's are'} not linked to a client record yet.</p>
          <form action={importClientsAction}><SubmitButton variant="secondary" pendingText="Linking…">Link existing agreements</SubmitButton></form>
        </div>
      ) : null}

      {customers.length === 0 ? (
        <div className="card text-center">
          <Users className="mx-auto text-brand" size={36} aria-hidden="true" />
          <p className="mt-3 font-semibold text-navy">{q ? 'No clients match your search' : 'No clients yet'}</p>
          <p className="mt-1 text-sm text-muted">{q ? 'Try a different name, email or phone number.' : 'Clients are added automatically when you create an agreement.'}</p>
          {!q ? <Link href="/dashboard/agreements/new" className="btn-primary mt-4">Create an agreement</Link> : null}
        </div>
      ) : (
        <ul className="space-y-3">
          {customers.map((c) => {
            const v = customerVerification(c);
            const s = stats.get(c.id);
            return (
              <li key={c.id}>
                <Link href={`/dashboard/clients/${c.id}`} className="card flex min-w-0 flex-wrap items-center justify-between gap-3 !p-4 hover:border-brand">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-navy">{c.name}</p>
                    <p className="truncate text-sm text-muted">{c.email ?? 'No email'}{c.phone ? ` · ${c.phone}` : ''}</p>
                    <p className="mt-1 text-xs text-muted">{s?.count ?? 0} agreement{(s?.count ?? 0) === 1 ? '' : 's'}{s ? ` · ${[...s.totals].map(([cur, m]) => formatMinorSafe(m, cur)).join(' + ')}` : ''}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${v.verified ? 'bg-ok-bg text-ok' : 'bg-slate-100 text-slate-700'}`}>
                    {v.verified ? <BadgeCheck size={14} aria-hidden="true" /> : <CircleAlert size={14} aria-hidden="true" />} {v.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
