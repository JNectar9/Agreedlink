import { describe, expect, it } from 'vitest';
import { parseAgreementForm, parseDecision } from '@/lib/validation';

const valid = {
  project_name: 'Logo design', client_name: 'Ada', client_email: '', description: 'A logo', deliverables: 'Logo files',
  start_date: '', delivery_date: '2026-12-01', currency: 'NGN', amount: '150,000.00', included_revisions: '2',
  revision_definition: '', excluded_work: '', additional_work_pricing: 'quote_first', additional_work_price: '', payment_terms_text: ''
};

describe('parseAgreementForm', () => {
  it('accepts a valid agreement and stores integer minor units', () => {
    const r = parseAgreementForm(valid);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.terms.amount_minor).toBe(15000000);
      expect(r.terms.client_email).toBeNull();
      expect(r.terms.included_revisions).toBe(2);
    }
  });

  it('rejects bad dates, amounts, currencies, and date order', () => {
    expect(parseAgreementForm({ ...valid, delivery_date: '2026-02-31' }).ok).toBe(false);
    expect(parseAgreementForm({ ...valid, amount: '12.345' }).ok).toBe(false);
    expect(parseAgreementForm({ ...valid, amount: '0' }).ok).toBe(false);
    expect(parseAgreementForm({ ...valid, currency: 'XYZ' }).ok).toBe(false);
    expect(parseAgreementForm({ ...valid, start_date: '2026-12-05' }).ok).toBe(false);
  });

  it('requires a price for hourly or per-item extra work', () => {
    expect(parseAgreementForm({ ...valid, additional_work_pricing: 'hourly' }).ok).toBe(false);
    expect(parseAgreementForm({ ...valid, additional_work_pricing: 'hourly', additional_work_price: '20' }).ok).toBe(true);
  });

  it('enforces length limits and required text', () => {
    expect(parseAgreementForm({ ...valid, project_name: 'x' }).ok).toBe(false);
    expect(parseAgreementForm({ ...valid, description: 'x'.repeat(4001) }).ok).toBe(false);
    expect(parseAgreementForm({ ...valid, client_email: 'not-an-email' }).ok).toBe(false);
  });
});

describe('parseDecision', () => {
  const allowed = ['approve', 'decline', 'clarify'] as const;

  it('accepts a decision with a name', () => {
    expect(parseDecision({ decision: 'approve', name: 'Ada', email: '', message: '' }, allowed).ok).toBe(true);
  });

  it('requires a name and a known decision', () => {
    expect(parseDecision({ decision: 'approve', name: '  ' }, allowed).ok).toBe(false);
    expect(parseDecision({ decision: 'delete', name: 'Ada' }, allowed).ok).toBe(false);
  });

  it('requires a message when asking for clarification', () => {
    expect(parseDecision({ decision: 'clarify', name: 'Ada', message: '' }, allowed).ok).toBe(false);
    expect(parseDecision({ decision: 'clarify', name: 'Ada', message: 'What is included?' }, allowed).ok).toBe(true);
  });
});
