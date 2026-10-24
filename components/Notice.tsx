import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';

export function Notice({ error, ok, info }: { error?: string; ok?: string; info?: string }) {
  if (error) {
    return (
      <p role="alert" className="mb-4 flex items-start gap-2 rounded-lg border border-bad/30 bg-bad-bg p-3 text-sm text-bad">
        <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden="true" /> <span>{error}</span>
      </p>
    );
  }
  if (ok) {
    return (
      <p role="status" className="mb-4 flex items-start gap-2 rounded-lg border border-ok/30 bg-ok-bg p-3 text-sm text-ok">
        <CheckCircle2 size={18} className="mt-0.5 shrink-0" aria-hidden="true" /> <span>{ok}</span>
      </p>
    );
  }
  if (info) {
    return (
      <p role="status" className="mb-4 flex items-start gap-2 rounded-lg border border-brand/30 bg-brand-soft p-3 text-sm text-navy">
        <Info size={18} className="mt-0.5 shrink-0" aria-hidden="true" /> <span>{info}</span>
      </p>
    );
  }
  return null;
}
