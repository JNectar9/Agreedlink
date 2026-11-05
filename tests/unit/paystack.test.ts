import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { chargeEventKey, isPlausibleReference, isValidPaystackSignature, paystackMode, verifyPaystackTransaction } from '@/lib/paystack';

const SECRET = 'sk_test_unit_test_secret';
const sign = (body: string, secret = SECRET) => createHmac('sha512', secret).update(body).digest('hex');
const BODY = JSON.stringify({ event: 'charge.success', data: { reference: 'agl_1234567890', amount: 1400000 } });

describe('webhook signature', () => {
  it('accepts a correct HMAC SHA-512 signature of the raw body', () => {
    expect(isValidPaystackSignature(BODY, sign(BODY), SECRET)).toBe(true);
    expect(isValidPaystackSignature(Buffer.from(BODY), sign(BODY), SECRET)).toBe(true);
  });
  it('rejects a changed body, a wrong secret, and a missing or malformed signature', () => {
    expect(isValidPaystackSignature(BODY.replace('1400000', '100'), sign(BODY), SECRET)).toBe(false);
    expect(isValidPaystackSignature(BODY, sign(BODY, 'sk_test_other'), SECRET)).toBe(false);
    expect(isValidPaystackSignature(BODY, null, SECRET)).toBe(false);
    expect(isValidPaystackSignature(BODY, '', SECRET)).toBe(false);
    expect(isValidPaystackSignature(BODY, 'abc', SECRET)).toBe(false);
    expect(isValidPaystackSignature(BODY, sign(BODY), '')).toBe(false);
  });
});

describe('event key, reference and mode', () => {
  it('builds one key per event and reference', () => {
    expect(chargeEventKey('charge.success', 'agl_1234567890')).toBe('charge.success:agl_1234567890');
  });
  it('accepts only sensible references', () => {
    expect(isPlausibleReference('agl_1234567890')).toBe(true);
    for (const bad of ['', 'short', 'has space 12345', 'x'.repeat(101), 42, null, undefined, "a'; drop table--"]) expect(isPlausibleReference(bad), String(bad)).toBe(false);
  });
  it('reads the mode from the key prefix', () => {
    expect(paystackMode('sk_live_abc')).toBe('live');
    expect(paystackMode('sk_test_abc')).toBe('test');
    expect(paystackMode('abc')).toBe('unknown');
    expect(paystackMode(undefined)).toBe('unknown');
  });
});

describe('verifyPaystackTransaction', () => {
  const respond = (status: number, body: unknown): typeof fetch => (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;
  const ok = { status: true, data: { id: 1, status: 'success', reference: 'agl_1234567890', amount: 1400000, currency: 'NGN' } };

  it('returns the transaction when Paystack confirms it', async () => {
    const r = await verifyPaystackTransaction('agl_1234567890', SECRET, respond(200, ok));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.amount).toBe(1400000);
  });
  it('treats 5xx, 429 and network errors as transient (Paystack should retry)', async () => {
    for (const status of [500, 503, 429]) {
      const r = await verifyPaystackTransaction('agl_1234567890', SECRET, respond(status, {}));
      expect(r).toMatchObject({ ok: false, transient: true });
    }
    const boom = (async () => { throw new Error('network down'); }) as unknown as typeof fetch;
    expect(await verifyPaystackTransaction('agl_1234567890', SECRET, boom)).toMatchObject({ ok: false, transient: true });
  });
  it('treats a definite negative answer as final', async () => {
    expect(await verifyPaystackTransaction('agl_1234567890', SECRET, respond(404, {}))).toMatchObject({ ok: false, transient: false });
    expect(await verifyPaystackTransaction('agl_1234567890', SECRET, respond(200, { status: false }))).toMatchObject({ ok: false, transient: false });
  });
});

describe('Paystack migration safety checks', () => {
  const sql = readFileSync(join(process.cwd(), 'supabase/migrations/20261105_paystack_payments.sql'), 'utf8');

  it('keeps payment tables behind row level security', () => {
    for (const table of ['paystack_transactions', 'paystack_webhook_events']) {
      expect(sql).toContain(`alter table public.${table} enable row level security`);
      expect(sql).toContain(`revoke all on public.${table} from anon, authenticated`);
    }
    expect(sql).toMatch(/create policy paystack_transactions_select_own[\s\S]*user_id = auth\.uid\(\)/);
    expect(sql).not.toMatch(/grant (insert|update|delete)[^;]*paystack_/i);
  });
  it('lets only the server activate a payment', () => {
    expect(sql).toContain('grant execute on function public.paystack_activate(text, bigint, text, text, text, text) to service_role');
    expect(sql).not.toMatch(/paystack_activate[^;]*to (anon|authenticated)/);
  });
  it('is idempotent and checks the stored amount', () => {
    expect(sql).toContain('for update');
    expect(sql).toContain("return 'already_processed'");
    expect(sql).toContain('t.amount_minor::bigint <> p_amount_minor');
    expect(sql).toContain("'amount_mismatch'");
    expect(sql).toContain('event_key text not null unique');
  });
  it('reuses the existing subscriptions table and never deletes data', () => {
    expect(sql).toContain('insert into public.subscriptions');
    expect(sql).not.toMatch(/create table (if not exists )?public\.subscriptions\b/i);
    expect(sql).not.toMatch(/\bdelete\s+from\b/i);
    expect(sql).not.toMatch(/\bdrop\s+table\b/i);
    expect(sql).not.toMatch(/\btruncate\b/i);
  });
});
