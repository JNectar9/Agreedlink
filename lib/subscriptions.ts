// Helpers for the manual subscription pages. The database (migration 20261101_manual_subscriptions.sql)
// enforces every rule; this file only validates form input early and turns database errors into plain words.
import { formatMinor, parseMoneyToMinor } from './money';

export type PaidPlan = 'pro' | 'premium';
export type RequestStatus = 'pending' | 'approved' | 'rejected';

export type PublicConfig = {
  currency: string;
  prices: { free: number; pro: number; premium: number };
  limits: Record<string, { active_agreements: number; saved_templates: number }> | null;
  payment_instructions: string;
  support_email: string;
  support_whatsapp: string;
  automatic_payments_enabled: boolean;
};

export type MySubscription = {
  effective_plan: 'free' | 'pro' | 'premium';
  state: 'free' | 'active' | 'expired';
  source: 'free' | 'manual' | 'other';
  limits: { active_agreements: number; saved_templates: number };
  current: { plan: PaidPlan; kind: 'payment' | 'complimentary'; starts_at: string; expires_at: string } | null;
  last_expired_at: string | null;
  latest_request: { id: string; plan: PaidPlan; months: number; status: RequestStatus } | null;
  history: {
    plan: PaidPlan;
    kind: 'payment' | 'complimentary';
    amount_minor: number;
    currency: string;
    starts_at: string;
    expires_at: string;
    status: 'active' | 'cancelled';
    cancelled_at: string | null;
  }[];
};

export type MyRequestRow = {
  id: string;
  requested_plan: PaidPlan;
  months: number;
  expected_amount_minor: number | null;
  currency: string;
  /** The customer's own bank transfer transaction ID. */
  payment_reference: string;
  /** AgreedLink's generated reference (AGL-YYYYMMDD-XXXXX). Empty on requests made before references existed. */
  transfer_reference?: string | null;
  customer_notes: string;
  status: RequestStatus;
  rejection_reason: string | null;
  reviewed_at: string | null;
  created_at: string;
};

export function isPaidPlan(value: unknown): value is PaidPlan {
  return value === 'pro' || value === 'premium';
}

export function planLabel(plan: string): string {
  return plan === 'pro' ? 'Pro' : plan === 'premium' ? 'Premium' : 'Free';
}

/** Subscription money is always US dollars (the database enforces this). */
export function usd(minor: number): string {
  return formatMinor(minor, 'USD');
}

/** Whole dollars in the headline, cents only when needed: 900 -> "$9", 950 -> "$9.50". */
export function usdShort(minor: number): string {
  return minor % 100 === 0 ? `$${minor / 100}` : usd(minor);
}

export type RequestInput = { plan: PaidPlan; months: number; reference: string; notes: string };

export function parseRequestForm(input: Record<string, unknown>): { ok: true; value: RequestInput } | { ok: false; error: string } {
  const text = (key: string) => String(input[key] ?? '').trim();
  const plan = text('plan');
  if (!isPaidPlan(plan)) return { ok: false, error: 'Choose Pro or Premium.' };
  const months = Number(text('months'));
  if (!Number.isInteger(months) || months < 1 || months > 12) return { ok: false, error: 'Choose between 1 and 12 months.' };
  const reference = text('payment_reference');
  if (reference.length < 3 || reference.length > 120) return { ok: false, error: 'Enter your bank transfer transaction ID (3 to 120 characters).' };
  const notes = text('customer_notes');
  if (notes.length > 1000) return { ok: false, error: 'Notes must be 1,000 characters or fewer.' };
  return { ok: true, value: { plan, months, reference, notes } };
}

/** Admin price input in dollars ("9", "9.50") to minor units. Positive and at most $10,000. */
export function parsePriceToMinor(input: string): number | null {
  const minor = parseMoneyToMinor(input, 'USD');
  return minor !== null && minor > 0 && minor <= 1_000_000 ? minor : null;
}

const DB_ERRORS: Record<string, string> = {
  not_authenticated: 'Please sign in again.',
  not_authorized: 'You do not have permission to do that.',
  request_already_decided: 'That request has already been decided. Refresh the page to see its current state.',
  payment_reference_required: 'A bank transaction ID of at least 3 characters is required.',
  payment_reference_already_used: 'That bank transaction ID has already been used for another subscription.',
  reference_generation_failed: 'Could not create your payment reference. Please try again.',
  invalid_amount: 'Enter an amount above zero.',
  invalid_months: 'Choose between 1 and 12 months.',
  invalid_plan: 'Choose Pro or Premium.',
  reason_required: 'Enter a reason of at least 3 characters.',
  not_found: 'That record could not be found.',
  not_active: 'That subscription is no longer active.',
  overlapping_subscription: 'That would overlap an existing active period.',
  active_subscription_exists: 'This person already has an active subscription on a different plan. Cancel it first to switch plans.',
  history_protected: 'That record is protected and cannot be changed.'
};

/** Maps a Postgres error to plain words. Unknown errors never expose database details. */
export function subscriptionErrorCopy(error: { message?: string; code?: string } | null | undefined): string {
  if (!error) return 'Something went wrong. Please try again.';
  if (error.code === '23505') return 'You already have a request waiting for review. Wait for a decision before sending another.';
  if (error.code === '42P01' || error.code === '42883' || error.code === 'PGRST202' || error.code === 'PGRST205') {
    return 'Manual subscriptions are not set up in the database yet. Run the migration 20261101_manual_subscriptions.sql and try again.';
  }
  const message = error.message ?? '';
  const code = Object.keys(DB_ERRORS).find((key) => message.includes(key));
  return code ? DB_ERRORS[code] : 'Something went wrong. Please try again.';
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID.test(value);
}
