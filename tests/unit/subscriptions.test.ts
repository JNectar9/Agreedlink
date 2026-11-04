import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { isUuid, parsePriceToMinor, parseRequestForm, subscriptionErrorCopy, usdShort } from '@/lib/subscriptions';

const migration = readFileSync(join(process.cwd(), 'supabase/migrations/20261101_manual_subscriptions.sql'), 'utf8');

describe('subscription request form', () => {
  const base = { plan: 'pro', months: '3', payment_reference: 'TRX-12345', customer_notes: ' paid today ' };

  it('accepts a valid request and trims text', () => {
    const r = parseRequestForm(base);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toEqual({ plan: 'pro', months: 3, reference: 'TRX-12345', notes: 'paid today' });
  });

  it('only allows the paid plans', () => {
    expect(parseRequestForm({ ...base, plan: 'free' }).ok).toBe(false);
    expect(parseRequestForm({ ...base, plan: 'enterprise' }).ok).toBe(false);
  });

  it('keeps months between 1 and 12', () => {
    for (const months of ['0', '13', '1.5', 'abc', '']) expect(parseRequestForm({ ...base, months }).ok, months).toBe(false);
    expect(parseRequestForm({ ...base, months: '12' }).ok).toBe(true);
  });

  it('requires a payment reference of 3 to 120 characters', () => {
    expect(parseRequestForm({ ...base, payment_reference: 'ab' }).ok).toBe(false);
    expect(parseRequestForm({ ...base, payment_reference: 'x'.repeat(121) }).ok).toBe(false);
  });

  it('limits notes to 1000 characters', () => {
    expect(parseRequestForm({ ...base, customer_notes: 'x'.repeat(1001) }).ok).toBe(false);
  });
});

describe('admin price input', () => {
  it('converts dollars to minor units', () => {
    expect(parsePriceToMinor('9')).toBe(900);
    expect(parsePriceToMinor('24.50')).toBe(2450);
  });
  it('rejects zero, negatives, extra decimals and huge values', () => {
    for (const v of ['0', '-5', '9.999', 'abc', '', '10001']) expect(parsePriceToMinor(v), v).toBeNull();
  });
});

describe('display helpers', () => {
  it('shows whole dollars without cents', () => {
    expect(usdShort(900)).toBe('$9');
    expect(usdShort(2400)).toBe('$24');
    expect(usdShort(950)).toBe('$9.50');
  });
  it('recognises uuids only', () => {
    expect(isUuid('3f2b8a52-6c1e-4a57-9d2b-0c1f5d9a7e11')).toBe(true);
    expect(isUuid('not-a-uuid')).toBe(false);
  });
});

describe('database error copy', () => {
  it('maps known codes and hides unknown details', () => {
    expect(subscriptionErrorCopy({ message: 'payment_reference_already_used' })).toContain('already been used');
    expect(subscriptionErrorCopy({ message: 'select * from secret_table failed' })).toBe('Something went wrong. Please try again.');
  });
  it('explains a duplicate pending request and a missing migration', () => {
    expect(subscriptionErrorCopy({ code: '23505' })).toContain('waiting for review');
    expect(subscriptionErrorCopy({ code: 'PGRST202' })).toContain('20261101_manual_subscriptions.sql');
  });
});

describe('pages only call functions that exist in the migration', () => {
  const calls = ['my_subscription', 'subscription_public_config', 'is_admin', 'admin_list_requests', 'admin_user_subscriptions', 'admin_approve_request',
    'admin_reject_request', 'admin_renew_subscription', 'admin_cancel_subscription', 'admin_grant_complimentary', 'admin_update_subscription_config'];
  for (const name of calls) {
    it(`${name} is defined and granted to signed-in users`, () => {
      expect(migration).toContain(`create or replace function public.${name}(`);
      expect(migration).toMatch(new RegExp(`grant execute on function public\\.${name}\\(.*\\) to authenticated`));
    });
  }
});
