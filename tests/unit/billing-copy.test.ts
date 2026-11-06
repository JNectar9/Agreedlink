import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { nairaShort, ngnPricesFromConfig } from '@/lib/pricing-format';

// Guards the Billing page and Dashboard wording so it matches the homepage: naira prices, two honest ways to pay.
const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');
const billing = read('app/dashboard/billing/page.tsx');
const dashboard = read('app/dashboard/page.tsx');
const plansUi = read('components/PricingPlans.tsx');

describe('billing and dashboard wording', () => {
  it('no longer says online payment is unavailable or that prices are in US dollars only', () => {
    for (const [name, text] of [['billing', billing], ['dashboard', dashboard], ['plans component', plansUi]] as const) {
      expect(text, name).not.toMatch(/automatic online payments are not available/i);
      expect(text, name).not.toMatch(/online payment is not available yet/i);
      expect(text, name).not.toMatch(/US dollars only/i);
    }
  });
  it('explains both ways to pay, with the bank transfer in naira', () => {
    expect(billing).toContain("showCard ? 'You have 2 ways to pay:'");
    expect(billing).toContain('Pay by bank transfer in naira');
    expect(billing).toContain('to the Zenith account shown on this page');
    expect(billing).toContain('Admin verifies and activates your plan. Nothing changes until it is approved.');
  });
  it('card payment is only described while it is switched on', () => {
    expect(billing).toMatch(/\{showCard \? \(\s*<p><strong>A\) Pay by card/);
    expect(dashboard).toContain('cardOn ?');
  });
  it('shows naira in the plan cards and the request form, from the configured prices', () => {
    expect(billing).toContain('ngnPrices={ngn}');
    expect(billing).toContain('Pro ({nairaShort(ngn.pro)}/month)');
    expect(billing).toContain('Premium ({nairaShort(ngn.premium)}/month)');
    expect(plansUi).toContain('nairaShort(naira)');
  });
  it('leaves the /pricing page behaviour alone: no naira props are passed there', () => {
    expect(read('app/pricing/page.tsx')).not.toContain('ngnPrices');
  });
  it('reads naira prices from the public config, with the agreed fallback', () => {
    expect(ngnPricesFromConfig({ ngn_prices: { pro: 1500000, premium: 3800000 } })).toEqual({ pro: 1500000, premium: 3800000 });
    expect(ngnPricesFromConfig(null)).toEqual({ pro: 1400000, premium: 3600000 });
    expect(ngnPricesFromConfig({ ngn_prices: { pro: 'x', premium: -1 } })).toEqual({ pro: 1400000, premium: 3600000 });
    expect(nairaShort(ngnPricesFromConfig(null).pro * 3)).toBe('₦42,000');
  });
});
