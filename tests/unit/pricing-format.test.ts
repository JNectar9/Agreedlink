import { describe, expect, it } from 'vitest';
import { DEFAULT_NGN_MINOR, DEFAULT_USD_MINOR, nairaShort, pricingFromRows } from '@/lib/pricing-format';

describe('homepage pricing', () => {
  it('formats naira from kobo', () => {
    expect(nairaShort(1400000)).toBe('₦14,000');
    expect(nairaShort(3600000)).toBe('₦36,000');
    expect(nairaShort(1450050)).toBe('₦14,500.5');
  });
  it('uses the configured naira prices, and the card option follows the Paystack switch only', () => {
    const rows = { price_pro_minor: 900, price_premium_minor: 2400 };
    const on = pricingFromRows(rows, { paystack_enabled: true, price_pro_ngn_minor: 1400000, price_premium_ngn_minor: 3600000 });
    expect(on).toEqual({ usdMinor: { pro: 900, premium: 2400 }, ngnMinor: { pro: 1400000, premium: 3600000 }, paystackEnabled: true });
    // Switched off: the same naira prices still show (bank transfer is in naira), but card payment is hidden.
    const off = pricingFromRows(rows, { paystack_enabled: false, price_pro_ngn_minor: 1400000, price_premium_ngn_minor: 3600000 });
    expect(off.ngnMinor).toEqual({ pro: 1400000, premium: 3600000 });
    expect(off.paystackEnabled).toBe(false);
    // A changed admin price flows through.
    expect(pricingFromRows(rows, { paystack_enabled: true, price_pro_ngn_minor: 1500000, price_premium_ngn_minor: 3800000 }).ngnMinor).toEqual({ pro: 1500000, premium: 3800000 });
  });
  it('never enables card payment without both valid naira prices', () => {
    expect(pricingFromRows({ price_pro_minor: 900 }, { paystack_enabled: true, price_pro_ngn_minor: 1400000 }).paystackEnabled).toBe(false);
    expect(pricingFromRows(null, { paystack_enabled: 'true', price_pro_ngn_minor: 1, price_premium_ngn_minor: 1 }).paystackEnabled).toBe(false);
  });
  it('falls back to the agreed prices when nothing is configured', () => {
    expect(pricingFromRows(null, null)).toEqual({
      usdMinor: { pro: DEFAULT_USD_MINOR.pro, premium: DEFAULT_USD_MINOR.premium },
      ngnMinor: { pro: DEFAULT_NGN_MINOR.pro, premium: DEFAULT_NGN_MINOR.premium },
      paystackEnabled: false
    });
    expect(pricingFromRows({ price_pro_minor: -5, price_premium_minor: 'x' }, { price_pro_ngn_minor: 0 }).ngnMinor).toEqual({ pro: 1400000, premium: 3600000 });
  });
  it('uses the configured USD reference prices', () => {
    expect(pricingFromRows({ price_pro_minor: 1000, price_premium_minor: 2500 }, null).usdMinor).toEqual({ pro: 1000, premium: 2500 });
  });
});
