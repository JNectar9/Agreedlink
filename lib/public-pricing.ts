import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/env';
import { pricingFromRows, type PublicPricing } from '@/lib/pricing-format';

/**
 * Reads only the price columns and the Paystack on/off switch for the public homepage. It uses the server key because
 * visitors are not signed in, and it never touches payment instructions or any other setting. If anything is missing
 * (for example a migration has not been run), the page falls back to USD reference prices and hides card payment.
 */
export async function loadPublicPricing(): Promise<PublicPricing> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return pricingFromRows(null, null);
  const db = createAdminClient();
  let usd: { price_pro_minor?: unknown; price_premium_minor?: unknown } | null = null;
  let paystack: { paystack_enabled?: unknown; price_pro_ngn_minor?: unknown; price_premium_ngn_minor?: unknown } | null = null;
  try {
    const res = await db.from('subscription_config').select('price_pro_minor, price_premium_minor').eq('id', true).maybeSingle();
    usd = res.data;
  } catch {
    usd = null;
  }
  try {
    const res = await db.from('subscription_config').select('paystack_enabled, price_pro_ngn_minor, price_premium_ngn_minor').eq('id', true).maybeSingle();
    paystack = res.data;
  } catch {
    paystack = null;
  }
  return pricingFromRows(usd, paystack);
}
