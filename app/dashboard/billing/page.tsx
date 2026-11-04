import Link from 'next/link';
import { CheckCircle2, Clock, Mail, MessageCircle, ShieldCheck } from 'lucide-react';
import { requireSession, loadAgreements, ACTIVE_STATUSES } from '@/lib/data';
import { PLAN_CONFIG, PLAN_ORDER } from '@/lib/plans';
import { SITE, buildWhatsAppLink, isValidWhatsAppNumber, toWhatsAppDigits } from '@/lib/site';
import { formatDateTime } from '@/lib/time';
import { Notice } from '@/components/Notice';
import { SubmitButton } from '@/components/SubmitButton';
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
  const [agreements, subRes, cfgRes, reqRes, adminRes] = await Promise.all([
    loadAgreements(supabase),
    supabase.rpc('my_subscription'),
    supabase.rpc('subscription_public_config'),
    supabase.from('subscription_requests').select(REQUEST_COLUMNS).order('created_at', { ascending: false }).limit(20),
    supabase.rpc('is_admin')
  ]);

  const sub = (subRes.data ?? null) as MySubscription | null;
  const cfg = (cfgRes.data ?? null) as PublicConfig | null;
  const requests = (reqRes.data ?? []) as MyRequestRow[];
  const isAdmin = adminRes.data === true;
  const setupError = subRes.error ?? cfgRes.error ?? null;
  const ready = Boolean(sub && cfg && !setupError);

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

  return (
    <div className="max-w-5xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl sm:text-3xl">Billing</h1>
        {isAdmin ? <Link href="/dashboard/admin/subscriptions" className="btn-secondary"><ShieldCheck size={16} aria-hidden="true" /> Admin subscriptions</Link> : null}
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
              {sub?.current ? formatDateTime(sub.current.expires_at, tz) : planId === 'free' ? 'Not applicable' : 'Managed outside this page'}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Type</dt>
            <dd className="font-semibold text-navy">{sub?.current ? (sub.current.kind === 'complimentary' ? 'Complimentary' : 'Paid by transfer') : planId === 'free' ? 'Free' : 'Other'}</dd>
          </div>
        </dl>
        {sub?.state === 'expired' && sub.last_expired_at ? (
          <p className="mt-3 text-sm text-warn">Your paid plan ended on {formatDateTime(sub.last_expired_at, tz)}. You are back on Free. Your agreements and records are kept.</p>
        ) : null}

        <p className="mt-5 text-sm text-ink">Active agreements: <strong>{active}</strong> of {activeLimit}</p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuemin={0} aria-valuemax={activeLimit} aria-valuenow={Math.min(active, activeLimit)} aria-label="Active agreements used">
          <div className={`h-full rounded-full ${over ? 'bg-bad' : 'bg-brand'}`} style={{ width: `${Math.min(100, (active / Math.max(1, activeLimit)) * 100)}%` }} />
        </div>
        <p className="mt-2 text-xs text-muted">Active means draft, awaiting approval, or approved. Completed, declined, expired and cancelled agreements are kept and do not count. Saved templates allowed on this plan: {sub?.limits.saved_templates ?? '-'}.</p>
        {over ? <p role="alert" className="mt-3 text-sm text-bad">You have more active agreements than this plan allows. Nothing was deleted. You cannot create new agreements until you are under the limit.</p> : null}

        {sub?.latest_request?.status === 'pending' ? (
          <p role="status" className="mt-4 rounded-lg border border-warn/30 bg-warn-bg p-3 text-sm text-warn">Your {planLabel(sub.latest_request.plan)} request is waiting for review. Your plan changes once it is approved.</p>
        ) : null}
      </section>

      <section aria-label="Plans" className="space-y-3">
        <h2 className="text-lg">Plans</h2>
        <div className="grid gap-4 lg:grid-cols-3">
          {PLAN_ORDER.map((id) => {
            const p = PLAN_CONFIG[id];
            const lim = cfg?.limits?.[id];
            const featured = id === 'pro';
            return (
              <div key={id} className={`card flex min-w-0 flex-col ${featured ? 'border-brand ring-1 ring-brand/30' : ''}`}>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xl">{p.name}</h3>
                  {planId === id ? <span className="rounded-full bg-ok-bg px-2.5 py-1 text-xs font-semibold text-ok">Current plan</span> : featured ? <span className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-navy">Popular</span> : null}
                </div>
                <p className="mt-2 text-3xl font-bold text-navy">{usdShort(price(id))}<span className="text-base font-medium text-muted">/month</span></p>
                {lim ? <p className="mt-1 text-xs text-muted">{lim.active_agreements} active agreements, {lim.saved_templates} saved template{lim.saved_templates === 1 ? '' : 's'}</p> : null}
                <ul className="mt-4 flex-1 space-y-2 text-sm">
                  {p.features.map((f) => (
                    <li key={f.text} className="flex items-start gap-2">
                      {f.live ? <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-ok" aria-hidden="true" /> : <Clock size={16} className="mt-0.5 shrink-0 text-muted" aria-hidden="true" />}
                      <span className={f.live ? '' : 'text-muted'}>{f.text}{f.live ? '' : ' (coming soon)'}</span>
                    </li>
                  ))}
                </ul>
                <div className="pt-6">
                  {id === 'free' ? (
                    <p className="text-center text-xs text-muted">{planId === 'free' ? 'You are on this plan.' : 'You return to Free when a paid plan ends.'}</p>
                  ) : (
                    <Link href={`/dashboard/billing?plan=${id}#request`} className={`${featured ? 'btn-primary' : 'btn-secondary'} w-full`}>
                      {planId === id ? `Renew ${p.name}` : `Request ${p.name}`}
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted">Subscription prices are in US dollars. If a paid plan ends or is cancelled, you return to Free. Your agreements and records are never deleted. If you are above the Free limit you can keep viewing and finishing them, but you cannot create new ones until you are under the limit.</p>
      </section>

      <section id="request" aria-label="Pay and request a plan" className="grid gap-4 lg:grid-cols-2">
        <div className="card space-y-3">
          <h2 className="text-lg">How to pay</h2>
          {instructions ? (
            <p className="whitespace-pre-wrap break-words rounded-xl bg-page p-4 text-sm text-ink">{instructions}</p>
          ) : (
            <p className="rounded-xl bg-page p-4 text-sm text-muted">Payment instructions have not been added yet. Please contact support below and we will send them to you.</p>
          )}
          <ol className="list-decimal space-y-1 pl-5 text-sm text-ink">
            <li>Pay the total using the instructions above.</li>
            <li>Send the request form with your payment reference or transfer ID.</li>
            <li>We check the payment and approve or reject your request. Your plan starts when it is approved.</li>
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
          <h2 className="text-lg">Request a plan</h2>
          {hasPending ? <p role="status" className="rounded-lg border border-warn/30 bg-warn-bg p-3 text-sm text-warn">You already have a request waiting for review. You can send another once it has been decided.</p> : null}
          {!hasPending && ready && !instructions ? <p role="status" className="rounded-lg border border-warn/30 bg-warn-bg p-3 text-sm text-warn">Requests open once payment instructions are added. Please contact support.</p> : null}
          {sub?.current ? <p className="text-xs text-muted">You have an active {planLabel(sub.current.plan)} plan. Requesting the same plan adds time after it ends. To switch to a different plan, contact support first.</p> : null}
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
              <p className="hint">The total is the monthly price times the months. It is calculated by the server when you send the request, for example Pro for 3 months is {usd(price('pro') * 3)}.</p>
            </div>
            <div>
              <label htmlFor="payment_reference" className="label">Payment reference or transfer ID</label>
              <input id="payment_reference" name="payment_reference" required minLength={3} maxLength={120} className="input" autoComplete="off" />
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
          <p className="mt-2 text-sm text-muted">No requests yet. After you pay, send a request above and its status will appear here.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {requests.map((r) => (
              <li key={r.id} className="space-y-1 py-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-navy">{planLabel(r.requested_plan)}, {r.months} month{r.months === 1 ? '' : 's'}{r.expected_amount_minor != null ? ` - ${usd(r.expected_amount_minor)}` : ''}</p>
                  <RequestBadge status={r.status} />
                </div>
                <p className="text-xs text-muted">Sent {formatDateTime(r.created_at, tz)}{r.reviewed_at ? `. Decided ${formatDateTime(r.reviewed_at, tz)}` : ''}. Reference: {r.payment_reference || 'none'}</p>
                {r.status === 'rejected' && r.rejection_reason ? <p className="text-sm text-bad">Reason: {r.rejection_reason}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </section>

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

      <p className="text-sm text-muted">Questions about plans? <Link href="/contact" className="font-semibold text-brand">Contact {SITE.company}</Link>. Your account ID, if support asks for it: <code className="break-all text-xs">{user.id}</code></p>
    </div>
  );
}
