'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, CreditCard, FileText, LayoutDashboard, LayoutTemplate, Settings, UserRound, Users } from 'lucide-react';

type Item = { href: string; label: string; short: string; Icon: typeof Bell; bottom: boolean; badge?: boolean };

const items: Item[] = [
  { href: '/dashboard', label: 'Dashboard', short: 'Home', Icon: LayoutDashboard, bottom: true },
  { href: '/dashboard/agreements', label: 'Agreements', short: 'Agreements', Icon: FileText, bottom: true },
  { href: '/dashboard/templates', label: 'Templates', short: 'Templates', Icon: LayoutTemplate, bottom: false },
  { href: '/dashboard/clients', label: 'Clients', short: 'Clients', Icon: Users, bottom: false },
  { href: '/dashboard/notifications', label: 'Notifications', short: 'Alerts', Icon: Bell, bottom: true, badge: true },
  { href: '/dashboard/billing', label: 'Billing', short: 'Billing', Icon: CreditCard, bottom: false },
  { href: '/dashboard/settings', label: 'Settings', short: 'Profile', Icon: Settings, bottom: false }
];

const mobileProfile: Item = { href: '/dashboard/settings', label: 'Profile', short: 'Profile', Icon: UserRound, bottom: true };

export function DashboardNav({ unread, variant }: { unread: number; variant: 'sidebar' | 'bottom' }) {
  const pathname = usePathname();
  const active = (href: string) => (href === '/dashboard' ? pathname === '/dashboard' : pathname === href || pathname.startsWith(`${href}/`));

  if (variant === 'bottom') {
    const list = [...items.filter((i) => i.bottom), mobileProfile];
    return (
      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] md:hidden" aria-label="Dashboard">
        {list.map(({ href, short, Icon, badge }) => (
          <Link key={href} href={href} aria-current={active(href) ? 'page' : undefined}
            className={`relative flex min-h-[58px] min-w-0 flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-medium ${active(href) ? 'text-brand' : 'text-muted'}`}>
            <Icon size={20} aria-hidden="true" />
            <span className="max-w-full truncate">{short}</span>
            {badge && unread > 0 ? <span className="absolute right-[22%] top-1.5 rounded-full bg-bad px-1.5 text-[10px] font-semibold text-white">{unread}</span> : null}
          </Link>
        ))}
      </nav>
    );
  }

  return (
    <nav className="mt-6 flex-1 space-y-1 overflow-y-auto" aria-label="Dashboard">
      {items.map(({ href, label, Icon, badge }) => (
        <Link key={href} href={href} aria-current={active(href) ? 'page' : undefined}
          className={`flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-sm font-medium ${active(href) ? 'bg-brand text-white' : 'text-blue-100 hover:bg-white/10'}`}>
          <Icon size={18} aria-hidden="true" /> {label}
          {badge && unread > 0 ? <span className="ml-auto rounded-full bg-bad px-1.5 text-[11px] font-semibold text-white">{unread}</span> : null}
        </Link>
      ))}
    </nav>
  );
}
