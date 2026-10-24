import Link from 'next/link';
import { Logo } from './Logo';

export function SiteFooter() {
  const col = 'space-y-2 text-sm';
  const a = 'text-blue-100 hover:text-white';
  return (
    <footer className="bg-navy text-blue-100">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 md:grid-cols-4">
        <div className="sm:col-span-2 md:col-span-1">
          <Logo light />
          <p className="mt-3 text-sm text-blue-200">Approve the work. Agree on the changes.</p>
        </div>
        <ul className={col}>
          <li className="font-semibold text-white">Product</li>
          <li><Link className={a} href="/#features">Features</Link></li>
          <li><Link className={a} href="/#how-it-works">How it works</Link></li>
          <li><Link className={a} href="/#pricing">Pricing</Link></li>
        </ul>
        <ul className={col}>
          <li className="font-semibold text-white">Company</li>
          <li><Link className={a} href="/about">About</Link></li>
          <li><Link className={a} href="/about#contact">Contact</Link></li>
        </ul>
        <ul className={col}>
          <li className="font-semibold text-white">Legal</li>
          <li><Link className={a} href="/privacy">Privacy Policy</Link></li>
          <li><Link className={a} href="/terms">Terms of Service</Link></li>
        </ul>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-5 text-xs text-blue-200 sm:flex-row sm:justify-between">
          <p>Created by JNectar</p>
          <p>AgreedLink is not a bank, escrow service, payment processor, or law firm.</p>
        </div>
      </div>
    </footer>
  );
}
