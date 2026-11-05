import Link from 'next/link';
import { CheckCircle2, Clock } from 'lucide-react';
import { PLAN_CONFIG } from '@/lib/plans';
import { PLAN_ORDER, PLAN_TAGLINE, availableFeatures, comingSoonFeatures, type PlanId } from '@/lib/pricing-display';
import { usdShort } from '@/lib/subscriptions';

type Props = {
  /** 'public' is the marketing page. 'billing' is the signed-in page, where buttons start a payment request. */
  mode: 'public' | 'billing';
  /** Monthly prices in US cents. Falls back to the official $0 / $9 / $24. */
  prices?: Partial<Record<PlanId, number>>;
  /** Active-agreement limits from the database, when known. */
  limits?: Partial<Record<PlanId, number>>;
  currentPlan?: PlanId;
};

/** The three plans. Available features and coming-soon features are shown in two clearly separate groups. */
export function PricingPlans({ mode, prices, limits, currentPlan }: Props) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {PLAN_ORDER.map((id) => {
        const plan = PLAN_CONFIG[id];
        const cents = prices?.[id] ?? plan.usdPerMonth * 100;
        const available = availableFeatures(id, limits?.[id]);
        const soon = comingSoonFeatures(id);
        const featured = id === 'pro';
        const isCurrent = currentPlan === id;
        return (
          <article key={id} aria-labelledby={`plan-${mode}-${id}`} className={`card flex min-w-0 flex-col ${featured ? 'border-brand ring-1 ring-brand/30' : ''}`}>
            <div className="flex items-center justify-between gap-2">
              <h3 id={`plan-${mode}-${id}`} className="text-xl">{plan.name}</h3>
              {isCurrent ? <span className="rounded-full bg-ok-bg px-2.5 py-1 text-xs font-semibold text-ok">Current plan</span> : featured ? <span className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-navy">Most popular</span> : null}
            </div>
            <p className="mt-1 text-sm text-muted">{PLAN_TAGLINE[id]}</p>
            <p className="mt-4 text-4xl font-bold text-navy">
              {usdShort(cents)}
              <span className="text-base font-medium text-muted">{id === 'free' ? ' forever' : '/month'}</span>
            </p>
            <p className="mt-1 text-xs text-muted">{id === 'free' ? 'No payment needed.' : 'US dollars. Paid manually, activated by an administrator.'}</p>

            <div className="mt-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-ok">Available now</p>
              <ul className="mt-2 space-y-2 text-sm">
                {available.map((text) => (
                  <li key={text} className="flex items-start gap-2">
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-ok" aria-hidden="true" />
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
            </div>

            {soon.length > 0 ? (
              <div className="mt-5 flex-1 rounded-xl bg-page p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Coming soon <span className="font-normal normal-case">(not available yet)</span></p>
                <ul className="mt-2 space-y-2 text-sm text-muted">
                  {soon.map((text) => (
                    <li key={text} className="flex items-start gap-2">
                      <Clock size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                      <span>{text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : <div className="flex-1" />}

            <div className="pt-6">
              {id === 'free' ? (
                mode === 'public'
                  ? <Link href="/signup" className="btn-secondary w-full">Get started free</Link>
                  : <p className="text-center text-xs text-muted">{isCurrent ? 'You are on this plan.' : 'You return to Free when a paid plan ends.'}</p>
              ) : (
                <Link href={`/dashboard/billing?plan=${id}#request`} className={`${featured ? 'btn-primary' : 'btn-secondary'} w-full`}>
                  {mode === 'public' ? `Choose ${plan.name}` : isCurrent ? `Renew ${plan.name}` : `Request ${plan.name}`}
                </Link>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
