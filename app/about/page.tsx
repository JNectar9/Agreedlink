import Link from 'next/link';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { SITE, whatsappAvailable, whatsappLink } from '@/lib/site';

export const metadata = { title: 'About' };

export default function AboutPage() {
  const link = 'font-semibold text-brand break-words';
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl">About AgreedLink</h1>
        <div className="mt-6 space-y-4 leading-relaxed">
          <p>AgreedLink is a web app for freelancers and small custom-service businesses. It helps you record what a customer approved, track the changes they request, and keep the updated price and deadline in one place before extra work begins.</p>
          <p>AgreedLink was created by JNectar for people who work with customers in many countries and currencies.</p>
          <h2 className="pt-4 text-xl">What AgreedLink is not</h2>
          <p>AgreedLink is not a bank, escrow service, payment processor, or law firm. It never holds your customers&apos; money. It records the details and decisions entered in the app. It does not verify anyone&apos;s identity and does not guarantee that an agreement will be followed or is legally enforceable.</p>
          <h2 id="contact" className="pt-4 text-xl">Contact</h2>
          <ul className="space-y-2">
            <li>AgreedLink team email: <a className={link} href={`mailto:${SITE.teamEmail}`}>{SITE.teamEmail}</a></li>
            <li>JNectar email: <a className={link} href={`mailto:${SITE.email}`}>{SITE.email}</a></li>
            <li>
              WhatsApp / Call: <a className={link} href={`tel:${SITE.phone}`}>{SITE.phone}</a>
              {whatsappAvailable ? <> (<a className={link} href={whatsappLink()} target="_blank" rel="noopener noreferrer">Chat on WhatsApp</a>)</> : null}
            </li>
            <li>Website: <a className={link} href={SITE.website} target="_blank" rel="noopener noreferrer">{SITE.website.replace(/^https?:\/\//, '')}</a></li>
          </ul>
          <p>You can also send a message from the <Link href="/contact" className="font-semibold text-brand">Contact page</Link>.</p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
