import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { requireSession } from '@/lib/data';
import { formatDateTime } from '@/lib/time';
import { minorToInputString } from '@/lib/money';
import { Notice } from '@/components/Notice';
import { SubmitButton } from '@/components/SubmitButton';
import { isUuid, planLabel, subscriptionErrorCopy, usd, type PaidPlan, type PublicConfig, type RequestStatus } from '@/lib/subscriptions';
import {
  approveRequestAction, cancelSubscriptionAction, grantComplimentaryAction, rejectRequestAction, renewSubscriptionAction, updateConfigAction
} from './actions';

export const metadata = { title: 'Admin: subscriptions' };

const BASE = '/dashboard/admin/subscriptions';
const FILTERS = ['pending', 'approved', 'rejected', 'all'] as const;
type Filter = (typeof FILTERS)[number];

type AdminRequest = {
  id: string; user_id: string; name: string; email: string; plan: PaidPlan; months: number; expected_amount_minor: number | null;
  payment_reference: string; customer_notes: string; status: RequestStatus; rejection_reason: string | null; admin_notes: string | null;
  created_at: string; reviewed_at: string | null;
};
type AdminSub = {
  id: string; plan: PaidPlan; kind: 'payment' | 'complimentary'; amount_minor: number; payment_reference: string | null; starts_at: string;
  expires_at: string; status: 'active' | 'cancelled'; admin_notes: string | null; cancelled_at: string | null; cancel_reason: string | null;
};

const BADGE: Record<RequestStatus, string> = { pending: 'bg-warn-bg text-warn', approved: 'bg-ok-bg text-ok', rejected: 'bg-bad-bg text-bad' };

function back(status: Filter, user?: string) {
  const q = new URLSearchParams();
  if (status !== 'pending') q.set('status', status);
  if (user) q.set('user', user);
  const s = q.toString();
  return s ? `${BASE}?${s}` : BASE;
}

export default async function AdminSubscriptionsPage({ searchParams }: { searchParams: { status?: string; user?: string; error?: string; ok?: string } }) {
  const { supabase, profile } = await requireSession();
  // Secure access: the existing is_admin() function decides. Everyone else gets a normal "not found" page.
  const { data: isAdmin } = await supabase.rpc('is_admin');
  if (isAdmin !== true) notFound();

  const tz = profile.timezone;
  const status: Filter = (FILTERS as readonly string[]).includes(searchParams.status ?? '') ? (searchParams.status as Filter) : 'pending';
  const userId = isUuid(searchParams.user) ? searchParams.user : undefined;
  const here = back(status, userId);

  const [reqRes, cfgRes, subsRes] = await Promise.all([
    supabase.rpc('admin_list_requests', { p_status: status }),
    supabase.rpc('subscription_public_config'),
    userId ? supabase.rpc('admin_user_subscriptions', { p_user: userId }) : Promise.resolve({ data: null, error: null })
  ]);
  const requests = (reqRes.data ?? []) as AdminRequest[];
  const cfg = (cfgRes.data ?? null) as PublicConfig | null;
  const subs = (subsRes.data ?? []) as AdminSub[];
  const loadError = reqRes.error ?? cfgRes.error ?? subsRes.error ?? null;
  const now = Date.now();
  const hasActive = subs.some((s) => s.status === 'active' && new Date(s.expires_at).getTime() > now);

  return (
    <div className="max-w-5xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl sm:text-3xl">Subscriptions (admin)</h1>
        <Link href="/dashboard/billing" className="btn-secondary"><ArrowLeft size={16} aria-hidden="true" /> Back to billing</Link>
      </div>
      <Notice error={searchParams.error} ok={searchParams.ok} />
      {loadError ? <Notice error={subscriptionErrorCopy(loadError)} /> : null}

      <section className="card" aria-label="Prices and payment instructions">
        <h2 className="text-lg">Prices and payment instructions</h2>
        <p className="hint">Customers see these on their billing page. New prices apply to new requests only; requests already sent keep their price.</p>
        <form action={updateConfigAction} className="mt-4 space-y-4">
          <input type="hidden" name="back" value={here} />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="price_pro" className="label">Pro price per month (USD)</label>
              <input id="price_pro" name="price_pro" inputMode="decimal" required defaultValue={cfg ? minorToInputString(cfg.prices.pro, 'USD') : '9.00'} className="input" />
            </div>
            <div>
              <label htmlFor="price_premium" className="label">Premium price per month (USD)</label>
              <input id="price_premium" name="price_premium" inputMode="decimal" required defaultValue={cfg ? minorToInputString(cfg.prices.premium, 'USD') : '24.00'} className="input" />
            </div>
          </div>
          <div>
            <label htmlFor="payment_instructions" className="label">Payment instructions</label>
            <textarea id="payment_instructions" name="payment_instructions" rows={6} maxLength={2000} defaultValue={cfg?.payment_instructions ?? ''} className="input" />
            <p className="hint">Bank name, account name, account number and how to write the reference. Shown to customers exactly as typed. Leave empty to pause new requests.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="support_email" className="label">Support email</label>
              <input id="support_email" name="support_email" type="email" maxLength={254} defaultValue={cfg?.support_email ?? ''} className="input" />
            </div>
            <div>
              <label htmlFor="support_whatsapp" className="label">Support WhatsApp</label>
              <input id="support_whatsapp" name="support_whatsapp" type="tel" maxLength={30} defaultValue={cfg?.support_whatsapp ?? ''} className="input" />
              <p className="hint">With country code, for example +234...</p>
            </div>
          </div>
          <SubmitButton pendingText="Saving..." className="w-full sm:w-auto">Save settings</SubmitButton>
        </form>
      </section>

      <section className="space-y-3" aria-label="Requests">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="mr-2 text-lg">Requests</h2>
          {FILTERS.map((f) => (
            <Link key={f} href={back(f, userId)} aria-current={f === status ? 'page' : undefined}
              className={`rounded-full px-3 py-1.5 text-sm font-medium capitalize ${f === status ? 'bg-brand text-white' : 'border border-line bg-white text-navy'}`}>{f}</Link>
          ))}
        </div>
        {requests.length === 0 ? <p className="card text-sm text-muted">No {status === 'all' ? '' : `${status} `}requests.</p> : null}
        {requests.map((r) => (
          <article key={r.id} className="card space-y-3 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-navy">{r.name || 'Unnamed'} <span className="font-normal text-muted">{r.email}</span></p>
                <p className="text-navy">{planLabel(r.plan)}, {r.months} month{r.months === 1 ? '' : 's'}{r.expected_amount_minor != null ? `, expected ${usd(r.expected_amount_minor)}` : ''}</p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${BADGE[r.status]}`}>{r.status}</span>
            </div>
            <dl className="grid gap-1 text-xs text-muted sm:grid-cols-2">
              <div>Reference: <span className="break-all text-ink">{r.payment_reference || 'none given'}</span></div>
              <div>Sent: {formatDateTime(r.created_at, tz)}</div>
              {r.reviewed_at ? <div>Decided: {formatDateTime(r.reviewed_at, tz)}</div> : null}
              {r.customer_notes ? <div className="sm:col-span-2">Customer note: <span className="whitespace-pre-wrap text-ink">{r.customer_notes}</span></div> : null}
              {r.rejection_reason ? <div className="sm:col-span-2">Rejection reason: <span className="text-ink">{r.rejection_reason}</span></div> : null}
              {r.admin_notes ? <div className="sm:col-span-2">Admin note: <span className="text-ink">{r.admin_notes}</span></div> : null}
            </dl>

            {r.status === 'pending' ? (
              <div className="grid gap-3 lg:grid-cols-2">
                <details className="rounded-xl border border-line p-3">
                  <summary className="cursor-pointer font-semibold text-navy">Approve</summary>
                  <form action={approveRequestAction} className="mt-3 space-y-3">
                    <input type="hidden" name="back" value={here} />
                    <input type="hidden" name="request_id" value={r.id} />
                    <p className="hint">Confirm you received the money first. Each payment reference can be used once.</p>
                    <div><label htmlFor={`ref-${r.id}`} className="label">Payment reference</label><input id={`ref-${r.id}`} name="payment_reference" defaultValue={r.payment_reference} minLength={3} maxLength={120} required className="input" /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label htmlFor={`amt-${r.id}`} className="label">Amount received (USD)</label><input id={`amt-${r.id}`} name="amount" inputMode="decimal" defaultValue={r.expected_amount_minor != null ? minorToInputString(r.expected_amount_minor, 'USD') : ''} className="input" /></div>
                      <div><label htmlFor={`mo-${r.id}`} className="label">Months</label><input id={`mo-${r.id}`} name="months" type="number" min={1} max={12} defaultValue={r.months} className="input" /></div>
                    </div>
                    <div><label htmlFor={`note-${r.id}`} className="label">Admin note (optional)</label><input id={`note-${r.id}`} name="notes" maxLength={1000} className="input" /></div>
                    <SubmitButton pendingText="Approving..." className="w-full">Approve request</SubmitButton>
                  </form>
                </details>
                <details className="rounded-xl border border-line p-3">
                  <summary className="cursor-pointer font-semibold text-bad">Reject</summary>
                  <form action={rejectRequestAction} className="mt-3 space-y-3">
                    <input type="hidden" name="back" value={here} />
                    <input type="hidden" name="request_id" value={r.id} />
                    <div><label htmlFor={`why-${r.id}`} className="label">Reason (the customer will see this)</label><input id={`why-${r.id}`} name="reason" required minLength={3} maxLength={500} className="input" /></div>
                    <SubmitButton variant="danger" pendingText="Rejecting..." className="w-full">Reject request</SubmitButton>
                  </form>
                </details>
              </div>
            ) : null}
            <Link href={`${back(status, r.user_id)}#manage`} className="inline-block font-semibold text-brand">Manage this customer&apos;s subscription</Link>
          </article>
        ))}
      </section>

      <section id="manage" className="card space-y-4" aria-label="Manage a customer subscription">
        <h2 className="text-lg">Manage a customer subscription</h2>
        <form method="get" action={BASE} className="flex flex-wrap items-end gap-2">
          {status !== 'pending' ? <input type="hidden" name="status" value={status} /> : null}
          <div className="min-w-0 flex-1">
            <label htmlFor="user" className="label">Account ID</label>
            <input id="user" name="user" defaultValue={userId ?? ''} placeholder="Paste an account ID, or use a request above" className="input" autoComplete="off" />
            <p className="hint">Customers can copy their account ID from the bottom of their billing page.</p>
          </div>
          <button className="btn-secondary">Open</button>
        </form>
        {searchParams.user && !userId ? <p role="alert" className="text-sm text-bad">That is not a valid account ID.</p> : null}

        {userId ? (
          <div className="space-y-4">
            <p className="break-all text-xs text-muted">Account {userId}</p>
            {subs.length === 0 ? <p className="text-sm text-muted">No manual subscriptions for this account yet.</p> : (
              <ul className="divide-y divide-line">
                {subs.map((s) => {
                  const live = s.status === 'active' && new Date(s.expires_at).getTime() > now;
                  return (
                    <li key={s.id} className="space-y-2 py-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-navy">{planLabel(s.plan)}{s.kind === 'complimentary' ? ' (complimentary)' : ` - ${usd(s.amount_minor)}`}</p>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${s.status === 'cancelled' ? 'bg-bad-bg text-bad' : live ? 'bg-ok-bg text-ok' : 'bg-slate-100 text-slate-700'}`}>{s.status === 'cancelled' ? 'Cancelled' : live ? 'Active or queued' : 'Ended'}</span>
                      </div>
                      <p className="text-xs text-muted">{formatDateTime(s.starts_at, tz)} to {formatDateTime(s.expires_at, tz)}{s.payment_reference ? `. Reference: ${s.payment_reference}` : ''}{s.admin_notes ? `. Note: ${s.admin_notes}` : ''}{s.cancel_reason ? `. Cancelled: ${s.cancel_reason}` : ''}</p>
                      {live ? (
                        <details className="rounded-xl border border-line p-3">
                          <summary className="cursor-pointer font-semibold text-bad">Cancel subscription</summary>
                          <form action={cancelSubscriptionAction} className="mt-3 space-y-3">
                            <input type="hidden" name="back" value={here} />
                            <input type="hidden" name="subscription_id" value={s.id} />
                            <p className="hint">Cancels the current period and any renewal already queued. The customer returns to Free at once. History is kept.</p>
                            <div><label htmlFor={`cr-${s.id}`} className="label">Reason</label><input id={`cr-${s.id}`} name="reason" required minLength={3} maxLength={500} className="input" /></div>
                            <SubmitButton variant="danger" pendingText="Cancelling..." className="w-full">Cancel subscription</SubmitButton>
                          </form>
                        </details>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="grid gap-3 lg:grid-cols-2">
              {subs.length > 0 && subs[0].status === 'active' ? (
                <details className="rounded-xl border border-line p-3">
                  <summary className="cursor-pointer font-semibold text-navy">Renew ({planLabel(subs[0].plan)})</summary>
                  <form action={renewSubscriptionAction} className="mt-3 space-y-3">
                    <input type="hidden" name="back" value={here} />
                    <input type="hidden" name="subscription_id" value={subs[0].id} />
                    <p className="hint">Add paid time after the current period. Needs a new, unused payment reference.</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label htmlFor="rn-months" className="label">Months</label><input id="rn-months" name="months" type="number" min={1} max={12} defaultValue={1} required className="input" /></div>
                      <div><label htmlFor="rn-amount" className="label">Amount (USD)</label><input id="rn-amount" name="amount" inputMode="decimal" required defaultValue={cfg ? minorToInputString(cfg.prices[subs[0].plan], 'USD') : ''} className="input" /></div>
                    </div>
                    <div><label htmlFor="rn-ref" className="label">Payment reference</label><input id="rn-ref" name="payment_reference" required minLength={3} maxLength={120} className="input" /></div>
                    <div><label htmlFor="rn-note" className="label">Admin note (optional)</label><input id="rn-note" name="notes" maxLength={1000} className="input" /></div>
                    <SubmitButton pendingText="Renewing..." className="w-full">Renew subscription</SubmitButton>
                  </form>
                </details>
              ) : null}
              <details className="rounded-xl border border-line p-3" open={subs.length === 0}>
                <summary className="cursor-pointer font-semibold text-navy">Grant complimentary access</summary>
                <form action={grantComplimentaryAction} className="mt-3 space-y-3">
                  <input type="hidden" name="back" value={here} />
                  <input type="hidden" name="user_id" value={userId} />
                  <p className="hint">Free access, labelled complimentary in the history.{hasActive ? ' This account has an active plan, so only the same plan can be added.' : ''}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label htmlFor="gr-plan" className="label">Plan</label><select id="gr-plan" name="plan" defaultValue="pro" className="input"><option value="pro">Pro</option><option value="premium">Premium</option></select></div>
                    <div><label htmlFor="gr-months" className="label">Months</label><input id="gr-months" name="months" type="number" min={1} max={12} defaultValue={1} required className="input" /></div>
                  </div>
                  <div><label htmlFor="gr-reason" className="label">Reason</label><input id="gr-reason" name="reason" required minLength={3} maxLength={1000} className="input" /></div>
                  <SubmitButton pendingText="Granting..." className="w-full">Grant access</SubmitButton>
                </form>
              </details>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
