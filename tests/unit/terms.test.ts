import { describe, expect, it } from 'vitest';
import { compareTerms, priceDifference, type Terms } from '@/lib/terms';

const base: Terms = {
  project_name: 'Logo', client_name: 'Ada', client_email: null, description: 'd', deliverables: 'Logo',
  start_date: null, delivery_date: '2026-12-01', currency: 'USD', amount_minor: 100000, included_revisions: 2,
  revision_definition: '', excluded_work: '', additional_work_pricing: 'quote_first', additional_work_price_minor: null,
  payment_terms_text: ''
};

describe('compareTerms', () => {
  it('flags only the rows that changed', () => {
    const rows = compareTerms(base, { ...base, amount_minor: 125000, deliverables: 'Logo and icons' });
    const changed = rows.filter((r) => r.changed).map((r) => r.key);
    expect(changed).toEqual(['price', 'deliverables']);
  });

  it('reports no changes for identical terms', () => {
    expect(compareTerms(base, { ...base }).every((r) => !r.changed)).toBe(true);
  });

  it('describes the price difference with a sign', () => {
    expect(priceDifference(base, { ...base, amount_minor: 125000 })).toContain('250.00');
    expect(priceDifference(base, { ...base, amount_minor: 125000 }).startsWith('+')).toBe(true);
    expect(priceDifference(base, { ...base, amount_minor: 90000 }).startsWith('-')).toBe(true);
  });
});
