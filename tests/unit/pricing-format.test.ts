import { describe, expect, it } from 'vitest';
import { DEFAULT_USD_MINOR, nairaShort, pricingFromRows } from '@/lib/pricing-format';

describe('homepage pricing', () => {
  it('formats naira from kobo', () => {
    expect(nairaShort(1400000)).toBe('₦14,000');
    expect(nairaShort(3600000)).toBe('₦36,000');
    expect(nairaShort(1450050)).toBe('₦14,500.5');
  });
  it('shows naira only when Paystack is switched on and both prices are valid', () => {
    const on = pricingFromRows({ price_pro_minor: 900, price_premium_minor: 2400 }, { paystack_enabled: true, price_pro_ngn_minor: 1400000, price_premium_ngn_minor: 3600000 });
    expect(on).toEqual({ usdMinor: { pro: 900, premium: 2400 }, ngnMinor: { pro: 1400000, premium: 3600000 }, paystackEnabled: true });
    const off = pricingFromRows({ price_pro_minor: 900, price_premium_minor: 2400 }, { paystack_enabled: false, price_pro_ngn_minor: 1400000, price_premium_ngn_minor: 3600000 });
    expect(off.ngnMinor).toBeNull();
    expect(off.paystackEnabled).toBe(false);
    const missing = pricingFromRows({ price_pro_minor: 900 }, { paystack_enabled: true, price_pro_ngn_minor: 1400000 });
    expect(missing.paystackEnabled).toBe(false);
    expect(pricingFromRows(null, { paystack_enabled: 'true', price_pro_ngn_minor: 1, price_premium_ngn_minor: 1 }).paystackEnabled).toBe(false);
  });
  it('uses the configured USD prices and falls back to $9 and $24', () => {
    expect(pricingFromRows({ price_pro_minor: 1000, price_premium_minor: 2500 }, null).usdMinor).toEqual({ pro: 1000, premium: 2500 });
    expect(pricingFromRows(null, null).usdMinor).toEqual({ pro: DEFAULT_USD_MINOR.pro, premium: DEFAULT_USD_MINOR.premium });
    expect(pricingFromRows({ price_pro_minor: -5, price_premium_minor: 'x' }, null).usdMinor).toEqual({ pro: 900, premium: 2400 });
  });
});
