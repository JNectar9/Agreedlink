// Pure helpers for the Paystack webhook. No secrets are stored here: the secret key is passed in by the caller
// from the server environment (PAYSTACK_SECRET_KEY).
import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Paystack signs the RAW request body with HMAC SHA-512 using your secret key and sends the hex digest in the
 * x-paystack-signature header. The comparison is constant-time and never throws on a malformed header.
 */
export function isValidPaystackSignature(rawBody: Buffer | string, signature: string | null | undefined, secret: string): boolean {
  if (!secret || !signature) return false;
  const expected = Buffer.from(createHmac('sha512', secret).update(rawBody).digest('hex'), 'utf8');
  const given = Buffer.from(signature.trim().toLowerCase(), 'utf8');
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** One key per event and transaction, so a repeated delivery is recognised. */
export function chargeEventKey(eventType: string, reference: string): string {
  return `${eventType}:${reference}`;
}

/** Reference strings come from the request body, so accept only a sensible shape. */
export function isPlausibleReference(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9._=-]{8,100}$/.test(value);
}

/** Which Paystack mode a secret key belongs to. Mode is decided by the key itself, never by a database flag. */
export function paystackMode(secret: string | undefined): 'live' | 'test' | 'unknown' {
  if (!secret) return 'unknown';
  if (secret.startsWith('sk_live_')) return 'live';
  if (secret.startsWith('sk_test_')) return 'test';
  return 'unknown';
}

export type PaystackVerifyData = {
  id: number | string;
  status: string;
  reference: string;
  amount: number;
  currency: string;
  channel?: string | null;
  customer?: { customer_code?: string | null } | null;
};

export type VerifyResult =
  | { ok: true; data: PaystackVerifyData }
  | { ok: false; transient: boolean; message: string };

/**
 * Asks Paystack directly whether a transaction was paid. A webhook body is never trusted on its own.
 * transient = true means "try again later" (network error, timeout, 429, 5xx), so the webhook should return an
 * error and let Paystack retry. transient = false means Paystack gave a definite negative answer.
 */
export async function verifyPaystackTransaction(
  reference: string,
  secret: string,
  fetchImpl: typeof fetch = fetch,
  timeoutMs = 10_000
): Promise<VerifyResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${secret}` },
      cache: 'no-store',
      signal: controller.signal
    });
    if (res.status === 429 || res.status >= 500) return { ok: false, transient: true, message: `Paystack HTTP ${res.status}` };
    if (!res.ok) return { ok: false, transient: false, message: `Paystack HTTP ${res.status}` };
    const body = (await res.json()) as { status?: boolean; data?: PaystackVerifyData | null };
    if (!body?.status || !body.data) return { ok: false, transient: false, message: 'Paystack returned no transaction' };
    return { ok: true, data: body.data };
  } catch (err) {
    return { ok: false, transient: true, message: err instanceof Error ? err.message.slice(0, 200) : 'Network error' };
  } finally {
    clearTimeout(timer);
  }
}
