import { Bell, CheckCircle2, Clock, FileText, LayoutDashboard, LayoutTemplate, MessageCircle, Settings, Users, Wallet } from 'lucide-react';
import { LogoMark } from './Logo';

const nav = [
  { label: 'Dashboard', Icon: LayoutDashboard, active: true },
  { label: 'Agreements', Icon: FileText },
  { label: 'Templates', Icon: LayoutTemplate },
  { label: 'Clients', Icon: Users },
  { label: 'Alerts', Icon: Bell },
  { label: 'Billing', Icon: Wallet },
  { label: 'Settings', Icon: Settings }
];

const stats = [
  { label: 'Total', value: '12', Icon: FileText, tone: 'bg-brand-soft text-brand' },
  { label: 'Active', value: '8', Icon: CheckCircle2, tone: 'bg-ok-bg text-ok' },
  { label: 'Pending', value: '3', Icon: Clock, tone: 'bg-warn-bg text-warn' }
];

const rows = [
  { title: 'Website design project', client: 'Client A', status: 'Approved', tone: 'bg-ok-bg text-ok' },
  { title: 'Logo and brand kit', client: 'Client B', status: 'Awaiting', tone: 'bg-warn-bg text-warn' },
  { title: 'Product photography', client: 'Client C', status: 'Approved', tone: 'bg-ok-bg text-ok' }
];

/** Illustration of the product built from sample data. Hidden from assistive tech; captioned on screen. */
export function HeroPreview() {
  return (
    <div className="relative mx-auto w-full max-w-2xl pb-10 sm:pb-12" aria-hidden="true">
      <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-[0_28px_70px_rgba(7,26,61,0.3)]">
        <div className="grid grid-cols-[88px_1fr] sm:grid-cols-[132px_1fr]">
          <div className="bg-navy p-2.5 text-white sm:p-3">
            <div className="flex items-center gap-1.5 text-[10px] font-bold sm:text-xs"><LogoMark size={16} light /> AgreedLink</div>
            <ul className="mt-3 space-y-1 text-[10px] sm:text-[11px]">
              {nav.map(({ label, Icon, active }) => (
                <li key={label} className={`flex items-center gap-1.5 rounded-md px-1.5 py-1.5 ${active ? 'bg-brand text-white' : 'text-blue-100'}`}><Icon size={11} /> {label}</li>
              ))}
            </ul>
          </div>
          <div className="min-w-0 p-3 sm:p-4">
            <p className="text-xs font-semibold text-navy sm:text-sm">Good morning</p>
            <p className="text-[10px] text-muted">Here is what is happening with your agreements</p>
            <div className="mt-3 grid grid-cols-3 gap-1.5">
              {stats.map(({ label, value, Icon, tone }) => (
                <div key={label} className="flex items-center gap-1.5 rounded-lg border border-line p-1.5">
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${tone}`}><Icon size={12} /></span>
                  <span className="min-w-0"><span className="block text-xs font-semibold leading-none text-navy">{value}</span><span className="block truncate text-[9px] text-muted">{label}</span></span>
                </div>
              ))}
            </div>
            <div className="mt-2 rounded-lg border border-line p-2">
              <p className="text-[10px] font-semibold text-navy">Agreement activity</p>
              <svg viewBox="0 0 200 50" className="mt-1 h-10 w-full" preserveAspectRatio="none">
                <polygon points="0,50 0,38 30,30 60,34 90,20 120,24 150,12 200,8 200,50" fill="#1769FF" opacity="0.12" />
                <polyline points="0,38 30,30 60,34 90,20 120,24 150,12 200,8" fill="none" stroke="#1769FF" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
              </svg>
            </div>
            <ul className="mt-2 space-y-1">
              {rows.map((r) => (
                <li key={r.title} className="flex items-center justify-between gap-2 rounded-lg border border-line px-2 py-1.5">
                  <span className="min-w-0"><span className="block truncate text-[10px] font-semibold text-navy">{r.title}</span><span className="block truncate text-[9px] text-muted">{r.client}</span></span>
                  <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${r.tone}`}>{r.status}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="absolute -bottom-1 -left-1 w-28 rounded-[1.4rem] border-4 border-navy bg-white p-2 shadow-xl sm:-left-4 sm:w-36">
        <div className="flex items-center justify-between"><p className="text-[9px] font-bold text-navy">AgreedLink</p><LogoMark size={12} /></div>
        <div className="mt-1.5 grid grid-cols-2 gap-1">
          {stats.slice(0, 2).map(({ label, value, tone }) => (<div key={label} className="rounded-md border border-line p-1 text-center"><span className={`mx-auto block h-3 w-3 rounded ${tone}`} /><p className="text-[10px] font-semibold text-navy">{value}</p><p className="text-[7px] text-muted">{label}</p></div>))}
        </div>
        <div className="mt-1.5 rounded-md bg-brand py-1 text-center text-[8px] font-semibold text-white">Create agreement</div>
      </div>

      <div className="absolute -right-2 top-6 hidden w-44 rounded-xl border border-line bg-white shadow-xl xl:block">
        <div className="flex items-center gap-2 rounded-t-xl bg-[#075E54] px-3 py-2 text-white"><MessageCircle size={14} /><span className="text-[11px] font-semibold">WhatsApp</span></div>
        <div className="space-y-1.5 bg-[#ECE5DD] p-2.5">
          <p className="rounded-lg rounded-tl-none bg-white p-2 text-[10px] text-ink">Hi! Welcome to AgreedLink. How can we help?</p>
          <p className="w-fit rounded-full border border-[#25D366] bg-white px-2 py-0.5 text-[9px] font-semibold text-[#075E54]">I have a question</p>
        </div>
      </div>
      <p className="absolute bottom-0 right-0 text-[10px] text-muted">Sample data for illustration</p>
    </div>
  );
}
