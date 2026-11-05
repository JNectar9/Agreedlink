// Helpers for starting a Paystack card checkout. Server use only: the secret key is passed in by the caller.
import { randomBytes } from 'node:crypto';
import { formatMinor } from './money';

export type PaystackConfigExtras = { paystack_enabled?: boolean; ngn_prices?: { pro: number; premium: number } };

export type PaystackBillingExtras = {
  paystack?: { plan: 'pro' | 'premium'; current_period_end: string | null } | null;
  paystack_payments?: { plan: 'pro' | 'premium'; amount_minor: number; currency: string; paid_at: string; period_start: string; period_end: string }[];
};

/** A new, hard-to-guess transaction reference, for example agl_3f9a... (28 characters). */
export function newPaystackReference(): string {
  return `agl_${randomBytes(12).toString('hex')}`;
}

/** The browser is only ever sent to Paystack's own checkout address. */
export function isPaystackCheckoutUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'checkout.paystack.com';
  } catch {
    return false;
  }
}

/** Naira amounts come from kobo: 1400000 -> the naira sign and 14,000.00 */
export function formatNgn(minor: number): string {
  return formatMinor(minor, 'NGN');
}

const CHECKOUT_ERRORS: Record<string, string> = {
  paystack_disabled: 'Card payments are not available right now. Please use bank transfer or contact support.',
  manual_subscription_active: 'You already have an active plan paid by bank transfer. Card payment opens when it ends.',
  active_subscription_exists: 'You already have an active plan on a different tier paid by card. Wait until it ends to switch plans, or contact support.',
  invalid_plan: 'Choose Pro or Premium.',
  not_found: 'We could not find your account. Please sign in again.'
};

export function checkoutErrorCopy(error: { message?: string; code?: string } | null | undefined): string {
  if (!error) return 'Something went wrong. Please try again.';
  if (error.code === '42883' || error.code === 'PGRST202' || error.code === '42P01' || error.code === 'PGRST205') {
    return 'Card payments are not set up in the database yet. Please contact support.';
  }
  const message = error.message ?? '';
  const code = Object.keys(CHECKOUT_ERRORS).find((key) => message.includes(key));
  return code ? CHECKOUT_ERRORS[code] : 'Something went wrong. Please try again.';
}

export type InitializeResult = { ok: true; authorizationUrl: string } | { ok: false; message: string };

/** Creates the Paystack transaction. The amount is the server-side NGN price in kobo. */
export async function initializePaystackTransaction(
  args: {
    secret: string;
    email: string;
    amountMinor: number;
    reference: string;
    callbackUrl: string;
    metadata: Record<string, string>;
  },
  fetchImpl: typeof fetch = fetch,
  timeoutMs = 15_000
): Promise<InitializeResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: { Authorization: `Bearer ${args.secret}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: args.email,
        amount: args.amountMinor,
        currency: 'NGN',
        reference: args.reference,
        callback_url: args.callbackUrl,
        metadata: args.metadata
      }),
      cache: 'no-store',
      signal: controller.signal
    });
    if (!res.ok) return { ok: false, message: `Paystack HTTP ${res.status}` };
    const body = (await res.json()) as { status?: boolean; data?: { authorization_url?: string; reference?: string } | null };
    const url = body?.data?.authorization_url;
    if (!body?.status || body.data?.reference !== args.reference || !isPaystackCheckoutUrl(url)) {
      return { ok: false, message: 'Paystack returned an unexpected answer' };
    }
    return { ok: true, authorizationUrl: url };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message.slice(0, 200) : 'Network error' };
  } finally {
    clearTimeout(timer);
  }
}
