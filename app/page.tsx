import Link from 'next/link';
import { ArrowRight, BarChart3, CheckCircle2, Clock, FileCheck2, FileText, GitCompare, History, Link2, ListChecks, MessageCircle, RefreshCw, ShieldCheck, Smartphone } from 'lucide-react';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { HeroPreview } from '@/components/HeroPreview';
import { PricingCards } from '@/components/PricingCards';
import { Faq } from '@/components/Faq';
import { publicStats } from '@/lib/platform';

export const dynamic = 'force-dynamic';

const highlights = [
  { label: 'Digital Agreements', Icon: FileText },
  { label: 'Private and Secure Links', Icon: ShieldCheck },
  { label: 'Track Progress', Icon: BarChart3 },
  { label: 'Peace of Mind', Icon: CheckCircle2 }
];

const problems = [
  { title: 'What did we originally agree on?', body: 'Without a shared record, each side remembers the scope a little differently.' },
  { title: 'Was that extra revision included?', body: 'A written revision limit makes it easy to see when new work starts.' },
  { title: 'Did we agree to the new price and deadline?', body: 'Changes recorded with a decision give both sides one place to look.' }
];

const steps = [
  { title: 'Create the agreement', body: 'Enter the project details, price, deliverables, revision limit, and delivery date.', Icon: FileCheck2 },
  { title: 'Share the approval link', body: 'Your customer reviews the details and approves, asks a question, or declines. No account needed.', Icon: Link2 },
  { title: 'Record every change', body: 'Propose a revised scope, price, and deadline. The customer decides, and every version is kept.', Icon: GitCompare }
];

const features = [
  { title: 'Shareable approval links', body: 'Send by WhatsApp, email, or any app on your phone.', Icon: Link2 },
  { title: 'Locked approved versions', body: 'Approved terms are never silently edited.', Icon: ShieldCheck },
  { title: 'Revision limits in writing', body: 'State what counts as a revision and what is not included.', Icon: ListChecks },
  { title: 'Change requests', body: 'Compare current and proposed price, date, and scope side by side.', Icon: GitCompare },
  { title: 'Updated prices and deadlines', body: 'Current terms always match the last approved version.', Icon: RefreshCw },
  { title: 'Activity history', body: 'Every action is logged with who, what, and when.', Icon: History },
  { title: 'Link opened status', body: 'See when a link was first and last opened.', Icon: Clock },
  { title: 'Notifications and templates', body: 'Know when a customer decides, and start from a template.', Icon: MessageCircle }
];

export default async function HomePage() {
  const stats = await publicStats();
  const real = stats
    ? [
        { label: 'Registered users', value: stats.users },
        { label: 'Agreements created', value: stats.agreements },
        { label: 'Paid subscribers', value: stats.subscribers }
      ].filter((s) => s.value > 0)
    : [];

  return (
    <>
      <SiteHeader />
      <main>
        <section className="relative overflow-hidden bg-gradient-to-b from-white to-brand-soft">
          <div aria-hidden="true" className="absolute -right-56 top-10 hidden h-[640px] w-[640px] rounded-full bg-navy lg:block" />
          <div aria-hidden="true" className="absolute -left-40 top-24 hidden h-80 w-80 rounded-full bg-brand/10 lg:block" />
          <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:py-16 lg:grid-cols-[1fr_1.15fr] lg:items-center lg:py-20">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5 text-xs font-semibold text-navy shadow-sm">
                <ShieldCheck size={14} className="text-brand" aria-hidden="true" /> Secure <span className="text-brand">·</span> Simple <span className="text-brand">·</span> Reliable
              </p>
              <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] sm:text-5xl lg:text-6xl">
                Make Agreements<span className="block text-brand">That Work</span>
              </h1>
              <p className="mt-5 max-w-lg text-base text-muted sm:text-lg">
                AgreedLink helps individuals, freelancers and businesses create, manage and track agreements with confidence. Simple, secure and built for real life.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link href="/signup" className="btn-primary">Create an Agreement <ArrowRight size={16} aria-hidden="true" /></Link>
                <Link href="#how-it-works" className="btn-secondary">See How It Works</Link>
              </div>
              <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {highlights.map(({ label, Icon }) => (
                  <li key={label} className="flex items-center gap-2 text-xs font-medium text-navy">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-brand shadow-sm"><Icon size={16} aria-hidden="true" /></span>
                    <span className="min-w-0">{label}</span>
                  </li>
                ))}
              </ul>
              {real.length > 0 ? (
                <dl className="mt-8 flex flex-wrap gap-x-8 gap-y-3 border-t border-line pt-5">
                  {real.map((s) => (<div key={s.label}><dt className="text-xs text-muted">{s.label}</dt><dd className="text-xl font-bold text-navy">{s.value.toLocaleString('en')}</dd></div>))}
                </dl>
              ) : null}
            </div>
            <HeroPreview />
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14 sm:py-16">
          <h2 className="max-w-xl text-2xl sm:text-3xl">Small misunderstandings can become expensive.</h2>
          <p className="mt-3 max-w-2xl text-muted">A clear record can reduce confusion about scope, revisions, price, and dates. It cannot remove every disagreement, but it gives both sides the same facts.</p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {problems.map((p) => (<div key={p.title} className="card"><h3 className="text-lg">{p.title}</h3><p className="mt-2 text-sm text-muted">{p.body}</p></div>))}
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-16 bg-white py-14 sm:py-16">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-2xl sm:text-3xl">How it works</h2>
            <ol className="mt-8 grid gap-5 md:grid-cols-3">
              {steps.map(({ title, body, Icon }, i) => (
                <li key={title} className="rounded-2xl border border-line bg-page p-6">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand text-white" aria-hidden="true"><Icon size={20} /></span>
                  <h3 className="mt-4 text-lg">{i + 1}. {title}</h3>
                  <p className="mt-2 text-sm text-muted">{body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-6xl scroll-mt-16 px-4 py-14 sm:py-16">
          <h2 className="text-2xl sm:text-3xl">What you get today</h2>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(({ title, body, Icon }) => (
              <li key={title} className="card !p-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand" aria-hidden="true"><Icon size={20} /></span>
                <h3 className="mt-3 text-base">{title}</h3>
                <p className="mt-1 text-sm text-muted">{body}</p>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-muted">File attachments, PDF records, and automatic email reminders are planned but not built yet.</p>
        </section>

        <section id="pricing" className="scroll-mt-16 bg-white py-14 sm:py-16">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-2xl sm:text-3xl">Pricing</h2>
            <p className="mt-3 max-w-2xl text-muted">Start free. Pro and Premium are priced in US dollars, with approximate naira amounts shown as estimates. Online payment is not connected yet, so only the Free plan can be used today. Features marked coming soon are not built yet.</p>
            <div className="mt-8"><PricingCards /></div>
          </div>
        </section>

        <section id="faq" className="mx-auto max-w-3xl scroll-mt-16 px-4 py-14 sm:py-16">
          <h2 className="text-2xl sm:text-3xl">Frequently asked questions</h2>
          <div className="mt-6"><Faq /></div>
        </section>

        <section className="bg-navy py-14 text-center">
          <div className="mx-auto max-w-3xl px-4">
            <h2 className="text-2xl !text-white sm:text-3xl">Ready to agree on the next project?</h2>
            <p className="mt-3 text-blue-100">Create your first agreement in a few minutes, free.</p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/signup" className="btn-primary !bg-white !text-navy hover:!bg-brand-soft">Create an Agreement</Link>
              <Link href="/contact" className="btn border border-white/40 text-white hover:bg-white/10">Contact us</Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
