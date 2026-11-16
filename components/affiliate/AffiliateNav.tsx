'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HelpCircle, History, Home, User, Users, Wallet } from 'lucide-react';

const ITEMS = [
  { href: '/affiliate', label: 'Dashboard', short: 'Home', Icon: Home, bottom: true },
  { href: '/affiliate/referrals', label: 'My Referrals', short: 'Referrals', Icon: Users, bottom: true },
  { href: '/affiliate/earnings', label: 'My Earnings', short: 'Earnings', Icon: Wallet, bottom: true },
  { href: '/affiliate/payments', label: 'Payment History', short: 'Payments', Icon: History, bottom: true },
  { href: '/affiliate/profile', label: 'Affiliate Profile', short: 'Profile', Icon: User, bottom: true },
  { href: '/affiliate/help', label: 'Help & Support', short: 'Help', Icon: HelpCircle, bottom: false }
];

/** Side menu on large screens, compact bottom bar on phones. */
export function AffiliateNav({ variant }: { variant: 'side' | 'bottom' }) {
  const pathname = usePathname();
  const active = (href: string) => (href === '/affiliate' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`));
  if (variant === 'side') {
    return (
      <nav aria-label="Affiliate" className="space-y-1">
        {ITEMS.map(({ href, label, Icon }) => (
          <Link key={href} href={href} aria-current={active(href) ? 'page' : undefined}
            className={`flex min-h-[48px] items-center gap-3 rounded-xl px-4 text-[15px] font-medium ${active(href) ? 'bg-brand text-white' : 'text-blue-100 hover:bg-white/10'}`}>
            <Icon size={20} aria-hidden="true" /> {label}
          </Link>
        ))}
      </nav>
    );
  }
  return (
    <nav aria-label="Affiliate" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
      {ITEMS.filter((i) => i.bottom).map(({ href, short, Icon }) => (
        <Link key={href} href={href} aria-current={active(href) ? 'page' : undefined}
          className={`flex min-h-[58px] flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${active(href) ? 'text-brand' : 'text-muted'}`}>
          <Icon size={22} aria-hidden="true" /> {short}
        </Link>
      ))}
    </nav>
  );
}
