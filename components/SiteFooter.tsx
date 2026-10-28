import Link from 'next/link';
import { Logo } from './Logo';
import { SITE, configuredSocials, whatsappLink } from '@/lib/site';
import { WhatsAppWidget } from './WhatsAppWidget';

export function SiteFooter() {
  const a = 'text-blue-100 hover:text-white';
  const socials = configuredSocials();
  return (
    <footer className="bg-navy text-blue-100">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-1">
          <Logo light />
          <p className="mt-3 text-sm text-blue-200">Approve the work. Agree on the changes.</p>
          <p className="mt-2 text-sm text-blue-200">{SITE.product} is a product of {SITE.company}.</p>
        </div>
        <ul className="space-y-2 text-sm">
          <li className="font-semibold text-white">Product</li>
          <li><Link className={a} href="/#features">Features</Link></li>
          <li><Link className={a} href="/#how-it-works">How it works</Link></li>
          <li><Link className={a} href="/pricing">Pricing</Link></li>
          <li><Link className={a} href="/signin">Log in</Link></li>
        </ul>
        <ul className="min-w-0 space-y-2 text-sm">
          <li className="font-semibold text-white">Contact us</li>
          <li className="flex flex-wrap items-center gap-x-2"><span className="text-blue-200">WhatsApp / Call:</span> <a className={a} href={`tel:${SITE.phone}`}>{SITE.phone}</a> <a className="rounded-full border border-white/30 px-2 py-0.5 text-xs text-white hover:bg-white/10" href={whatsappLink()} target="_blank" rel="noopener noreferrer">Chat</a></li>
          <li className="break-words"><span className="text-blue-200">Email:</span> <a className={a} href={`mailto:${SITE.email}`}>{SITE.email}</a></li>
          <li className="break-words"><span className="text-blue-200">Website:</span> <a className={a} href={SITE.website} target="_blank" rel="noopener noreferrer">{SITE.website.replace(/^https?:\/\//, '')}</a></li>
          {SITE.address ? <li className="text-blue-200">{SITE.address}</li> : null}
          {socials.map((s) => (<li key={s.name}><a className={a} href={s.url} target="_blank" rel="noopener noreferrer">{s.name}</a></li>))}
        </ul>
        <ul className="space-y-2 text-sm">
          <li className="font-semibold text-white">Company</li>
          <li><Link className={a} href="/about">About</Link></li>
          <li><Link className={a} href="/contact">Contact us</Link></li>
          <li><Link className={a} href="/privacy">Privacy Policy</Link></li>
          <li><Link className={a} href="/terms">Terms of Service</Link></li>
        </ul>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-5 text-xs text-blue-200 sm:flex-row sm:justify-between">
          <p>Created by {SITE.company}</p>
          <p>{SITE.product} is not a bank, escrow service, payment processor, or law firm.</p>
        </div>
      </div>
      <WhatsAppWidget number={SITE.whatsapp} />
    </footer>
  );
}
