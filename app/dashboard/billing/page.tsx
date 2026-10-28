import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { requireSession, loadAgreements, ACTIVE_STATUSES } from '@/lib/data';
import { PLAN_CONFIG, isPlanId } from '@/lib/plans';
import { PricingCards } from '@/components/PricingCards';
import { SITE } from '@/lib/site';
import { formatDateTime } from '@/lib/time';

export const metadata = { title: 'Billing' };

export default async function BillingPage({ searchParams }: { searchParams: { plan?: string } }) {
  const { supabase, user, profile } = await requireSession();
  const [agreements, planRes, subRes] = await Promise.all([
    loadAgreements(supabase),
    supabase.rpc('my_plan'),
    supabase.from('subscriptions').select('plan, status, source, current_period_end, cancel_at_period_end').eq('user_id', user.id).maybeSingle()
  ]);
  const planId = isPlanId(planRes.data) ? planRes.data : 'free';
  const plan = PLAN_CONFIG[planId];
  const sub = subRes.data as { plan: string; status: string; source: string; current_period_end: string | null; cancel_at_period_end: boolean } | null;
  const active = agreements.filter((a) => ACTIVE_STATUSES.includes(a.status)).length;
  const wanted = isPlanId(searchParams.plan) && searchParams.plan !== 'free' ? PLAN_CONFIG[searchParams.plan] : null;
  const over = active > plan.activeAgreements;

  return (
    <div className="max-w-5xl space-y-5">
      <h1 className="text-2xl sm:text-3xl">Billing</h1>

      {wanted ? (
        <div role="status" className="flex items-start gap-3 rounded-2xl border border-warn/30 bg-warn-bg p-4 text-sm text-warn">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
          <p>You chose <strong>{wanted.name}</strong> (${wanted.usdPerMonth}/month). Online payment is being connected and is not available yet, so nothing was charged and your plan has not changed. We will confirm the exact amount and ask for your consent at checkout.</p>
        </div>
      ) : null}

      <section className="card" aria-label="Current plan">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-sm text-muted">Current plan</p><p className="text-2xl font-semibold text-navy">{plan.name}</p></div>
          <span className="rounded-full bg-ok-bg px-2.5 py-1 text-xs font-semibold text-ok">{sub?.status ? sub.status.replace('_', ' ') : 'active'}</span>
        </div>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          <div><dt className="text-muted">Price</dt><dd className="font-semibold text-navy">${plan.usdPerMonth}/month</dd></div>
          <div><dt className="text-muted">Renewal</dt><dd className="font-semibold text-navy">{sub?.current_period_end ? formatDateTime(sub.current_period_end, profile.timezone) : planId === 'free' ? 'Not applicable' : 'Not available'}</dd></div>
          <div><dt className="text-muted">Source</dt><dd className="font-semibold capitalize text-navy">{sub?.source ?? 'free'}</dd></div>
        </dl>
        <p className="mt-5 text-sm text-ink">Active agreements: <strong>{active}</strong> of {plan.activeAgreements}</p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuemin={0} aria-valuemax={plan.activeAgreements} aria-valuenow={Math.min(active, plan.activeAgreements)} aria-label="Active agreements used">
          <div className={`h-full rounded-full ${over ? 'bg-bad' : 'bg-brand'}`} style={{ width: `${Math.min(100, (active / plan.activeAgreements) * 100)}%` }} />
        </div>
        <p className="mt-2 text-xs text-muted">Active means draft, awaiting approval, or approved. Completed, declined, expired and cancelled agreements are kept and do not count.</p>
        {over ? <p role="alert" className="mt-3 text-sm text-bad">You have more active agreements than this plan allows. Nothing was deleted. You cannot create new agreements until you are under the limit.</p> : null}
      </section>

      <section aria-label="Plans" className="space-y-3">
        <h2 className="text-lg">Plans</h2>
        <PricingCards currentPlan={planId} />
        <p className="text-sm text-muted">If a paid plan ends or is cancelled, you return to Free. Your agreements and records are never deleted. If you are above the Free limit, you can keep viewing and finishing them, but you cannot create new ones until you are under the limit.</p>
      </section>

      <p className="text-sm text-muted">Questions about plans? <Link href="/contact" className="font-semibold text-brand">Contact {SITE.company}</Link>.</p>
    </div>
  );
}
