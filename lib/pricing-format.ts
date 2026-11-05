// Prices shown on the public homepage. Pure functions, so they can be unit tested.
// USD prices are the reference prices (minor units = cents). Naira prices apply to Paystack card checkout only,
// so they are returned only when an administrator has switched Paystack on and valid naira prices exist.

export type PublicPricing = {
  usdMinor: { pro: number; premium: number };
  ngnMinor: { pro: number; premium: number } | null;
  paystackEnabled: boolean;
};

export const DEFAULT_USD_MINOR = { pro: 900, premium: 2400 } as const;

const isPositiveInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v > 0;

/** 1400000 kobo -> the naira sign followed by 14,000 */
export function nairaShort(minor: number): string {
  return `₦${(minor / 100).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}

export function pricingFromRows(
  usd: { price_pro_minor?: unknown; price_premium_minor?: unknown } | null | undefined,
  paystack: { paystack_enabled?: unknown; price_pro_ngn_minor?: unknown; price_premium_ngn_minor?: unknown } | null | undefined
): PublicPricing {
  const usdPro = usd?.price_pro_minor;
  const usdPremium = usd?.price_premium_minor;
  const ngnPro = paystack?.price_pro_ngn_minor;
  const ngnPremium = paystack?.price_premium_ngn_minor;
  const enabled = paystack?.paystack_enabled === true && isPositiveInt(ngnPro) && isPositiveInt(ngnPremium);
  return {
    usdMinor: {
      pro: isPositiveInt(usdPro) ? usdPro : DEFAULT_USD_MINOR.pro,
      premium: isPositiveInt(usdPremium) ? usdPremium : DEFAULT_USD_MINOR.premium
    },
    ngnMinor: enabled ? { pro: ngnPro as number, premium: ngnPremium as number } : null,
    paystackEnabled: enabled
  };
}
