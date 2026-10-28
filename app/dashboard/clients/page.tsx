import Link from 'next/link';
import { Users } from 'lucide-react';
import { requireSession, loadAgreements } from '@/lib/data';
import { formatMinorSafe } from '@/lib/money';

export const metadata = { title: 'Clients' };

export default async function ClientsPage() {
  const { supabase } = await requireSession();
  const agreements = await loadAgreements(supabase);
  // Group by client name. Totals are kept per currency because amounts are never converted.
  const map = new Map<string, { name: string; count: number; totals: Map<string, number>; latest: string }>();
  for (const a of agreements) {
    const key = a.client_name.trim().toLowerCase();
    const entry = map.get(key) ?? { name: a.client_name, count: 0, totals: new Map(), latest: a.updated_at };
    entry.count += 1;
    entry.totals.set(a.currency, (entry.totals.get(a.currency) ?? 0) + a.current_amount_minor);
    if (a.updated_at > entry.latest) entry.latest = a.updated_at;
    map.set(key, entry);
  }
  const clients = [...map.values()].sort((x, y) => y.latest.localeCompare(x.latest));
  return (
    <div className="space-y-5">
      <h1 className="text-2xl sm:text-3xl">Clients</h1>
      <p className="text-sm text-muted">Built from the client names on your agreements.</p>
      {clients.length === 0 ? (
        <div className="card text-center">
          <Users className="mx-auto text-brand" size={36} aria-hidden="true" />
          <p className="mt-3 font-semibold text-navy">No clients yet</p>
          <p className="mt-1 text-sm text-muted">Clients appear here once you create an agreement.</p>
          <Link href="/dashboard/agreements/new" className="btn-primary mt-4">Create an agreement</Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {clients.map((c) => (
            <li key={c.name}>
              <Link href={`/dashboard/agreements?q=${encodeURIComponent(c.name)}`} className="card flex min-w-0 items-center justify-between gap-3 !p-4 hover:border-brand">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-navy">{c.name}</p>
                  <p className="text-sm text-muted">{c.count} agreement{c.count === 1 ? '' : 's'}</p>
                </div>
                <p className="shrink-0 text-right text-sm text-ink">{[...c.totals].map(([cur, minor]) => formatMinorSafe(minor, cur)).join(' + ')}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
