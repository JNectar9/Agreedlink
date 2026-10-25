import { Clock, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { Notice } from '@/components/Notice';
import { SubmitButton } from '@/components/SubmitButton';
import { SITE, configuredSocials, whatsappLink } from '@/lib/site';
import { sendContactAction } from './actions';

export const metadata = { title: 'Contact us' };
export const dynamic = 'force-dynamic';

export default function ContactPage({ searchParams }: { searchParams: { error?: string; sent?: string } }) {
  const socials = configuredSocials();
  const item = 'flex items-start gap-3 rounded-xl border border-line bg-white p-4 hover:border-brand';
  const icon = 'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand';
  return (
    <>
      <SiteHeader />
      <main className="mx-auto grid max-w-5xl gap-8 px-4 py-12 lg:grid-cols-2">
        <div>
          <h1 className="text-3xl">Contact {SITE.company}</h1>
          <p className="mt-3 text-muted">Questions about {SITE.product}? Send us a message or use any of the details below.</p>
          <div className="mt-6 space-y-3">
            <a className={item} href={`mailto:${SITE.email}`}><span className={icon}><Mail size={20} aria-hidden="true" /></span><span><span className="block font-semibold text-navy">Email</span><span className="text-sm text-muted">{SITE.email}</span></span></a>
            <a className={item} href={whatsappLink()} target="_blank" rel="noopener noreferrer"><span className={icon}><MessageCircle size={20} aria-hidden="true" /></span><span><span className="block font-semibold text-navy">WhatsApp</span><span className="text-sm text-muted">{SITE.phone}</span></span></a>
            <a className={item} href={`tel:${SITE.phone}`}><span className={icon}><Phone size={20} aria-hidden="true" /></span><span><span className="block font-semibold text-navy">Phone</span><span className="text-sm text-muted">{SITE.phone}</span></span></a>
            {SITE.address ? <div className={item}><span className={icon}><MapPin size={20} aria-hidden="true" /></span><span><span className="block font-semibold text-navy">Address</span><span className="text-sm text-muted">{SITE.address}</span></span></div> : null}
            {socials.length > 0 ? (
              <p className="flex flex-wrap gap-3 pt-1 text-sm">
                {socials.map((s) => (<a key={s.name} href={s.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand">{s.name}</a>))}
              </p>
            ) : null}
            <p className="flex items-start gap-2 text-xs text-muted"><Clock size={14} className="mt-0.5 shrink-0" aria-hidden="true" /> We do not promise a response time. For anything urgent about an agreement, contact the person who sent it to you.</p>
          </div>
        </div>

        <div className="card h-fit">
          <h2 className="text-xl">Send a message</h2>
          {searchParams.sent ? (
            <div className="mt-4"><Notice ok="Thank you. Your message was received and saved. We will reply by email or WhatsApp." /></div>
          ) : (
            <form action={sendContactAction} className="mt-4 space-y-4">
              <Notice error={searchParams.error} />
              <input type="hidden" name="ts" value={Date.now()} />
              <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
                <label htmlFor="company_site">Leave this empty</label>
                <input id="company_site" name="company_site" tabIndex={-1} autoComplete="off" />
              </div>
              <div><label htmlFor="name" className="label">Your name</label><input id="name" name="name" required maxLength={100} autoComplete="name" className="input" /></div>
              <div><label htmlFor="email" className="label">Your email</label><input id="email" name="email" type="email" required maxLength={254} autoComplete="email" className="input" /></div>
              <div><label htmlFor="subject" className="label">Subject (optional)</label><input id="subject" name="subject" maxLength={150} className="input" /></div>
              <div><label htmlFor="message" className="label">Message</label><textarea id="message" name="message" required minLength={10} maxLength={3000} rows={5} className="input" /></div>
              <SubmitButton>Send message</SubmitButton>
              <p className="hint">We store your name, email, and message so we can reply. See the Privacy Policy.</p>
            </form>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
