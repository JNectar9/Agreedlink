import Link from 'next/link';
import { Building2, CheckCircle2, Clock, CreditCard } from 'lucide-react';
import { PLAN_CONFIG, PLAN_ORDER, type PlanId } from '@/lib/plans';
import { nairaShort, type PublicPricing } from '@/lib/pricing-format';
import { usdShort } from '@/lib/subscriptions';

const TAGLINE: Record<PlanId, string> = {
  free: 'Try AgreedLink with a few active agreements.',
  pro: 'For freelancers with a steady flow of work.',
  premium: 'For small businesses with many agreements at once.'
};

const CTA: Record<PlanId, string> = { free: 'Get Started Free', pro: 'Start Pro Plan', premium: 'Start Premium' };

/** The three plans plus an honest "how you can pay" strip. Card payment appears only while an admin has Paystack switched on. */
export function HomePricing({ pricing }: { pricing: PublicPricing }) {
  const { usdMinor, ngnMinor, paystackEnabled } = pricing;
  const usd = (id: PlanId) => (id === 'free' ? 0 : id === 'pro' ? usdMinor.pro : usdMinor.premium);

  return (
    <div>
      <div className="grid gap-6 lg:grid-cols-3 lg:items-start">
        {PLAN_ORDER.map((id) => {
          const plan = PLAN_CONFIG[id];
          const featured = id === 'pro';
          const live = plan.features.filter((f) => f.live);
          const soon = plan.features.filter((f) => !f.live);
          const naira = ngnMinor && id !== 'free' ? (id === 'pro' ? ngnMinor.pro : ngnMinor.premium) : null;
          return (
            <article
              key={id}
              aria-labelledby={`home-plan-${id}`}
              className={`relative flex min-w-0 flex-col rounded-2xl bg-white p-6 shadow-[0_8px_30px_rgba(7,26,61,0.06)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_16px_44px_rgba(7,26,61,0.14)] ${
                featured ? 'border-2 border-brand lg:pb-8' : 'border border-line'
              }`}
            >
              {featured ? (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-brand px-4 py-1 text-xs font-semibold text-white shadow">Most Popular</span>
              ) : null}
              <h3 id={`home-plan-${id}`} className="text-xl font-bold text-navy">{plan.name}</h3>
              <p className="mt-1 text-sm text-muted">{TAGLINE[id]}</p>

              <p className="mt-4 text-4xl font-extrabold text-navy">
                {id === 'free' ? '$0' : naira !== null ? nairaShort(naira) : usdShort(usd(id))}
                <span className="text-base font-medium text-muted"> /month</span>
              </p>
              <p className="mt-1 min-h-[2.5rem] text-xs text-muted">
                {id === 'free'
                  ? 'No payment needed.'
                  : naira !== null
                    ? `${usdShort(usd(id))}/month USD reference price. Card checkout is charged in naira.`
                    : 'Priced in US dollars. Paid by bank transfer and activated by an administrator.'}
              </p>

              <ul className="mt-4 space-y-2.5 text-sm text-ink">
                {live.map((f) => (
                  <li key={f.text} className="flex items-start gap-2">
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" />
                    <span>{f.text}</span>
                  </li>
                ))}
              </ul>

              {soon.length > 0 ? (
                <details className="group mt-4 rounded-xl bg-page px-3 py-2 text-sm">
                  <summary className="flex cursor-pointer list-none items-center gap-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted">
                    <Clock size={14} aria-hidden="true" /> Coming soon ({soon.length})
                  </summary>
                  <ul className="mt-2 space-y-1.5 pb-1 text-muted">
                    {soon.map((f) => (<li key={f.text}>{f.text}</li>))}
                  </ul>
                  <p className="pb-1 text-xs text-muted">Planned, not available yet.</p>
                </details>
              ) : null}

              <div className="mt-6 pt-1">
                {id === 'free' ? (
                  <Link href="/signup" className="btn-secondary w-full border-brand text-brand">{CTA[id]}</Link>
                ) : (
                  <Link
                    href={`/dashboard/billing?plan=${id}#${paystackEnabled ? 'card' : 'request'}`}
                    className={`${featured ? 'btn-primary' : 'btn-secondary border-brand text-brand'} w-full`}
                  >
                    {CTA[id]}
                  </Link>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <div className={`mt-10 grid gap-4 ${paystackEnabled ? 'md:grid-cols-2' : ''}`} aria-label="How you can pay">
        {paystackEnabled ? (
          <div className="card">
            <h3 className="flex items-center gap-2 text-lg text-navy"><CreditCard size={18} className="text-brand" aria-hidden="true" /> Pay with Paystack</h3>
            <p className="mt-2 text-sm text-ink">
              Pay by debit or credit card on Paystack&apos;s secure page, including international Visa and Mastercard where your card issuer allows. Your plan activates once Paystack confirms the payment.
            </p>
            <p className="mt-2 text-xs text-muted">Card checkout is charged in Nigerian naira (NGN). The dollar prices are a reference, and the naira amounts are not exact currency conversions.</p>
          </div>
        ) : null}
        <div className="card">
          <h3 className="flex items-center gap-2 text-lg text-navy"><Building2 size={18} className="text-brand" aria-hidden="true" /> Manual bank transfer</h3>
          <p className="mt-2 text-sm text-ink">
            Pay by bank transfer in US dollars, then send your payment reference from the Billing page. An administrator verifies the payment and activates your plan. Nothing changes until it is approved.
          </p>
          <p className="mt-2 text-xs text-muted">Payment instructions are shown to signed-in customers on the Billing page.</p>
        </div>
      </div>
    </div>
  );
}
