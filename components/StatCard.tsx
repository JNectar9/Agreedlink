import type { LucideIcon } from 'lucide-react';

export function StatCard({ label, value, Icon, tone, hint }: { label: string; value: number | string; Icon: LucideIcon; tone: string; hint?: string }) {
  return (
    <div className="card flex min-w-0 items-center gap-3 !p-4">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon size={20} aria-hidden="true" /></span>
      <div className="min-w-0">
        <p className="text-2xl font-semibold leading-none text-navy">{value}</p>
        <p className="mt-1 text-xs leading-tight text-muted">{label}</p>
        {hint ? <p className="mt-0.5 text-[11px] leading-tight text-muted">{hint}</p> : null}
      </div>
    </div>
  );
}
