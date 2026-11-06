import Link from 'next/link';
import { ArrowRight, CheckCircle2, Clock, FileCheck2, GitCompare, History, Link2, ListChecks, MessageCircle, Play, RefreshCw, Share2, ShieldCheck, Sparkles } from 'lucide-react';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { HeroPreview } from '@/components/HeroPreview';
import { HomePricing } from '@/components/HomePricing';
import { Faq } from '@/components/Faq';
import { FAQ } from '@/lib/faq';
import { loadPublicPricing } from '@/lib/public-pricing';

export const dynamic = 'force-dynamic';

// Three highlights only. Public links and "work with confidence" are covered in the feature list further down.
const highlights = [
  { title: 'Get Client Approval', body: 'Share your work and receive approval easily.', Icon: ShieldCheck },
  { title: 'Manage Changes', body: 'Handle requests with clear cost and timeline.', Icon: GitCompare },
  { title: 'Track Everything', body: 'Keep a complete history of agreements.', Icon: History }
];

const steps = [
  { title: 'Create Agreement', body: 'Add project details, cost and deadline.', Icon: FileCheck2, tone: 'bg-brand-soft text-brand' },
  { title: 'Share with Client', body: 'Copy the link or send it by WhatsApp or email.', Icon: Share2, tone: 'bg-brand-soft text-brand' },
  { title: 'Get Approval', body: 'Your client approves and the decision is recorded with a timestamp.', Icon: CheckCircle2, tone: 'bg-ok-bg text-ok' }
];

const problems = [
  { title: 'What did we originally agree on?', body: 'Without a shared record, each side remembers the scope a little differently.' },
  { title: 'Was that extra revision included?', body: 'A written revision limit makes it easy to see when new work starts.' },
  { title: 'Did we agree to the new price and deadline?', body: 'Changes recorded with a decision give both sides one place to look.' }
];

const features = [
  { title: 'Public approval links', body: 'Clients approve without creating an account. Send by WhatsApp, email, or any app.', Icon: Link2 },
  { title: 'Locked approved versions', body: 'Approved terms are never silently edited.', Icon: ShieldCheck },
  { title: 'Revision limits in writing', body: 'State what counts as a revision and what is not included.', Icon: ListChecks },
  { title: 'Change requests', body: 'Compare current and proposed price, date, and scope side by side.', Icon: GitCompare },
  { title: 'Updated prices and deadlines', body: 'Current terms always match the last approved version.', Icon: RefreshCw },
  { title: 'Activity history', body: 'Every action is logged with who, what, and when.', Icon: History },
  { title: 'Link opened status', body: 'See when a link was first and last opened.', Icon: Clock },
  { title: 'Notifications and templates', body: 'Know when a customer decides, and start from a template.', Icon: MessageCircle }
];

export default async function HomePage() {
  const pricing = await loadPublicPricing();

  // The payment answer follows what is actually switched on, so the page never promises a method that is not live.
  const payAnswer = pricing.paystackEnabled
    ? 'You can pay by card through Paystack, charged in naira (NGN), or by manual bank transfer in naira. A card payment activates your plan once Paystack confirms it. A bank transfer is activated by an administrator after they verify your payment reference. Sign in and open Billing to choose.'
    : 'Pay by manual bank transfer in naira to the account shown on the Billing page, then send your payment reference. An administrator verifies the payment and activates your plan, and nothing changes until it is approved. Online card payment is not available yet.';
  const faqItems = FAQ.map((item) => (item.q === 'When will paid plans be available?' ? { q: 'How do I pay for Pro or Premium?', a: payAnswer } : item));

  return (
    <>
      <SiteHeader />
      <main>
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-b from-white to-brand-soft">
          <div aria-hidden="true" className="absolute -right-32 top-4 hidden h-[560px] w-[560px] rounded-full bg-brand/10 lg:block" />
          <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:py-16 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:py-20">
            <div className="animate-fade-up">
              <p className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5 text-xs font-semibold text-navy shadow-sm">
                <Sparkles size={14} className="text-brand" aria-hidden="true" /> For Freelancers &amp; Small Businesses
              </p>
              <h1 className="mt-5 text-4xl font-extrabold leading-[1.08] text-navy sm:text-5xl lg:text-[3.4rem]">
                No more
                <span className="block text-brand">&ldquo;I never said that.&rdquo;</span>
              </h1>
              <p className="mt-5 max-w-lg text-base text-muted sm:text-lg">
                Send one link. Get client approval recorded with a timestamp. Keep a clear history of agreed work and changes.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link href="/signup" className="btn-primary px-6">Get Started Free <ArrowRight size={16} aria-hidden="true" /></Link>
                <Link href="#how-it-works" className="btn-secondary px-6"><Play size={14} className="text-brand" aria-hidden="true" /> See How It Works</Link>
              </div>
              <p className="mt-4 flex items-center gap-2 text-xs font-medium text-muted">
                <ShieldCheck size={16} className="text-brand" aria-hidden="true" /> No payment required to get started
              </p>
            </div>
            <div className="animate-fade-up [animation-delay:150ms]"><HeroPreview /></div>
          </div>
        </section>

        {/* Three highlights */}
        <section className="mx-auto max-w-6xl px-4 pb-4 pt-8 sm:pt-10">
          <ul className="grid divide-y divide-line rounded-2xl border border-line bg-white/80 shadow-sm sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {highlights.map(({ title, body, Icon }) => (
              <li key={title} className="flex flex-col items-center px-5 py-6 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand" aria-hidden="true"><Icon size={24} /></span>
                <h2 className="mt-3 text-base font-bold text-navy">{title}</h2>
                <p className="mt-1 max-w-[16rem] text-sm text-muted">{body}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="mx-auto max-w-6xl scroll-mt-16 px-4 py-14 sm:py-16">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.4fr] lg:items-center">
            <div>
              <span aria-hidden="true" className="block h-0.5 w-12 bg-brand" />
              <p className="mt-3 text-sm font-semibold text-navy">How AgreedLink Works</p>
              <h2 className="mt-1 text-3xl font-extrabold text-navy sm:text-4xl">Get started in 3 simple steps</h2>
              <p className="mt-3 text-muted">Create an agreement, share it with your client, and get approval. It&apos;s that easy.</p>
              <Link href="/signup" className="btn-primary mt-6 px-6">Start Free Now <ArrowRight size={16} aria-hidden="true" /></Link>
            </div>
            <ol className="grid items-stretch gap-6 md:grid-cols-[1fr_auto_1fr_auto_1fr]">
              {steps.map(({ title, body, Icon, tone }, i) => (
                <li key={title} className="contents">
                  <div className="relative rounded-2xl border border-line bg-white p-5 pt-8 text-center shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg">
                    <span className="absolute -top-3 left-1/2 flex h-7 w-7 -translate-x-1/2 items-center justify-center rounded-full bg-brand text-xs font-bold text-white" aria-hidden="true">{i + 1}</span>
                    <span className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${tone}`} aria-hidden="true"><Icon size={26} /></span>
                    <h3 className="mt-3 text-base font-bold text-navy">{title}</h3>
                    <p className="mt-1 text-sm text-muted">{body}</p>
                  </div>
                  {i < steps.length - 1 ? <ArrowRight className="hidden self-center text-brand md:block" size={20} aria-hidden="true" /> : null}
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="scroll-mt-16 bg-white py-14 sm:py-16">
          <div className="mx-auto max-w-6xl px-4">
            <div className="text-center">
              <span aria-hidden="true" className="mx-auto block h-0.5 w-12 bg-brand" />
              <h2 className="mt-3 text-3xl font-extrabold text-navy sm:text-4xl">Simple, Transparent Pricing</h2>
              <p className="mx-auto mt-2 max-w-xl text-muted">Choose the plan that fits your needs. Upgrade anytime.</p>
            </div>
            <div className="mt-10"><HomePricing pricing={pricing} /></div>
          </div>
        </section>

        {/* What you get */}
        <section id="features" className="mx-auto max-w-6xl scroll-mt-16 px-4 py-14 sm:py-16">
          <h2 className="text-2xl sm:text-3xl">What you get today</h2>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(({ title, body, Icon }) => (
              <li key={title} className="card !p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-lg">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand" aria-hidden="true"><Icon size={20} /></span>
                <h3 className="mt-3 text-base">{title}</h3>
                <p className="mt-1 text-sm text-muted">{body}</p>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-muted">Client invitations by email, advanced templates, and team collaboration are planned but not built yet.</p>
        </section>

        {/* Why */}
        <section className="bg-white py-14 sm:py-16">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="max-w-xl text-2xl sm:text-3xl">Small misunderstandings can become expensive.</h2>
            <p className="mt-3 max-w-2xl text-muted">A clear record can reduce confusion about scope, revisions, price, and dates. It cannot remove every disagreement, but it gives both sides the same facts.</p>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {problems.map((p) => (<div key={p.title} className="card"><h3 className="text-lg">{p.title}</h3><p className="mt-2 text-sm text-muted">{p.body}</p></div>))}
            </div>
          </div>
        </section>

        <section id="faq" className="mx-auto max-w-3xl scroll-mt-16 px-4 py-14 sm:py-16">
          <h2 className="text-2xl sm:text-3xl">Frequently asked questions</h2>
          <div className="mt-6"><Faq items={faqItems} /></div>
        </section>

        {/* Closing banner */}
        <section className="px-4 pb-14">
          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-navy px-6 py-10 sm:px-10">
            <div aria-hidden="true" className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-brand/30 blur-2xl" />
            <div className="relative flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
              <div className="max-w-2xl">
                <h2 className="text-2xl !text-white sm:text-3xl">Start every project with clarity and confidence.</h2>
                <p className="mt-2 text-blue-100">Join freelancers and small businesses who want clearer agreements and better client relationships.</p>
              </div>
              <Link href="/signup" className="btn-primary shrink-0 px-6">Get Started Free <ArrowRight size={16} aria-hidden="true" /></Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
