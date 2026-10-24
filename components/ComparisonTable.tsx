import { ArrowRightLeft } from 'lucide-react';
import type { TermRow } from '@/lib/terms';

export function ComparisonTable({ rows, difference }: { rows: TermRow[]; difference: string }) {
  return (
    <div>
      <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-navy">
        <ArrowRightLeft size={16} aria-hidden="true" /> Price difference: {difference}
      </p>
      <div className="overflow-hidden rounded-xl border border-line">
        <div className="hidden grid-cols-[160px_1fr_1fr] gap-4 bg-page px-4 py-2 text-xs font-semibold text-muted sm:grid">
          <span>Term</span><span>Current approved</span><span>Proposed</span>
        </div>
        {rows.map((r) => (
          <div key={r.key} className={`grid gap-1 border-t border-line px-4 py-3 text-sm first:border-t-0 sm:grid-cols-[160px_1fr_1fr] sm:gap-4 ${r.changed ? 'bg-warn-bg/60' : 'bg-white'}`}>
            <span className="font-medium text-navy">
              {r.label} {r.changed ? <span className="ml-1 rounded bg-warn px-1.5 py-0.5 text-[11px] font-semibold text-white">Changed</span> : null}
            </span>
            <span className="whitespace-pre-wrap"><span className="text-xs text-muted sm:hidden">Current: </span>{r.before}</span>
            <span className="whitespace-pre-wrap font-medium"><span className="text-xs font-normal text-muted sm:hidden">Proposed: </span>{r.after}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
