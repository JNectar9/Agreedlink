import Link from 'next/link';
import { Bell, LayoutDashboard, LogOut, PlusCircle, Settings } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { requireSession } from '@/lib/data';
import { signOutAction } from '@/app/auth/actions';

export const dynamic = 'force-dynamic';

const nav = [
  { href: '/dashboard', label: 'Overview', Icon: LayoutDashboard },
  { href: '/dashboard/agreements/new', label: 'New agreement', Icon: PlusCircle },
  { href: '/dashboard/settings', label: 'Settings', Icon: Settings }
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { supabase, profile } = await requireSession();
  const { count } = await supabase.from('notifications').select('id', { count: 'exact', head: true }).is('read_at', null);
  const unread = count ?? 0;

  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_1fr]">
      <aside className="hidden border-r border-line bg-white md:block">
        <div className="sticky top-0 flex h-screen flex-col p-4">
          <Link href="/dashboard" aria-label="Dashboard home" className="px-2 py-2"><Logo /></Link>
          <nav className="mt-6 flex-1 space-y-1" aria-label="Dashboard">
            {nav.map(({ href, label, Icon }) => (
              <Link key={href} href={href} className="flex min-h-[44px] items-center gap-3 rounded-lg px-3 text-sm font-medium text-navy hover:bg-brand-soft">
                <Icon size={18} aria-hidden="true" /> {label}
              </Link>
            ))}
          </nav>
          <p className="truncate px-3 text-xs text-muted">{profile.display_name}</p>
          <form action={signOutAction}>
            <button className="btn-secondary mt-2 w-full"><LogOut size={16} aria-hidden="true" /> Sign out</button>
          </form>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-line bg-white px-4">
          <span className="md:hidden"><Logo /></span>
          <span className="hidden text-sm text-muted md:block">Signed in as {profile.display_name || 'your account'}</span>
          <div className="flex items-center gap-2">
            <Link href="/dashboard#notifications" className="btn-secondary relative" aria-label={`Notifications, ${unread} unread`}>
              <Bell size={18} aria-hidden="true" />
              {unread > 0 ? <span className="rounded-full bg-brand px-1.5 text-xs font-semibold text-white">{unread}</span> : null}
            </Link>
            <form action={signOutAction} className="md:hidden">
              <button className="btn-secondary" aria-label="Sign out"><LogOut size={18} aria-hidden="true" /></button>
            </form>
            <Link href="/dashboard/agreements/new" className="btn-primary hidden md:inline-flex">Create agreement</Link>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl px-4 py-6 pb-28 md:pb-10">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-3 border-t border-line bg-white md:hidden" aria-label="Dashboard">
        {nav.map(({ href, label, Icon }) => (
          <Link key={href} href={href} className="flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-xs font-medium text-navy">
            <Icon size={20} aria-hidden="true" /> {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
