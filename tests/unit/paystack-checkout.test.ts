import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { isPlausibleReference } from '@/lib/paystack';
import { checkoutErrorCopy, formatNgn, initializePaystackTransaction, isPaystackCheckoutUrl, newPaystackReference } from '@/lib/paystack-checkout';

const args = { secret: 'sk_test_x', email: 'a@b.co', amountMinor: 1400000, reference: 'agl_1234567890ab', callbackUrl: 'https://example.com/dashboard/billing/paystack/return', metadata: { plan: 'pro' } };
const respond = (status: number, body: unknown): typeof fetch => (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;
const good = { status: true, data: { authorization_url: 'https://checkout.paystack.com/abc123', access_code: 'abc123', reference: 'agl_1234567890ab' } };

describe('checkout helpers', () => {
  it('makes unique, valid references', () => {
    const a = newPaystackReference();
    expect(a).toMatch(/^agl_[0-9a-f]{24}$/);
    expect(isPlausibleReference(a)).toBe(true);
    expect(newPaystackReference()).not.toBe(a);
  });
  it('only sends the browser to Paystack checkout', () => {
    expect(isPaystackCheckoutUrl('https://checkout.paystack.com/abc')).toBe(true);
    for (const bad of ['http://checkout.paystack.com/abc', 'https://evil.com/checkout.paystack.com', 'https://checkout.paystack.com.evil.com/x', 'javascript:alert(1)', '', null, 5]) {
      expect(isPaystackCheckoutUrl(bad), String(bad)).toBe(false);
    }
  });
  it('formats naira from kobo', () => {
    expect(formatNgn(1400000)).toContain('14,000');
    expect(formatNgn(3600000)).toContain('36,000');
  });
  it('turns database errors into plain words and hides details', () => {
    expect(checkoutErrorCopy({ message: 'manual_subscription_active' })).toContain('bank transfer');
    expect(checkoutErrorCopy({ message: 'paystack_disabled' })).toContain('not available');
    expect(checkoutErrorCopy({ message: 'active_subscription_exists' })).toContain('different tier');
    expect(checkoutErrorCopy({ code: 'PGRST202' })).toContain('not set up');
    expect(checkoutErrorCopy({ message: 'secret stack trace' })).toBe('Something went wrong. Please try again.');
  });
});

describe('initializePaystackTransaction', () => {
  it('returns the Paystack checkout address', async () => {
    expect(await initializePaystackTransaction(args, respond(200, good))).toEqual({ ok: true, authorizationUrl: 'https://checkout.paystack.com/abc123' });
  });
  it('sends the server amount in NGN with the reference and callback', async () => {
    let sent: { amount?: number; currency?: string; reference?: string; callback_url?: string } = {};
    const spy = (async (_url: unknown, init?: RequestInit) => { sent = JSON.parse(String(init?.body)); return new Response(JSON.stringify(good), { status: 200 }); }) as unknown as typeof fetch;
    await initializePaystackTransaction(args, spy);
    expect(sent).toMatchObject({ amount: 1400000, currency: 'NGN', reference: 'agl_1234567890ab', callback_url: args.callbackUrl });
  });
  it('refuses unexpected answers', async () => {
    expect((await initializePaystackTransaction(args, respond(500, {}))).ok).toBe(false);
    expect((await initializePaystackTransaction(args, respond(200, { status: false }))).ok).toBe(false);
    expect((await initializePaystackTransaction(args, respond(200, { ...good, data: { ...good.data, reference: 'other_reference' } }))).ok).toBe(false);
    expect((await initializePaystackTransaction(args, respond(200, { ...good, data: { ...good.data, authorization_url: 'https://evil.com/pay' } }))).ok).toBe(false);
    const boom = (async () => { throw new Error('offline'); }) as unknown as typeof fetch;
    expect((await initializePaystackTransaction(args, boom)).ok).toBe(false);
  });
});

describe('Paystack checkout migration safety checks', () => {
  const sql = readFileSync(join(process.cwd(), 'supabase/migrations/20261106_paystack_checkout.sql'), 'utf8');
  it('lets only the server start a checkout or mark a result', () => {
    expect(sql).toContain('grant execute on function public.paystack_create_transaction(uuid, text, text) to service_role');
    expect(sql).toContain('grant execute on function public.paystack_mark_status(text, text) to service_role');
    expect(sql).not.toMatch(/paystack_(create_transaction|mark_status)[^;]*to (anon|authenticated)/);
  });
  it('copies the amount from server configuration and blocks active manual plans', () => {
    expect(sql).toContain('cfg.price_pro_ngn_minor');
    expect(sql).toContain("raise exception 'manual_subscription_active'");
    expect(sql).toContain("raise exception 'paystack_disabled'");
  });
  it('keeps the existing my_subscription keys and never deletes data', () => {
    for (const key of ["'effective_plan'", "'state'", "'limits'", "'current'", "'last_expired_at'", "'latest_request'", "'history'"]) expect(sql).toContain(key);
    expect(sql).not.toMatch(/\bdelete\s+from\b/i);
    expect(sql).not.toMatch(/\bdrop\s+table\b/i);
    expect(sql).not.toMatch(/\btruncate\b/i);
  });
});
