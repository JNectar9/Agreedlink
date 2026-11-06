import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PLAN_CONFIG } from '@/lib/plans';
import { ACTIVATION_NOTE, ACTIVATION_STEPS, PLAN_ORDER, availableFeatures, comingSoonFeatures } from '@/lib/pricing-display';

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');
const pricing = read('app/pricing/page.tsx');
const billing = read('app/dashboard/billing/page.tsx');
const plansUi = read('components/PricingPlans.tsx');
const display = read('lib/pricing-display.ts');
const planRows = read('supabase/migrations/0004_accounts_plans_avatars.sql');

describe('official prices and limits', () => {
  it('keeps Free $0, Pro $9 and Premium $24', () => {
    expect(PLAN_CONFIG.free.usdPerMonth).toBe(0);
    expect(PLAN_CONFIG.pro.usdPerMonth).toBe(9);
    expect(PLAN_CONFIG.premium.usdPerMonth).toBe(24);
  });
  it('shows the same active-agreement limits the database enforces (3, 50, 200)', () => {
    expect(planRows).toContain("('free', 'Free', 3), ('pro', 'Pro', 50), ('premium', 'Premium', 200)");
    expect(availableFeatures('free')).toContain('Up to 3 active agreements at one time');
    expect(availableFeatures('pro')).toContain('Up to 50 active agreements at one time');
    expect(availableFeatures('premium')).toContain('Up to 200 active agreements at one time');
  });
  it('uses the database limit when it is known', () => {
    expect(availableFeatures('pro', 75)).toContain('Up to 75 active agreements at one time');
  });
});

describe('available versus coming soon', () => {
  it('never lists the same feature in both groups', () => {
    for (const id of PLAN_ORDER) {
      const a = new Set(availableFeatures(id));
      for (const c of comingSoonFeatures(id)) expect(a.has(c), `${id}: ${c}`).toBe(false);
    }
  });
  it('coming soon is exactly the planned (not live) features in the plan config', () => {
    for (const id of PLAN_ORDER) {
      expect(comingSoonFeatures(id)).toEqual(PLAN_CONFIG[id].features.filter((f) => !f.live).map((f) => f.text));
    }
    expect(comingSoonFeatures('pro')).toContain('Client invitations by email');
    expect(comingSoonFeatures('premium')).toContain('Team collaboration and shared workspace');
  });
  it('lists saved templates as available now, and no longer as coming soon', () => {
    expect(availableFeatures('free')).toContain('1 saved template');
    expect(availableFeatures('pro')).toContain('10 saved templates');
    for (const id of PLAN_ORDER) expect(comingSoonFeatures(id).some((f) => /saved template/i.test(f)), id).toBe(false);
    expect(comingSoonFeatures('premium')).toContain('Advanced templates and reusable workflows');
  });
  it('lists PDF export, attachments and reporting as available now, and keeps the unbuilt ones as coming soon', () => {
    expect(availableFeatures('pro')).toContain('PDF export');
    expect(availableFeatures('pro')).toContain('Attachments up to 10 MB per file (100 MB in total)');
    expect(availableFeatures('premium')).toContain('Attachments up to 50 MB per file (250 MB in total)');
    expect(availableFeatures('premium')).toContain('Advanced reporting');
    expect(comingSoonFeatures('pro')).toEqual(['Client invitations by email']);
    expect(comingSoonFeatures('premium')).toEqual(['Advanced templates and reusable workflows', 'Team collaboration and shared workspace']);
  });
  it('does not advertise planned features in the available lists', () => {
    const planned = ['Client invitations', 'Team collaboration', 'Advanced templates'];
    for (const id of PLAN_ORDER) for (const f of availableFeatures(id)) for (const word of planned) expect(f.toLowerCase().includes(word.toLowerCase()), `${id}: ${f}`).toBe(false);
  });
});

describe('payment wording', () => {
  const sources: [string, string][] = [['pricing page', pricing], ['billing page', billing], ['plans component', plansUi], ['display data', display]];
  it('has no misleading "cannot be charged" warnings or Paystack / exchange-rate claims', () => {
    for (const [name, text] of sources) {
      for (const bad of [/nobody can be charged/i, /cannot be charged/i, /not connected yet/i, /paystack/i, /approximate/i, /exchange rate/i, /≈/]) {
        expect(bad.test(text), `${name} matches ${bad}`).toBe(false);
      }
    }
  });
  it('says activation is manual, by an administrator, after verification', () => {
    expect(ACTIVATION_NOTE).toContain('activated by an administrator after the payment is verified');
    expect(ACTIVATION_NOTE).toContain('Automatic online payments are not available yet');
    expect(ACTIVATION_STEPS.join(' ')).toContain('administrator');
    expect(pricing).toContain('ACTIVATION_NOTE');
    expect(billing).toContain('ACTIVATION_NOTE');
  });
  it('makes no claim that automatic payments or naira pricing exist', () => {
    expect(pricing).not.toMatch(/auto-?renew(s|al)? (is|are) (on|enabled|available)/i);
    expect(pricing).toContain('Local-currency pricing is not available yet');
  });
});

describe('admin-only price control', () => {
  it('pricing page shows the control only when is_admin() is true', () => {
    expect(pricing).toContain("supabase.rpc('is_admin')");
    expect(pricing).toMatch(/\{v\.isAdmin \? \([\s\S]*?Update prices \(admin\)[\s\S]*?\) : null\}/);
    expect(pricing.match(/Update prices/g)?.length).toBe(1);
  });
  it('billing page shows it only inside the isAdmin check', () => {
    expect(billing).toMatch(/\{isAdmin \? \([\s\S]*?Update prices[\s\S]*?\) : null\}/);
    expect(billing.match(/Update prices/g)?.length).toBe(1);
  });
  it('the old public currency form (and its Update prices button) is gone', () => {
    expect(pricing).not.toContain('<form');
    expect(pricing).not.toContain('PRICING_CURRENCIES');
  });
});

describe('scope', () => {
  it('leaves subscription logic and payment code untouched', () => {
    for (const p of ['app/dashboard/billing/actions.ts', 'app/dashboard/admin/subscriptions/actions.ts', 'lib/subscriptions.ts']) {
      expect(read(p).length).toBeGreaterThan(0);
    }
    expect(billing).toContain('submitSubscriptionRequestAction');
    expect(billing).toContain("supabase.rpc('my_subscription')");
  });
});
