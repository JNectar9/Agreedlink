import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PLAN_CONFIG, PLAN_ORDER, approxNaira, formatNaira, isPlanId, priceFor } from '@/lib/plans';

describe('official plans', () => {
  it('has the agreed prices and active agreement limits', () => {
    expect(PLAN_CONFIG.free.usdPerMonth).toBe(0);
    expect(PLAN_CONFIG.pro.usdPerMonth).toBe(9);
    expect(PLAN_CONFIG.premium.usdPerMonth).toBe(24);
    expect(PLAN_ORDER.map((id) => PLAN_CONFIG[id].activeAgreements)).toEqual([3, 50, 200]);
  });

  it('computes the approximate naira ranges from the exchange-rate range', () => {
    expect(approxNaira(9)).toEqual({ low: 11700, high: 12600 });
    expect(approxNaira(24)).toEqual({ low: 31200, high: 33600 });
    expect(formatNaira(11700)).toBe('₦11,700');
  });

  it('recognises only real plan ids', () => {
    expect(isPlanId('pro')).toBe(true);
    expect(isPlanId('enterprise')).toBe(false);
    expect(isPlanId(null)).toBe(false);
  });

  it('never marks an unbuilt feature as live', () => {
    const unbuilt = ['saved template', 'Attachments', 'PDF export', 'storage', 'Team collaboration', 'Advanced', 'invitations by email'];
    for (const plan of Object.values(PLAN_CONFIG)) {
      for (const feature of plan.features) {
        if (unbuilt.some((word) => feature.text.includes(word))) expect(feature.live, feature.text).toBe(false);
      }
    }
  });

  it('matches the limits enforced by the database migration', () => {
    const sql = readFileSync(join(process.cwd(), 'supabase/migrations/0004_accounts_plans_avatars.sql'), 'utf8');
    for (const id of PLAN_ORDER) {
      const row = new RegExp(`\\('${id}', '${PLAN_CONFIG[id].name}', ${PLAN_CONFIG[id].activeAgreements}\\)`);
      expect(sql, `${id} limit in SQL`).toMatch(row);
    }
  });
});

describe('prices in the chosen currency', () => {
  it('shows the confirmed USD price', () => {
    expect(priceFor('pro', 'USD').headline).toBe('$9/month');
    expect(priceFor('premium', 'USD').headline).toBe('$24/month');
  });

  it('shows only an approximate range for naira until a fixed price is confirmed', () => {
    const pro = priceFor('pro', 'NGN');
    expect(pro.headline).toContain('₦11,700');
    expect(pro.headline).toContain('₦12,600');
    expect(pro.headline.startsWith('≈')).toBe(true);
    expect(pro.note).toContain('confirmed before checkout');
    expect(priceFor('premium', 'NGN').headline).toContain('₦33,600');
  });

  it('never invents a price for an unconfirmed currency', () => {
    const gbp = priceFor('pro', 'GBP');
    expect(gbp.headline).toBe('$9/month');
    expect(gbp.note).toContain('has not been confirmed');
    expect(gbp.note).toContain('nothing is converted');
  });

  it('shows the free plan as zero in any currency', () => {
    expect(priceFor('free', 'USD').headline).toBe('$0/month');
    expect(priceFor('free', 'NGN').headline).toBe('₦0/month');
  });
});
