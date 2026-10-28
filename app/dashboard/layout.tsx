import Link from 'next/link';
import { Bell, ChevronRight, LogOut, Search } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { DashboardNav } from '@/components/DashboardNav';
import { requireSession } from '@/lib/data';
import { Avatar } from '@/components/Avatar';
import { signedAvatarUrl } from '@/lib/avatar';
import { signOutAction } from '@/app/auth/actions';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { supabase, profile } = await requireSession();
  const { count } = await supabase.from('notifications').select('id', { count: 'exact', head: true }).is('read_at', null);
  const unread = count ?? 0;
  const avatarUrl = await signedAvatarUrl(supabase, profile.avatar_path);
  const name = profile.display_name || 'Your account';
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || 'A';

  return (
    <div className="min-h-screen md:grid md:grid-cols-[250px_minmax(0,1fr)]">
      <aside className="hidden bg-navy text-white md:block">
        <div className="sticky top-0 flex h-screen flex-col p-4">
          <Link href="/dashboard" aria-label="Dashboard home" className="px-2 py-2"><Logo light /></Link>
          <DashboardNav unread={unread} variant="sidebar" />
          <Link href="/dashboard/settings" className="mb-3 flex items-center gap-3 rounded-xl bg-white/10 p-3 hover:bg-white/15">
            <Avatar url={avatarUrl} initials={initials} size={36} />
            <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{name}</span><span className="block text-xs text-blue-200">Your account</span></span>
            <ChevronRight size={16} className="shrink-0 text-blue-200" aria-hidden="true" />
          </Link>
          <form action={signOutAction}>
            <button className="btn w-full border border-white/20 text-white hover:bg-white/10"><LogOut size={16} aria-hidden="true" /> Log out</button>
          </form>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-line bg-white px-4">
          <Link href="/dashboard" className="shrink-0 md:hidden" aria-label="Dashboard home"><Logo /></Link>
          <form action="/dashboard/agreements" role="search" className="relative hidden min-w-0 max-w-md flex-1 md:block">
            <label htmlFor="header-search" className="sr-only">Search agreements</label>
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input id="header-search" name="q" placeholder="Search agreements, clients" className="input !min-h-[40px] !pl-9" />
          </form>
          <div className="flex shrink-0 items-center gap-2">
            <Link href="/dashboard/notifications" className="btn-secondary relative !px-3" aria-label={`Notifications, ${unread} unread`}>
              <Bell size={18} aria-hidden="true" />
              {unread > 0 ? <span className="rounded-full bg-brand px-1.5 text-xs font-semibold text-white">{unread}</span> : null}
            </Link>
            <Link href="/dashboard/settings" className="md:hidden" aria-label="Profile and settings"><Avatar url={avatarUrl} initials={initials} size={40} /></Link>
            <Link href="/dashboard/agreements/new" className="btn-primary hidden md:inline-flex">+ Create agreement</Link>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 py-6 pb-28 md:pb-10">{children}</main>
      </div>

      <DashboardNav unread={unread} variant="bottom" />
    </div>
  );
}
