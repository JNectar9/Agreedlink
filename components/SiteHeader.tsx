import Link from 'next/link';
import { Menu } from 'lucide-react';
import { Logo } from './Logo';

const links = [
  { href: '/', label: 'Home' },
  { href: '/#features', label: 'Features' },
  { href: '/#how-it-works', label: 'How It Works' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' }
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" aria-label="AgreedLink home"><Logo /></Link>
        <nav className="hidden items-center gap-6 text-sm font-medium text-ink lg:flex" aria-label="Main">
          {links.map((l) => (<Link key={l.href} href={l.href} className="hover:text-brand">{l.label}</Link>))}
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          <Link href="/signin" className="btn-secondary">Log in</Link>
          <Link href="/signup" className="btn-primary">Get started</Link>
        </div>
        <details className="relative lg:hidden">
          <summary className="btn-secondary list-none cursor-pointer" aria-label="Open menu"><Menu size={18} aria-hidden="true" /> Menu</summary>
          <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-line bg-white p-2 shadow-lg">
            {links.map((l) => (<Link key={l.href} href={l.href} className="block rounded-xl px-3 py-3 text-sm font-medium hover:bg-brand-soft">{l.label}</Link>))}
            <Link href="/signin" className="block rounded-xl px-3 py-3 text-sm font-medium hover:bg-brand-soft">Log in</Link>
            <Link href="/signup" className="btn-primary mt-1 w-full">Get started</Link>
          </div>
        </details>
      </div>
    </header>
  );
}
