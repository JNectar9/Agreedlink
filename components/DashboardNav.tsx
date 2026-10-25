'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, LayoutDashboard, LifeBuoy, PlusCircle, Settings } from 'lucide-react';

const items = [
  { href: '/dashboard', label: 'Dashboard', short: 'Home', Icon: LayoutDashboard, bottom: true },
  { href: '/dashboard/agreements/new', label: 'New agreement', short: 'New', Icon: PlusCircle, bottom: true },
  { href: '/dashboard#notifications', label: 'Notifications', short: 'Alerts', Icon: Bell, bottom: true, badge: true },
  { href: '/dashboard/settings', label: 'Settings', short: 'Settings', Icon: Settings, bottom: true },
  { href: '/contact', label: 'Help and support', short: 'Help', Icon: LifeBuoy, bottom: false }
];

export function DashboardNav({ unread, variant }: { unread: number; variant: 'sidebar' | 'bottom' }) {
  const pathname = usePathname();
  const active = (href: string) => (href.startsWith('/dashboard#') ? false : href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href));
  const badge = (show?: boolean) =>
    show && unread > 0 ? <span className="ml-auto rounded-full bg-bad px-1.5 text-[11px] font-semibold text-white">{unread}</span> : null;

  if (variant === 'bottom') {
    return (
      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-line bg-white md:hidden" aria-label="Dashboard">
        {items.filter((i) => i.bottom).map(({ href, short, Icon, badge: hasBadge }) => (
          <Link key={href} href={href} aria-current={active(href) ? 'page' : undefined}
            className={`relative flex min-h-[58px] flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${active(href) ? 'text-brand' : 'text-navy'}`}>
            <Icon size={20} aria-hidden="true" /> {short}
            {hasBadge && unread > 0 ? <span className="absolute right-6 top-2 rounded-full bg-bad px-1.5 text-[10px] font-semibold text-white">{unread}</span> : null}
          </Link>
        ))}
      </nav>
    );
  }

  return (
    <nav className="mt-6 flex-1 space-y-1" aria-label="Dashboard">
      {items.map(({ href, label, Icon, badge: hasBadge }) => (
        <Link key={href} href={href} aria-current={active(href) ? 'page' : undefined}
          className={`flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-sm font-medium ${active(href) ? 'bg-brand text-white' : 'text-blue-100 hover:bg-white/10'}`}>
          <Icon size={18} aria-hidden="true" /> {label} {badge(hasBadge)}
        </Link>
      ))}
    </nav>
  );
}
