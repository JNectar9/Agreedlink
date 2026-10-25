import Link from 'next/link';
import { ArrowRight, CheckCircle2, Clock, FileCheck2, GitCompare, History, Link2, ListChecks, MessageCircle, RefreshCw, ShieldCheck, Smartphone } from 'lucide-react';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { HeroPreview } from '@/components/HeroPreview';
import { PLANS } from '@/lib/pricing';

const highlights = [
  { label: 'Private approval links', Icon: Link2 },
  { label: 'Version history', Icon: History },
  { label: 'Change requests', Icon: GitCompare },
  { label: 'Works on any phone', Icon: Smartphone }
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
  { title: 'Original agreement snapshots', body: 'Approved versions are locked and never silently edited.', Icon: ShieldCheck },
  { title: 'Revision limits in writing', body: 'State what counts as a revision and what is not included.', Icon: ListChecks },
  { title: 'Change requests with comparison', body: 'See current and proposed price, date, and scope side by side.', Icon: GitCompare },
  { title: 'Updated prices and deadlines', body: 'The current terms always match the last approved version.', Icon: RefreshCw },
  { title: 'Timestamps and activity history', body: 'Every action is logged with who, what, and when.', Icon: Clock },
  { title: 'Link opened status', body: 'See when a link was first and last opened.', Icon: CheckCircle2 },
  { title: 'In-app notifications', body: 'Know when a customer approves, declines, or asks a question.', Icon: MessageCircle }
];

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="relative overflow-hidden bg-gradient-to-b from-white to-brand-soft">
          <div aria-hidden="true" className="absolute -right-48 top-8 hidden h-[560px] w-[560px] rounded-full bg-navy lg:block" />
          <div className="relative mx-auto grid max-w-6xl gap-12 px-4 py-14 lg:grid-cols-2 lg:items-center lg:py-20">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5 text-xs font-semibold text-navy">
                <ShieldCheck size={14} className="text-brand" aria-hidden="true" /> Private links · Version history · Simple
              </p>
              <h1 className="mt-5 text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
                Every project. Every change.<span className="block text-brand">Clearly agreed.</span>
              </h1>
              <p className="mt-5 max-w-lg text-lg text-muted">
                Create a clear record of what your client approved, what changed, and what it costs, before extra work begins.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/signup" className="btn-primary">Create Your First Agreement <ArrowRight size={16} aria-hidden="true" /></Link>
                <Link href="#how-it-works" className="btn-secondary">See How It Works</Link>
              </div>
              <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {highlights.map(({ label, Icon }) => (
                  <li key={label} className="flex items-center gap-2 text-xs font-medium text-navy">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-brand shadow-sm"><Icon size={16} aria-hidden="true" /></span>
                    {label}
                  </li>
                ))}
              </ul>
            </div>
            <HeroPreview />
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="max-w-xl text-3xl">Small misunderstandings can become expensive.</h2>
          <p className="mt-3 max-w-2xl text-muted">A clear record can reduce confusion about scope, revisions, price, and dates. It cannot remove every disagreement, but it gives both sides the same facts.</p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {problems.map((p) => (
              <div key={p.title} className="card"><h3 className="text-lg">{p.title}</h3><p className="mt-2 text-sm text-muted">{p.body}</p></div>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="bg-white py-16">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-3xl">How it works</h2>
            <ol className="mt-8 grid gap-6 md:grid-cols-3">
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

        <section id="features" className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-3xl">What you get today</h2>
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

        <section id="pricing" className="bg-white py-16">
          <div className="mx-auto max-w-4xl px-4">
            <h2 className="text-3xl">Pricing</h2>
            <p className="mt-3 max-w-2xl text-muted">The Pro price is a proposal that has not been validated with customers. Online payment is not connected yet, so only the Free plan can be used today.</p>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {PLANS.map((plan) => (
                <div key={plan.id} className="card flex flex-col">
                  <h3 className="text-xl">{plan.name}</h3>
                  <p className="mt-1 text-2xl font-semibold text-navy">{plan.price}</p>
                  <p className="text-sm text-muted">{plan.note}</p>
                  {plan.features.length > 0 ? (
                    <ul className="mt-4 space-y-2 text-sm">
                      {plan.features.map((f) => (<li key={f} className="flex gap-2"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-ok" aria-hidden="true" /> {f}</li>))}
                    </ul>
                  ) : null}
                  {plan.planned ? (
                    <div className="mt-4 text-sm">
                      <p className="font-medium text-navy">Planned</p>
                      <ul className="mt-1 list-disc space-y-1 pl-5 text-muted">{plan.planned.map((f) => (<li key={f}>{f}</li>))}</ul>
                    </div>
                  ) : null}
                  <div className="mt-auto pt-6">
                    {plan.available ? <Link href="/signup" className="btn-primary w-full">Get started free</Link> : <button disabled className="btn-secondary w-full">Not yet available</button>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-navy py-14 text-center">
          <div className="mx-auto max-w-3xl px-4">
            <h2 className="text-3xl !text-white">Ready to agree on the next project?</h2>
            <p className="mt-3 text-blue-100">Create your first agreement in a few minutes, free.</p>
            <Link href="/signup" className="btn-primary mt-6 !bg-white !text-navy hover:!bg-brand-soft">Create Your First Agreement</Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
