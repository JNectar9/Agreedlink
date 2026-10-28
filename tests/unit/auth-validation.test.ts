import { describe, expect, it } from 'vitest';
import { normalizePhone, parseSignUpForm } from '@/lib/auth-validation';

describe('normalizePhone', () => {
  it('accepts an empty value, and numbers with a country code', () => {
    expect(normalizePhone('')).toBe('');
    expect(normalizePhone('   ')).toBe('');
    expect(normalizePhone('+234 802 986 4569')).toBe('+2348029864569');
    expect(normalizePhone('+1 (415) 555-0100')).toBe('+14155550100');
  });

  it('rejects numbers without a country code or with bad characters', () => {
    expect(normalizePhone('08029864569')).toBeNull();
    expect(normalizePhone('+0123456789')).toBeNull();
    expect(normalizePhone('+23480abc')).toBeNull();
    expect(normalizePhone('+123')).toBeNull();
  });
});

describe('parseSignUpForm', () => {
  const valid = { full_name: 'Ada Obi', email: 'ada@example.com', phone: '', password: 'longenough', agree: 'on' };

  it('accepts a valid form and omits the phone when blank', () => {
    const r = parseSignUpForm(valid);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.phone).toBe('');
  });

  it('keeps a valid phone number in normalized form', () => {
    const r = parseSignUpForm({ ...valid, phone: '+234 802 986 4569' });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.phone).toBe('+2348029864569');
  });

  it('rejects missing name, bad email, bad phone, short password, and an unchecked terms box', () => {
    expect(parseSignUpForm({ ...valid, full_name: '  ' }).ok).toBe(false);
    expect(parseSignUpForm({ ...valid, email: 'nope' }).ok).toBe(false);
    expect(parseSignUpForm({ ...valid, phone: '0802' }).ok).toBe(false);
    expect(parseSignUpForm({ ...valid, password: 'short' }).ok).toBe(false);
    expect(parseSignUpForm({ ...valid, agree: undefined }).ok).toBe(false);
  });
});
