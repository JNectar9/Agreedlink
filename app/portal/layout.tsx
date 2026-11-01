import Link from 'next/link';
import { redirect } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { signOutAction } from '@/app/auth/actions';

export const dynamic = 'force-dynamic';

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured()) redirect('/signin');
  const {
    data: { user }
  } = await createClient().auth.getUser();
  if (!user) redirect('/signin?next=/portal');
  return (
    <div className="min-h-screen bg-page">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4">
          <Link href="/portal" aria-label="My agreements"><Logo /></Link>
          <div className="flex items-center gap-2">
            <Link href="/dashboard" className="btn-secondary !px-3 text-xs sm:text-sm">Business dashboard</Link>
            <form action={signOutAction}><button className="btn-secondary !px-3" aria-label="Log out"><LogOut size={16} aria-hidden="true" /></button></form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6 pb-16">{children}</main>
    </div>
  );
}
