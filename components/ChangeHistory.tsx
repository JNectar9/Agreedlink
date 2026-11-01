import { CheckCircle2, Clock, Undo2, XCircle } from 'lucide-react';
import { formatDeltaMinor, formatMinorSafe } from '@/lib/money';
import { formatDateTime, formatPlainDate } from '@/lib/time';
import { describeIdentity } from '@/lib/identity';
import type { ChangeRow } from '@/lib/data';

export function changeStatusLabel(status: string): string {
  switch (status) {
    case 'pending': return 'Pending';
    case 'clarification_requested': return 'Pending (question asked)';
    case 'approved': return 'Approved';
    case 'rejected': return 'Rejected';
    case 'withdrawn': return 'Withdrawn';
    case 'superseded': return 'Replaced';
    default: return status;
  }
}

const tone: Record<string, { cls: string; Icon: typeof Clock }> = {
  pending: { cls: 'bg-warn-bg text-warn', Icon: Clock },
  clarification_requested: { cls: 'bg-warn-bg text-warn', Icon: Clock },
  approved: { cls: 'bg-ok-bg text-ok', Icon: CheckCircle2 },
  rejected: { cls: 'bg-bad-bg text-bad', Icon: XCircle },
  withdrawn: { cls: 'bg-slate-100 text-slate-700', Icon: Undo2 },
  superseded: { cls: 'bg-slate-100 text-slate-700', Icon: Undo2 }
};

/** Every proposal ever made, with its status, price change, deadline, resulting version and who decided. */
export function ChangeHistory({ changes, versionByChange, currency, timeZone }: { changes: ChangeRow[]; versionByChange: Record<string, number>; currency: string; timeZone: string }) {
  if (changes.length === 0) return null;
  return (
    <div className="mt-6">
      <h3 className="text-sm font-semibold text-navy">All change requests</h3>
      <ul className="mt-2 space-y-3">
        {changes.map((c) => {
          const t = tone[c.status] ?? tone.withdrawn;
          const identity = c.decided_at ? describeIdentity({ auth_method: c.decided_auth_method, verified_email: c.decided_verified_email, email_matches_customer: c.decided_email_matches }) : null;
          const resultVersion = versionByChange[c.id];
          return (
            <li key={c.id} className="rounded-xl border border-line p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${t.cls}`}><t.Icon size={14} aria-hidden="true" /> {changeStatusLabel(c.status)}</span>
                <span className="text-xs text-muted">Proposed {formatDateTime(c.created_at, timeZone)}</span>
              </div>
              <p className="mt-2 font-medium text-ink">{c.description}</p>
              <p className="mt-1 text-muted">
                {formatDeltaMinor(c.price_delta_minor, currency)} · new total {formatMinorSafe(c.proposed_terms.amount_minor, currency)} · deadline {formatPlainDate(c.proposed_terms.delivery_date)}
              </p>
              <p className="text-xs text-muted">Based on version {c.base_version}{resultVersion ? `, created version ${resultVersion}` : ''}</p>
              {c.decided_at ? (
                <p className="mt-1 text-xs text-muted">
                  {changeStatusLabel(c.status)} by {c.decided_by_name ?? 'the customer'} on {formatDateTime(c.decided_at, timeZone)}. {identity?.label}: {identity?.detail}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
