import { CheckCheck, CheckCircle2, Clock, FileText, GitCompare, Timer, XCircle } from 'lucide-react';
import { en } from '@/messages/en';
import type { DisplayStatus } from '@/lib/data';

const styles: Record<DisplayStatus, { cls: string; Icon: typeof Clock }> = {
  draft: { cls: 'bg-slate-100 text-slate-700', Icon: FileText },
  awaiting_approval: { cls: 'bg-warn-bg text-warn', Icon: Clock },
  approved: { cls: 'bg-ok-bg text-ok', Icon: CheckCircle2 },
  changes_pending: { cls: 'bg-warn-bg text-warn', Icon: GitCompare },
  declined: { cls: 'bg-bad-bg text-bad', Icon: XCircle },
  completed: { cls: 'bg-brand-soft text-navy', Icon: CheckCheck },
  expired: { cls: 'bg-slate-100 text-slate-700', Icon: Timer }
};

export function StatusBadge({ status }: { status: DisplayStatus }) {
  const { cls, Icon } = styles[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${cls}`}>
      <Icon size={14} aria-hidden="true" />
      {en.status[status]}
    </span>
  );
}
