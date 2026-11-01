import { describe, expect, it } from 'vitest';
import { describeIdentity } from '@/lib/identity';
import { customerVerification, PHONE_STATUS, safeSearchTerm } from '@/lib/customers';
import { buildChangeShareMessage } from '@/lib/share-change';

describe('describeIdentity', () => {
  it('never calls a typed name on a link verified', () => {
    const r = describeIdentity({ auth_method: 'secure_link', approved_by_name: 'Ada' });
    expect(r.verified).toBe(false);
    expect(r.detail).toContain('not verified');
    expect(describeIdentity({}).verified).toBe(false);
  });

  it('shows verified only for a signed-in confirmed email that matches the client email', () => {
    expect(describeIdentity({ auth_method: 'account', verified_email: 'ada@example.com', email_matches_customer: true }).verified).toBe(true);
    expect(describeIdentity({ auth_method: 'account', verified_email: 'other@example.com', email_matches_customer: false }).verified).toBe(false);
    expect(describeIdentity({ auth_method: 'account', verified_email: 'ada@example.com', email_matches_customer: null }).verified).toBe(false);
  });

  it('does not treat the account method as verified without an email', () => {
    expect(describeIdentity({ auth_method: 'account', verified_email: null, email_matches_customer: true }).verified).toBe(false);
  });
});

describe('customerVerification', () => {
  it('is verified only after the email was confirmed and claimed', () => {
    expect(customerVerification({ email: 'a@b.co', claimed_by: 'u1', email_verified_at: '2026-10-01T00:00:00Z' }).verified).toBe(true);
    expect(customerVerification({ email: 'a@b.co', claimed_by: null, email_verified_at: null }).verified).toBe(false);
    expect(customerVerification({ email: null, claimed_by: 'u1', email_verified_at: '2026-10-01T00:00:00Z' }).verified).toBe(false);
  });

  it('never marks a phone number as verified', () => {
    expect(PHONE_STATUS).toContain('not verified');
  });
});

describe('safeSearchTerm', () => {
  it('removes characters that could alter a search filter', () => {
    expect(safeSearchTerm('ada,email.eq.x)(')).toBe('ada email.eq.x');
    expect(safeSearchTerm("  O'Brien  ")).toBe('O Brien');
    expect(safeSearchTerm(undefined)).toBe('');
    expect(safeSearchTerm('x'.repeat(200)).length).toBe(80);
  });
});

describe('buildChangeShareMessage', () => {
  it('states the cost change, the deadline, and that nothing changes until a decision', () => {
    const msg = buildChangeShareMessage({
      creator: 'JNectar', project: 'Logo', url: 'https://example.com/a/token', currency: 'USD', currentMinor: 15000, newMinor: 17500,
      deltaMinor: 2500, currentDate: '2026-12-01', newDate: '2026-12-10', description: 'Add icons'
    });
    expect(msg).toContain('$150.00 to $175.00');
    expect(msg).toContain('+$25.00');
    expect(msg).toContain('December 10, 2026');
    expect(msg).toContain('Nothing changes until you decide');
    expect(msg).toContain('https://example.com/a/token');
  });
});
