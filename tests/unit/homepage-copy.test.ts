import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Guards the homepage wording: bank transfer is naira-only, and nothing unbuilt is labelled on the pricing cards.
const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');
const files = ['app/page.tsx', 'components/HomePricing.tsx'];

describe('homepage wording', () => {
  it('never mentions paying manually in US dollars', () => {
    for (const f of files) expect(read(f), f).not.toMatch(/us dollars/i);
  });
  it('states the naira bank transfer instructions, with the configured prices', () => {
    const src = read('components/HomePricing.tsx');
    expect(src).toContain('Pay by bank transfer in Naira to the Zenith account shown on the Billing page.');
    expect(src).toContain('Pro is {nairaShort(ngnMinor.pro)}, Premium is {nairaShort(ngnMinor.premium)}.');
    expect(src).toContain('Send your payment reference. Admin verifies and activates your plan. Nothing changes until it is approved.');
  });
  it('shows no coming-soon badge on the pricing cards and no invented social proof', () => {
    expect(read('components/HomePricing.tsx')).not.toMatch(/coming soon/i);
    for (const f of files) expect(read(f), f).not.toMatch(/join thousands|trusted by/i);
  });
  it('keeps the card payment box tied to the Paystack switch', () => {
    expect(read('components/HomePricing.tsx')).toMatch(/\{paystackEnabled \? \(/);
  });
});
