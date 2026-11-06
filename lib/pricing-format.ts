// Prices shown on the public homepage. Pure functions, so they can be unit tested.
// USD prices are the reference prices (minor units = cents). Naira prices (kobo) are what customers actually pay,
// by card through Paystack or by manual bank transfer. They come from the configured prices, with the agreed
// 14,000 and 36,000 naira as the fallback. Whether card checkout is switched on is tracked separately.

export type PublicPricing = {
  usdMinor: { pro: number; premium: number };
  ngnMinor: { pro: number; premium: number };
  /** True only while an administrator has Paystack switched on and valid naira prices exist. */
  paystackEnabled: boolean;
};

export const DEFAULT_USD_MINOR = { pro: 900, premium: 2400 } as const;
export const DEFAULT_NGN_MINOR = { pro: 1400000, premium: 3600000 } as const;

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
    ngnMinor: {
      pro: isPositiveInt(ngnPro) ? ngnPro : DEFAULT_NGN_MINOR.pro,
      premium: isPositiveInt(ngnPremium) ? ngnPremium : DEFAULT_NGN_MINOR.premium
    },
    paystackEnabled: enabled
  };
}

/** Naira prices (kobo) from the subscription_public_config result, falling back to the agreed 14,000 and 36,000. */
export function ngnPricesFromConfig(cfg: unknown): { pro: number; premium: number } {
  const prices = (cfg as { ngn_prices?: { pro?: unknown; premium?: unknown } | null } | null | undefined)?.ngn_prices;
  const pro = prices?.pro;
  const premium = prices?.premium;
  return {
    pro: isPositiveInt(pro) ? pro : DEFAULT_NGN_MINOR.pro,
    premium: isPositiveInt(premium) ? premium : DEFAULT_NGN_MINOR.premium
  };
}
