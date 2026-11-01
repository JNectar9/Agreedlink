import { describe, expect, it } from 'vitest';
import { computeRevisedTotal, parseChangeProposal, parsePriceDelta } from '@/lib/change-request';
import type { Terms } from '@/lib/terms';

const current: Terms = {
  project_name: 'Logo', client_name: 'Ada', client_email: null, description: 'd', deliverables: 'Logo files',
  start_date: null, delivery_date: '2026-12-01', currency: 'NGN', amount_minor: 15000000, included_revisions: 2,
  revision_definition: '', excluded_work: '', additional_work_pricing: 'quote_first', additional_work_price_minor: null,
  payment_terms_text: ''
};

const base = { description: 'Add icons', reason: 'Client asked', price_mode: 'add', price_amount: '25,000.50', new_delivery_date: '2026-12-10', new_included_revisions: '2', deliverables: 'Logo files', excluded_work: '', notes_for_customer: '', idempotency_key: 'abc' };

describe('price change', () => {
  it('turns additional cost into a positive change and a reduction into a negative one', () => {
    expect(parsePriceDelta('add', '250.00', 'USD')).toEqual({ ok: true, delta: 25000 });
    expect(parsePriceDelta('reduce', '250.00', 'USD')).toEqual({ ok: true, delta: -25000 });
    expect(parsePriceDelta('none', '', 'USD')).toEqual({ ok: true, delta: 0 });
  });

  it('rejects zero, negative, or over-precise amounts', () => {
    for (const bad of ['', '0', '-5', '1.234', 'abc']) expect(parsePriceDelta('add', bad, 'USD').ok).toBe(false);
    expect(parsePriceDelta('sideways', '5', 'USD').ok).toBe(false);
  });

  it('respects currencies without decimals', () => {
    expect(parsePriceDelta('add', '1500', 'JPY')).toEqual({ ok: true, delta: 1500 });
    expect(parsePriceDelta('add', '1.5', 'JPY').ok).toBe(false);
  });
});

describe('revised total', () => {
  it('adds exactly, with integers', () => {
    expect(computeRevisedTotal(15000000, 2500050)).toEqual({ ok: true, total: 17500050 });
    expect(computeRevisedTotal(10, 20)).toEqual({ ok: true, total: 30 });
    expect(computeRevisedTotal(15000000, -5000000)).toEqual({ ok: true, total: 10000000 });
  });

  it('never allows a total of zero or below', () => {
    expect(computeRevisedTotal(1000, -1000).ok).toBe(false);
    expect(computeRevisedTotal(1000, -5000).ok).toBe(false);
  });
});

describe('parseChangeProposal', () => {
  it('builds the proposed terms and keeps the current terms untouched', () => {
    const r = parseChangeProposal(base, current);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.delta).toBe(2500050);
      expect(r.proposed.amount_minor).toBe(17500050);
      expect(r.proposed.delivery_date).toBe('2026-12-10');
      expect(r.idempotencyKey).toBe('abc');
      expect(current.amount_minor).toBe(15000000);
    }
  });

  it('accepts a reduction', () => {
    const r = parseChangeProposal({ ...base, price_mode: 'reduce', price_amount: '10,000' }, current);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.proposed.amount_minor).toBe(14000000);
  });

  it('accepts a deadline-only change', () => {
    const r = parseChangeProposal({ ...base, price_mode: 'none', price_amount: '' }, current);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.delta).toBe(0);
  });

  it('rejects a proposal that changes nothing', () => {
    expect(parseChangeProposal({ ...base, price_mode: 'none', new_delivery_date: '2026-12-01' }, current).ok).toBe(false);
  });

  it('rejects missing text, bad dates, and a reduction that wipes out the price', () => {
    expect(parseChangeProposal({ ...base, description: '' }, current).ok).toBe(false);
    expect(parseChangeProposal({ ...base, reason: '' }, current).ok).toBe(false);
    expect(parseChangeProposal({ ...base, new_delivery_date: '2026-02-31' }, current).ok).toBe(false);
    expect(parseChangeProposal({ ...base, price_mode: 'reduce', price_amount: '150,000' }, current).ok).toBe(false);
  });
});
