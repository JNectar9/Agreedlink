// Official plan definitions. The agreement limits here are mirrored in the database (table
// public.plans, migration 0004) which is what actually enforces them. A unit test keeps the two in sync.
import { currencyDisplayMode, currencyExponent } from './money';

export type PlanId = 'free' | 'pro' | 'premium';
export type PlanFeature = { text: string; live: boolean };
export type PlanConfig = { id: PlanId; name: string; usdPerMonth: number; activeAgreements: number; features: PlanFeature[] };

export const PLAN_ORDER: PlanId[] = ['free', 'pro', 'premium'];

export const PLAN_CONFIG: Record<PlanId, PlanConfig> = {
  free: {
    id: 'free',
    name: 'Free',
    usdPerMonth: 0,
    activeAgreements: 3,
    features: [
      { text: 'Up to 3 active agreements at one time', live: true },
      { text: 'Basic agreement tracking', live: true },
      { text: 'Standard support', live: true },
      { text: '1 saved template', live: false }
    ]
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    usdPerMonth: 9,
    activeAgreements: 50,
    features: [
      { text: 'Everything in Free', live: true },
      { text: 'Up to 50 active agreements at one time', live: true },
      { text: 'Customer approval links and approval workflow', live: true },
      { text: 'Agreement history and tracking', live: true },
      { text: '10 saved templates', live: false },
      { text: 'Attachments up to 10 MB per file', live: false },
      { text: 'PDF export', live: false },
      { text: 'Client invitations by email', live: false }
    ]
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    usdPerMonth: 24,
    activeAgreements: 200,
    features: [
      { text: 'Everything in Pro', live: true },
      { text: 'Up to 200 active agreements at one time', live: true },
      { text: 'Priority support', live: true },
      { text: 'Advanced templates and reusable workflows', live: false },
      { text: 'Advanced reporting and activity history', live: false },
      { text: 'Attachments up to 100 MB per file', live: false },
      { text: '2 GB total storage per account', live: false },
      { text: 'Team collaboration and shared workspace', live: false }
    ]
  }
};

export function isPlanId(value: unknown): value is PlanId {
  return value === 'free' || value === 'pro' || value === 'premium';
}

/** Naira shown next to the dollar price is an approximation from a configurable exchange-rate range. */
export function approxNaira(usd: number, low = 1300, high = 1400): { low: number; high: number } {
  return { low: Math.round(usd * low), high: Math.round(usd * high) };
}

export function formatNaira(amount: number): string {
  return `₦${amount.toLocaleString('en-NG')}`;
}

export function rateRange(): { low: number; high: number } {
  const low = Number(process.env.NEXT_PUBLIC_NGN_RATE_LOW ?? 1300);
  const high = Number(process.env.NEXT_PUBLIC_NGN_RATE_HIGH ?? 1400);
  return { low: Number.isFinite(low) && low > 0 ? low : 1300, high: Number.isFinite(high) && high > 0 ? high : 1400 };
}

/**
 * Confirmed subscription prices, in minor units, per currency. Only prices that JNectar has confirmed belong here.
 * Today that is USD only. Add a currency (for example NGN: 1200000 for N12,000) only when that exact price is
 * confirmed and set up for payment. No exchange rate is ever applied automatically.
 */
export const CONFIRMED_PRICES: Record<PlanId, Record<string, number>> = {
  free: {},
  pro: { USD: 900 },
  premium: { USD: 2400 }
};

/** Currencies offered in the pricing page selector. */
export const PRICING_CURRENCIES = ['USD', 'NGN', 'GBP', 'EUR'];

function formatWhole(minor: number, currency: string): string {
  const exponent = currencyExponent(currency);
  const whole = minor % 10 ** exponent === 0;
  return new Intl.NumberFormat('en', { style: 'currency', currency, currencyDisplay: currencyDisplayMode(currency), minimumFractionDigits: whole ? 0 : exponent, maximumFractionDigits: whole ? 0 : exponent }).format(minor / 10 ** exponent);
}

/** What to show for a plan in the chosen currency, without inventing any exchange rate. */
export function priceFor(id: PlanId, currency: string, rates = rateRange()): { headline: string; note: string } {
  const cur = currency.toUpperCase();
  if (id === 'free') return { headline: `${formatWhole(0, cur)}/month`, note: 'Free to start, no card needed.' };
  const confirmed = CONFIRMED_PRICES[id][cur];
  if (confirmed !== undefined) return { headline: `${formatWhole(confirmed, cur)}/month`, note: `Confirmed price in ${cur}.` };
  const usd = CONFIRMED_PRICES[id].USD;
  if (cur === 'NGN') {
    const n = approxNaira(usd / 100, rates.low, rates.high);
    return {
      headline: `≈ ${formatNaira(n.low)}–${formatNaira(n.high)}/month`,
      note: `Approximate, using ₦${rates.low.toLocaleString('en-NG')}–₦${rates.high.toLocaleString('en-NG')} per dollar. The base price is ${formatWhole(usd, 'USD')}/month, and the exact naira amount will be confirmed before checkout.`
    };
  }
  return { headline: `${formatWhole(usd, 'USD')}/month`, note: `Priced in US dollars. A fixed ${cur} price has not been confirmed, so no ${cur} amount is shown and nothing is converted.` };
}
