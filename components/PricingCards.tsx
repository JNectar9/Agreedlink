import Link from 'next/link';
import { CheckCircle2, Clock } from 'lucide-react';
import { PLAN_CONFIG, PLAN_ORDER, priceFor } from '@/lib/plans';

/** The three official plans. Features that are not built yet are marked "Coming soon". */
export function PricingCards({ currentPlan, currency = 'USD' }: { currentPlan?: string; currency?: string }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {PLAN_ORDER.map((id) => {
        const plan = PLAN_CONFIG[id];
        const price = priceFor(id, currency);
        const featured = id === 'pro';
        return (
          <div key={id} className={`card flex min-w-0 flex-col ${featured ? 'border-brand ring-1 ring-brand/30' : ''}`}>
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xl">{plan.name}</h3>
              {currentPlan === id ? <span className="rounded-full bg-ok-bg px-2.5 py-1 text-xs font-semibold text-ok">Current plan</span> : featured ? <span className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-navy">Popular</span> : null}
            </div>
            <p className="mt-2 text-3xl font-bold text-navy">{price.headline}</p>
            <p className="mt-1 text-xs text-muted">{price.note}</p>
            <ul className="mt-4 flex-1 space-y-2 text-sm">
              {plan.features.map((f) => (
                <li key={f.text} className="flex items-start gap-2">
                  {f.live ? <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-ok" aria-hidden="true" /> : <Clock size={16} className="mt-0.5 shrink-0 text-muted" aria-hidden="true" />}
                  <span className={f.live ? '' : 'text-muted'}>{f.text}{f.live ? '' : ' (coming soon)'}</span>
                </li>
              ))}
            </ul>
            <div className="pt-6">
              {id === 'free' ? (
                <Link href="/signup" className="btn-secondary w-full">Get started free</Link>
              ) : (
                <Link href={`/dashboard/billing?plan=${id}`} className={`${featured ? 'btn-primary' : 'btn-secondary'} w-full`}>Choose {plan.name}</Link>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
