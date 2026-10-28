import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { formatMinorSafe } from '@/lib/money';
import { formatDateTime, formatPlainDate } from '@/lib/time';
import type { AgreementRow as Row, DisplayStatus } from '@/lib/data';

export function AgreementRow({ a, timeZone }: { a: Row & { shown: DisplayStatus }; timeZone: string }) {
  return (
    <Link href={`/dashboard/agreements/${a.id}`} className="card grid min-w-0 items-center gap-2 !p-4 hover:border-brand md:grid-cols-[2fr_1.2fr_1.2fr_1fr_24px] md:gap-4">
      <div className="min-w-0">
        <p className="truncate font-semibold text-navy">{a.project_name}</p>
        <p className="truncate text-sm text-muted md:hidden">{a.client_name} · {formatMinorSafe(a.current_amount_minor, a.currency)}</p>
        <p className="text-xs text-muted">Updated {formatDateTime(a.updated_at, timeZone)}</p>
      </div>
      <p className="hidden truncate text-sm text-ink md:block">{a.client_name}</p>
      <p className="hidden text-sm text-ink md:block">{formatMinorSafe(a.current_amount_minor, a.currency)}<span className="block text-xs text-muted">Due {formatPlainDate(a.current_delivery_date)}</span></p>
      <div><StatusBadge status={a.shown} /></div>
      <ChevronRight size={18} className="hidden text-muted md:block" aria-hidden="true" />
    </Link>
  );
}
