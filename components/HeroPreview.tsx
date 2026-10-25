import { Bell, CheckCircle2, Clock, FileText, GitCompare, LayoutDashboard, Settings } from 'lucide-react';
import { LogoMark } from './Logo';

const stats = [
  { label: 'Total', value: '5', Icon: FileText, tone: 'bg-brand-soft text-brand' },
  { label: 'Awaiting', value: '2', Icon: Clock, tone: 'bg-warn-bg text-warn' },
  { label: 'Approved', value: '2', Icon: CheckCircle2, tone: 'bg-ok-bg text-ok' },
  { label: 'Changes', value: '1', Icon: GitCompare, tone: 'bg-brand-soft text-navy' }
];

const rows = [
  { title: 'Website design project', client: 'Sample client A', status: 'Approved', tone: 'bg-ok-bg text-ok' },
  { title: 'Logo and brand kit', client: 'Sample client B', status: 'Awaiting approval', tone: 'bg-warn-bg text-warn' },
  { title: 'Product photography', client: 'Sample client C', status: 'Changes pending', tone: 'bg-warn-bg text-warn' }
];

/** Decorative preview built from sample data. Hidden from screen readers; labelled on screen. */
export function HeroPreview() {
  return (
    <div className="relative mx-auto w-full max-w-xl pb-8" aria-hidden="true">
      <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-[0_24px_60px_rgba(7,26,61,0.28)]">
        <div className="grid grid-cols-[96px_1fr] sm:grid-cols-[120px_1fr]">
          <div className="bg-navy p-3 text-white">
            <div className="flex items-center gap-1.5 text-[11px] font-bold"><LogoMark size={18} /> AgreedLink</div>
            <ul className="mt-4 space-y-1.5 text-[11px] text-blue-100">
              <li className="flex items-center gap-1.5 rounded-md bg-brand px-2 py-1.5 text-white"><LayoutDashboard size={12} /> Dashboard</li>
              <li className="flex items-center gap-1.5 px-2 py-1.5"><FileText size={12} /> Agreements</li>
              <li className="flex items-center gap-1.5 px-2 py-1.5"><Bell size={12} /> Alerts</li>
              <li className="flex items-center gap-1.5 px-2 py-1.5"><Settings size={12} /> Settings</li>
            </ul>
          </div>
          <div className="p-3 sm:p-4">
            <p className="text-sm font-semibold text-navy">Good morning</p>
            <p className="text-[11px] text-muted">Sample data</p>
            <div className="mt-3 grid grid-cols-4 gap-1.5">
              {stats.map(({ label, value, Icon, tone }) => (
                <div key={label} className="rounded-lg border border-line p-1.5 text-center">
                  <span className={`mx-auto flex h-6 w-6 items-center justify-center rounded-md ${tone}`}><Icon size={13} /></span>
                  <p className="mt-1 text-sm font-semibold text-navy">{value}</p>
                  <p className="text-[9px] text-muted">{label}</p>
                </div>
              ))}
            </div>
            <ul className="mt-3 space-y-1.5">
              {rows.map((r) => (
                <li key={r.title} className="flex items-center justify-between gap-2 rounded-lg border border-line px-2 py-1.5">
                  <span className="min-w-0">
                    <span className="block truncate text-[11px] font-semibold text-navy">{r.title}</span>
                    <span className="block truncate text-[9px] text-muted">{r.client}</span>
                  </span>
                  <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${r.tone}`}>{r.status}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <div className="absolute -bottom-2 -left-2 hidden w-32 rounded-[1.5rem] border-4 border-navy bg-navy p-3 text-center text-white shadow-xl sm:block">
        <div className="mx-auto mb-2 flex justify-center"><LogoMark size={28} /></div>
        <p className="text-[11px] font-bold">AgreedLink</p>
        <p className="mt-1 text-[9px] text-blue-200">Review and approve from any phone</p>
        <div className="mt-3 rounded-lg bg-brand py-1.5 text-[10px] font-semibold">Approve</div>
      </div>
    </div>
  );
}
