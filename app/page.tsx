import Link from 'next/link';
import { CheckCircle2, Clock, FileCheck2, GitCompare, Link2, ListChecks, MessageCircle, RefreshCw, ScrollText } from 'lucide-react';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { ComparisonTable } from '@/components/ComparisonTable';
import { compareTerms, priceDifference, type Terms } from '@/lib/terms';
import { PLANS } from '@/lib/pricing';

const sampleBase: Terms = {
  project_name: 'Brand identity for Bloom Studio',
  client_name: 'Sample client',
  client_email: null,
  description: 'Logo and brand guide',
  deliverables: 'Logo, colour palette, brand guide PDF',
  start_date: null,
  delivery_date: '2026-12-10',
  currency: 'USD',
  amount_minor: 120000,
  included_revisions: 2,
  revision_definition: '',
  excluded_work: 'Packaging design',
  additional_work_pricing: 'quote_first',
  additional_work_price_minor: null,
  payment_terms_text: ''
};
const sampleProposed: Terms = { ...sampleBase, amount_minor: 145000, delivery_date: '2026-12-17', deliverables: 'Logo, colour palette, brand guide PDF, social media kit' };

const problems = [
  { title: 'What did we originally agree on?', body: 'Without a shared record, each side remembers the scope a little differently.' },
  { title: 'Was that extra revision included?', body: 'A written revision limit makes it easy to see when new work starts.' },
  { title: 'Did we agree to the new price and deadline?', body: 'Changes recorded with a decision give both sides one place to look.' }
];

const steps = [
  { title: 'Create the agreement', body: 'Enter the project details, price, deliverables, revision limit, and delivery date.', Icon: FileCheck2 },
  { title: 'Share the approval link', body: 'Your customer reviews the details and explicitly approves, asks a question, or declines. No account needed.', Icon: Link2 },
  { title: 'Record every change', body: 'Propose a revised scope, price, and deadline. The customer approves or rejects it, and both versions are kept.', Icon: GitCompare }
];

const features = [
  { title: 'Shareable approval links', Icon: Link2 },
  { title: 'Copy, WhatsApp, email, or device sharing', Icon: MessageCircle },
  { title: 'Original agreement snapshots', Icon: ScrollText },
  { title: 'Revision limits in writing', Icon: ListChecks },
  { title: 'Change requests with side-by-side comparison', Icon: GitCompare },
  { title: 'Updated prices and deadlines', Icon: RefreshCw },
  { title: 'Approval and decision timestamps', Icon: Clock },
  { title: 'Link opened status and activity history', Icon: CheckCircle2 }
];

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="bg-navy text-white">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 lg:grid-cols-2 lg:items-center lg:py-20">
            <div>
              <h1 className="text-4xl font-bold leading-tight !text-white sm:text-5xl">Every project. Every change. Clearly agreed.</h1>
              <p className="mt-5 max-w-lg text-lg text-blue-100">
                Create a clear record of what your client approved, what changed, and what it costs, before extra work begins.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/signup" className="btn-primary !bg-white !text-navy hover:!bg-brand-soft">Create Your First Agreement</Link>
                <Link href="#how-it-works" className="btn border border-white/40 text-white hover:bg-white/10">See How It Works</Link>
              </div>
              <p className="mt-4 text-sm text-blue-200">Free plan: up to 3 new agreements per month.</p>
            </div>
            <div className="rounded-2xl bg-white p-4 text-ink shadow-xl sm:p-6" aria-label="Product preview with sample data">
              <p className="text-xs text-muted">Sample data, shown with the same screens you will use</p>
              <div className="mt-2 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-lg font-semibold text-navy">{sampleBase.project_name}</p>
                  <p className="text-sm text-muted">Original price $1,200.00 · Delivery Dec 10, 2026 · 2 revisions included</p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-warn-bg px-2.5 py-1 text-xs font-semibold text-warn"><GitCompare size={14} aria-hidden="true" /> Changes pending</span>
              </div>
              <p className="mt-3 text-sm font-medium text-navy">Recent change request: add a social media kit</p>
              <div className="mt-3"><ComparisonTable rows={compareTerms(sampleBase, sampleProposed).slice(0, 3)} difference={priceDifference(sampleBase, sampleProposed)} /></div>
            </div>
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
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-white" aria-hidden="true"><Icon size={20} /></span>
                  <h3 className="mt-4 text-lg">{i + 1}. {title}</h3>
                  <p className="mt-2 text-sm text-muted">{body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-3xl">What is in the first release</h2>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {features.map(({ title, Icon }) => (
              <li key={title} className="flex items-center gap-3 rounded-xl border border-line bg-white p-4 text-sm font-medium text-navy">
                <Icon size={20} className="shrink-0 text-brand" aria-hidden="true" /> {title}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-muted">Downloadable records, automatic email reminders, and more languages are planned but not built yet.</p>
        </section>

        <section id="pricing" className="bg-white py-16">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-3xl">Pricing</h2>
            <p className="mt-3 max-w-2xl text-muted">These prices are proposals that have not been validated with customers. Payment is not connected yet, so only the Free plan can be used today.</p>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
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
      </main>
      <SiteFooter />
    </>
  );
}
