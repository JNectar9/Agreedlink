import Link from 'next/link';
import { HandHeart } from 'lucide-react';
import { requireSession } from '@/lib/data';
import { Logo } from '@/components/Logo';
import { AffiliateNav } from '@/components/affiliate/AffiliateNav';

export const metadata = { title: 'Affiliate' };
export const dynamic = 'force-dynamic';

export default async function AffiliateLayout({ children }: { children: React.ReactNode }) {
  await requireSession();
  return (
    <div className="min-h-screen bg-page lg:flex">
      <aside className="hidden w-64 shrink-0 flex-col bg-navy p-4 text-white lg:sticky lg:top-0 lg:flex lg:h-screen">
        <Link href="/affiliate" className="px-2 py-3" aria-label="Affiliate home"><Logo light /></Link>
        <div className="mt-4"><AffiliateNav variant="side" /></div>
        <div className="mt-auto space-y-4">
          <div className="rounded-2xl border border-white/15 bg-white/5 p-4 text-center">
            <HandHeart className="mx-auto" size={32} aria-hidden="true" />
            <p className="mt-2 text-lg font-bold">Grow together!</p>
            <p className="text-sm text-blue-100">Share AgreedLink and earn commissions.</p>
            <Link href="/affiliate/help" className="mt-3 inline-flex min-h-[44px] items-center rounded-lg bg-brand px-4 text-sm font-semibold text-white">View Guide</Link>
          </div>
          <p className="px-2 text-center text-xs text-blue-200">Approve the work. Agree on the changes.</p>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-line bg-white px-4 lg:hidden">
          <Link href="/affiliate" aria-label="Affiliate home"><Logo /></Link>
          <Link href="/dashboard" className="text-sm font-semibold text-brand">Back to app</Link>
        </header>
        <main className="mx-auto max-w-6xl px-4 pb-28 pt-5 sm:px-6 lg:pb-10 lg:pt-8">{children}</main>
      </div>
      <AffiliateNav variant="bottom" />
    </div>
  );
}
