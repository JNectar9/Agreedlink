import Link from 'next/link';
import { Mail, MessageCircle, ShieldCheck } from 'lucide-react';
import { requireSession, loadAgreements, ACTIVE_STATUSES } from '@/lib/data';
import { PLAN_CONFIG } from '@/lib/plans';
import { PricingPlans } from '@/components/PricingPlans';
import { ACTIVATION_NOTE, ACTIVATION_STEPS } from '@/lib/pricing-display';
import { SITE, buildWhatsAppLink, isValidWhatsAppNumber, toWhatsAppDigits } from '@/lib/site';
import { formatDateTime } from '@/lib/time';
import { Notice } from '@/components/Notice';
import { SubmitButton } from '@/components/SubmitButton';
import { PaystackCheckout } from '@/components/PaystackCheckout';
import { CopyReference } from '@/components/CopyReference';
import { formatNgn, type PaystackBillingExtras, type PaystackConfigExtras } from '@/lib/paystack-checkout';
import {
  isPaidPlan, planLabel, subscriptionErrorCopy, usd, usdShort,
  type MyRequestRow, type MySubscription, type PublicConfig, type RequestStatus
} from '@/lib/subscriptions';
import { submitSubscriptionRequestAction } from './actions';

export const metadata = { title: 'Billing' };

const REQUEST_COLUMNS = 'id, requested_plan, months, expected_amount_minor, currency, payment_reference, customer_notes, status, rejection_reason, reviewed_at, created_at';

const STATUS_STYLE: Record<RequestStatus, { cls: string; label: string }> = {
  pending: { cls: 'bg-warn-bg text-warn', label: 'Pending review' },
  approved: { cls: 'bg-ok-bg text-ok', label: 'Approved' },
  rejected: { cls: 'bg-bad-bg text-bad', label: 'Rejected' }
};

function RequestBadge({ status }: { status: RequestStatus }) {
  const s = STATUS_STYLE[status];
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${s.cls}`}>{s.label}</span>;
}

export default async function BillingPage({ searchParams }: { searchParams: { plan?: string; error?: string; ok?: string } }) {
  const { supabase, user, profile } = await requireSession();
  const [agreements, subRes, cfgRes, reqRes, adminRes, refRowsRes] = await Promise.all([
    loadAgreements(supabase),
    supabase.rpc('my_subscription'),
    supabase.rpc('subscription_public_config'),
    supabase.from('subscription_requests').select(REQUEST_COLUMNS).order('created_at', { ascending: false }).limit(20),
    supabase.rpc('is_admin'),
    // Read separately so Billing keeps working even before the reference migration has been run.
    supabase.from('subscription_requests').select('id, transfer_reference').order('created_at', { ascending: false }).limit(20)
  ]);

  const sub = (subRes.data ?? null) as MySubscription | null;
  const cfg = (cfgRes.data ?? null) as PublicConfig | null;
  const pcfg = (cfgRes.data ?? null) as PaystackConfigExtras | null;
  const extras = (subRes.data ?? {}) as PaystackBillingExtras;
  const cardPlan = extras.paystack ?? null;
  const cardPayments = extras.paystack_payments ?? [];
  const requests = (reqRes.data ?? []) as MyRequestRow[];
  const isAdmin = adminRes.data === true;
  const setupError = subRes.error ?? cfgRes.error ?? null;
  const ready = Boolean(sub && cfg && !setupError);
  const showCard = ready && pcfg?.paystack_enabled === true && Boolean(pcfg.ngn_prices);

  const tz = profile.timezone;
  const active = agreements.filter((a) => ACTIVE_STATUSES.includes(a.status)).length;
  const planId = sub?.effective_plan ?? 'free';
  const plan = PLAN_CONFIG[planId];
  const activeLimit = sub?.limits.active_agreements ?? plan.activeAgreements;
  const over = active > activeLimit;
  const hasPending = requests.some((r) => r.status === 'pending');
  const preselect = isPaidPlan(searchParams.plan) ? searchParams.plan : sub?.current?.plan ?? 'pro';

  const price = (id: 'free' | 'pro' | 'premium') => cfg?.prices[id] ?? PLAN_CONFIG[id].usdPerMonth * 100;
  const instructions = cfg?.payment_instructions?.trim() ?? '';
  const supportEmail = cfg?.support_email?.trim() || SITE.email;
  const waDigits = toWhatsAppDigits(cfg?.support_whatsapp?.trim() || SITE.whatsapp);
  const waOk = isValidWhatsAppNumber(waDigits);

  const stateLabel = sub?.state === 'active' ? 'Active' : sub?.state === 'expired' ? 'Expired' : 'Free plan';
  const stateCls = sub?.state === 'expired' ? 'bg-warn-bg text-warn' : 'bg-ok-bg text-ok';
  const canRequest = ready && instructions !== '' && !hasPending;

  // The AgreedLink payment reference (AGL-YYYYMMDD-XXXXX). A pending request shows the reference it already uses.
  // Otherwise the person gets their current unused reference, which the database creates once and never hands out twice.
  const refByRequest = new Map(((refRowsRes.error ? [] : refRowsRes.data ?? []) as { id: string; transfer_reference: string | null }[]).map((r) => [r.id, r.transfer_reference]));
  const pendingRequest = requests.find((r) => r.status === 'pending');
  let transferRef: string | null = pendingRequest ? refByRequest.get(pendingRequest.id) ?? null : null;
  let refUnavailable = false;
  if (!pendingRequest && ready) {
    const refRes = await supabase.rpc('get_my_transfer_reference');
    if (refRes.error) refUnavailable = true;
    else transferRef = (refRes.data as { reference?: string } | null)?.reference ?? null;
  }

  return (
    <div className="max-w-5xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl sm:text-3xl">Billing</h1>
        {isAdmin ? (
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/admin/subscriptions#settings" className="btn-secondary"><ShieldCheck size={16} aria-hidden="true" /> Update prices</Link>
            <Link href="/dashboard/admin/subscriptions#requests" className="btn-secondary">Manage requests</Link>
          </div>
        ) : null}
      </div>

      <Notice error={searchParams.error} ok={searchParams.ok} />
      {setupError ? <Notice error={subscriptionErrorCopy(setupError)} /> : null}

      <section className="card" aria-label="Current plan">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-sm text-muted">Current plan</p><p className="text-2xl font-semibold text-navy">{plan.name}</p></div>
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${stateCls}`}>{stateLabel}</span>
        </div>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          <div><dt className="text-muted">Price</dt><dd className="font-semibold text-navy">{usdShort(price(planId))}/month</dd></div>
          <div>
            <dt className="text-muted">{sub?.current ? 'Paid access until' : 'Access until'}</dt>
            <dd className="font-semibold text-navy">
              {sub?.current ? formatDateTime(sub.current.expires_at, tz) : cardPlan?.current_period_end ? formatDateTime(cardPlan.current_period_end, tz) : planId === 'free' ? 'Not applicable' : 'Managed outside this page'}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Type</dt>
            <dd className="font-semibold text-navy">{sub?.current ? (sub.current.kind === 'complimentary' ? 'Complimentary' : 'Paid by bank transfer') : cardPlan ? 'Paid by card (Paystack)' : planId === 'free' ? 'Free' : 'Other'}</dd>
          </div>
        </dl>
        {sub?.state === 'expired' && sub.last_expired_at ? (
          <p className="mt-3 text-sm text-warn">Your paid plan ended on {formatDateTime(sub.last_expired_at, tz)}. You are on Free. Your records are kept.</p>
        ) : null}

        <p className="mt-5 text-sm text-ink">Active agreements: <strong>{active}</strong> of {activeLimit}</p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuemin={0} aria-valuemax={activeLimit} aria-valuenow={Math.min(active, activeLimit)} aria-label="Active agreements used">
          <div className={`h-full rounded-full ${over ? 'bg-bad' : 'bg-brand'}`} style={{ width: `${Math.min(100, (active / Math.max(1, activeLimit)) * 100)}%` }} />
        </div>
        <p className="mt-2 text-xs text-muted">Active agreements are drafts, awaiting approval or approved. Completed, declined, expired and cancelled agreements stay in your history and do not count. Saved templates: {sub?.limits.saved_templates ?? '-'}.</p>
        {over ? <p role="alert" className="mt-3 text-sm text-bad">You are over this plan&apos;s limit. Nothing was deleted, but you cannot create new agreements until you are under it.</p> : null}

        {sub?.latest_request?.status === 'pending' ? (
          <p role="status" className="mt-4 rounded-lg border border-warn/30 bg-warn-bg p-3 text-sm text-warn">Your {planLabel(sub.latest_request.plan)} request is waiting for review.</p>
        ) : null}
      </section>

      <section aria-label="Plans" className="space-y-3">
        <div>
          <h2 className="text-lg">Plans</h2>
          <p className="text-sm text-muted">Free is $0. Pro is {usdShort(price('pro'))} and Premium is {usdShort(price('premium'))} per month. These are US dollar reference prices.</p>
        </div>
        <PricingPlans
          mode="billing"
          currentPlan={planId}
          prices={{ free: price('free'), pro: price('pro'), premium: price('premium') }}
          limits={{ free: cfg?.limits?.free?.active_agreements, pro: cfg?.limits?.pro?.active_agreements, premium: cfg?.limits?.premium?.active_agreements }}
        />
        <p className="text-xs text-muted">When a paid plan ends you return to Free. Nothing is deleted. Above the Free limit you can still view and finish agreements, but not create new ones.</p>
      </section>

      {showCard && pcfg?.ngn_prices ? (
        <PaystackCheckout
          ngnPrices={pcfg.ngn_prices}
          usdPrices={{ pro: price('pro'), premium: price('premium') }}
          preselect={preselect}
          blockedByManual={Boolean(sub?.current)}
          activePaystackPlan={cardPlan?.plan ?? null}
        />
      ) : null}

      <section id="request" aria-label="Pay and request a plan" className="grid scroll-mt-20 gap-4 lg:grid-cols-2">
        <div className="card space-y-3">
          <h2 className="text-lg">How to pay by bank transfer</h2>
          <p className="rounded-xl border border-brand/20 bg-brand-soft p-3 text-sm text-navy">{ACTIVATION_NOTE}</p>
          {transferRef ? (
            <div className="space-y-2 rounded-xl border-2 border-brand bg-white p-4">
              <p className="text-sm font-semibold text-navy">Your payment reference</p>
              <p className="break-all text-2xl font-bold tracking-wide text-navy" data-testid="transfer-reference">{transferRef}</p>
              <CopyReference value={transferRef} />
              <p className="text-xs text-muted">Write this in your bank transfer description. Use it instead of any other reference below. It is never reused.</p>
            </div>
          ) : refUnavailable ? (
            <p role="status" className="rounded-lg border border-warn/30 bg-warn-bg p-3 text-sm text-warn">Your payment reference could not be created. Refresh the page, or contact support.</p>
          ) : null}
          {instructions ? (
            <p className="whitespace-pre-wrap break-words rounded-xl bg-page p-4 text-sm text-ink">{instructions}</p>
          ) : (
            <p className="rounded-xl bg-page p-4 text-sm text-muted">Bank details are not added yet. Please contact support.</p>
          )}
          <ol className="list-decimal space-y-1 pl-5 text-sm text-ink">
            {ACTIVATION_STEPS.map((step) => <li key={step}>{step}</li>)}
          </ol>
          <div className="border-t border-line pt-3 text-sm">
            <p className="font-semibold text-navy">Need help?</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <a href={`mailto:${supportEmail}`} className="btn-secondary"><Mail size={16} aria-hidden="true" /> {supportEmail}</a>
              {waOk ? <a href={buildWhatsAppLink(waDigits, 'Hello, I have a question about my AgreedLink subscription.')} target="_blank" rel="noopener noreferrer" className="btn-secondary"><MessageCircle size={16} aria-hidden="true" /> WhatsApp</a> : null}
            </div>
          </div>
        </div>

        <form action={submitSubscriptionRequestAction} className="card space-y-4">
          <h2 className="text-lg">Request a plan (bank transfer)</h2>
          {hasPending ? <p role="status" className="rounded-lg border border-warn/30 bg-warn-bg p-3 text-sm text-warn">A request is already waiting for review.</p> : null}
          {!hasPending && ready && !instructions ? <p role="status" className="rounded-lg border border-warn/30 bg-warn-bg p-3 text-sm text-warn">Requests open once bank details are added. Contact support.</p> : null}
          {sub?.current ? <p className="text-xs text-muted">Requesting the same plan adds time after it ends. To switch plans, contact support.</p> : null}
          <fieldset disabled={!canRequest} className="space-y-4 disabled:opacity-60">
            <div>
              <label htmlFor="plan" className="label">Plan</label>
              <select id="plan" name="plan" defaultValue={preselect} className="input">
                <option value="pro">Pro ({usdShort(price('pro'))}/month)</option>
                <option value="premium">Premium ({usdShort(price('premium'))}/month)</option>
              </select>
            </div>
            <div>
              <label htmlFor="months" className="label">Number of months</label>
              <select id="months" name="months" defaultValue="1" className="input">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>{m} month{m === 1 ? '' : 's'}</option>)}
              </select>
              <p className="hint">Total = monthly price × months. Pro for 3 months is {usd(price('pro') * 3)}.</p>
            </div>
            <div>
              <label htmlFor="payment_reference" className="label">Bank transfer transaction ID</label>
              <input id="payment_reference" name="payment_reference" required minLength={3} maxLength={120} className="input" autoComplete="off" />
              <p className="hint">From your bank receipt. Not the same as your payment reference.</p>
            </div>
            <div>
              <label htmlFor="customer_notes" className="label">Notes (optional)</label>
              <textarea id="customer_notes" name="customer_notes" rows={3} maxLength={1000} className="input" />
            </div>
            <SubmitButton pendingText="Sending..." className="w-full">Send request</SubmitButton>
          </fieldset>
        </form>
      </section>

      <section className="card" aria-label="Your requests">
        <h2 className="text-lg">Your requests</h2>
        {requests.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No requests yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {requests.map((r) => (
              <li key={r.id} className="space-y-1 py-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-navy">{planLabel(r.requested_plan)}, {r.months} month{r.months === 1 ? '' : 's'}{r.expected_amount_minor != null ? ` - ${usd(r.expected_amount_minor)}` : ''}</p>
                  <RequestBadge status={r.status} />
                </div>
                <p className="text-xs text-muted">Sent {formatDateTime(r.created_at, tz)}{r.reviewed_at ? `. Decided ${formatDateTime(r.reviewed_at, tz)}` : ''}. {refByRequest.get(r.id) ? `Payment reference: ${refByRequest.get(r.id)}. ` : ''}Transaction ID: {r.payment_reference || 'none'}</p>
                {r.status === 'rejected' && r.rejection_reason ? <p className="text-sm text-bad">Reason: {r.rejection_reason}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {cardPayments.length > 0 ? (
        <section className="card" aria-label="Card payments">
          <h2 className="text-lg">Card payments</h2>
          <ul className="mt-3 divide-y divide-line">
            {cardPayments.map((p, i) => (
              <li key={`${p.paid_at}-${i}`} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <div>
                  <p className="font-semibold text-navy">{planLabel(p.plan)} - {formatNgn(p.amount_minor)}</p>
                  <p className="text-xs text-muted">Paid {formatDateTime(p.paid_at, tz)}. Covers {formatDateTime(p.period_start, tz)} to {formatDateTime(p.period_end, tz)}</p>
                </div>
                <span className="rounded-full bg-ok-bg px-2.5 py-1 text-xs font-semibold text-ok">Paid</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {sub && sub.history.length > 0 ? (
        <section className="card" aria-label="Subscription history">
          <h2 className="text-lg">Subscription history</h2>
          <ul className="mt-3 divide-y divide-line">
            {sub.history.map((h, i) => (
              <li key={`${h.starts_at}-${i}`} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <div>
                  <p className="font-semibold text-navy">{planLabel(h.plan)} {h.kind === 'complimentary' ? '(complimentary)' : ''}</p>
                  <p className="text-xs text-muted">{formatDateTime(h.starts_at, tz)} to {formatDateTime(h.expires_at, tz)}{h.kind === 'payment' ? `. Paid ${usd(h.amount_minor)}` : ''}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${h.status === 'cancelled' ? 'bg-bad-bg text-bad' : new Date(h.expires_at) > new Date() ? 'bg-ok-bg text-ok' : 'bg-slate-100 text-slate-700'}`}>
                  {h.status === 'cancelled' ? 'Cancelled' : new Date(h.expires_at) > new Date() ? 'Active' : 'Ended'}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="text-sm text-muted">Need help? <Link href="/contact" className="font-semibold text-brand">Contact {SITE.company}</Link>. Account ID: <code className="break-all text-xs">{user.id}</code></p>
    </div>
  );
}
