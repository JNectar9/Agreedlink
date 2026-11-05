'use server';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { siteUrl } from '@/lib/env';
import { isPaidPlan } from '@/lib/subscriptions';
import { checkoutErrorCopy, initializePaystackTransaction, newPaystackReference } from '@/lib/paystack-checkout';

/**
 * The address Paystack sends the customer back to. It must be the address the customer is browsing on right now,
 * because the sign-in cookie only exists for that address. That matters on preview deployments, which have their
 * own address. Falls back to NEXT_PUBLIC_SITE_URL when the host header looks wrong.
 */
function returnBase(): string {
  const h = headers();
  const host = (h.get('x-forwarded-host') ?? h.get('host') ?? '').split(',')[0].trim().toLowerCase();
  if (/^[a-z0-9]([a-z0-9.-]*[a-z0-9])?(:\d{1,5})?$/.test(host)) {
    const local = host.startsWith('localhost') || host.startsWith('127.0.0.1');
    return `${local ? 'http' : 'https'}://${host}`;
  }
  return siteUrl();
}

function go(kind: 'error' | 'ok', message: string): never {
  redirect(`/dashboard/billing?${kind}=${encodeURIComponent(message)}`);
}

/**
 * Starts a Paystack card checkout. The browser sends only the plan. The user comes from the signed-in session, the
 * NGN amount is copied from the server-side configuration inside the database, and the customer is then sent to
 * Paystack's own checkout page. Nothing here grants access: only a verified payment does (webhook or return page).
 */
export async function startPaystackCheckoutAction(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect('/signin');
  if (!user.email) go('error', 'Your account needs an email address to pay by card.');

  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) go('error', 'Card payments are not set up yet. Please use bank transfer or contact support.');

  const plan = String(formData.get('plan') ?? '');
  if (!isPaidPlan(plan)) go('error', 'Choose Pro or Premium.');

  const site = returnBase();
  if (process.env.VERCEL && /localhost|127\.0\.0\.1/.test(site)) {
    go('error', 'Card payments are not configured correctly yet. Please contact support.');
  }

  const db = createAdminClient();
  const reference = newPaystackReference();
  const { data: created, error } = await db.rpc('paystack_create_transaction', { p_user: user.id, p_plan: plan, p_reference: reference });
  if (error) go('error', checkoutErrorCopy(error));
  const amountMinor = Number((created as { amount_minor?: number } | null)?.amount_minor);
  if (!Number.isInteger(amountMinor) || amountMinor <= 0) go('error', 'Something went wrong. Please try again.');

  const init = await initializePaystackTransaction({
    secret,
    email: user.email,
    amountMinor,
    reference,
    callbackUrl: `${site}/dashboard/billing/paystack/return`,
    metadata: { user_id: user.id, plan, source: 'agreedlink' }
  });
  if (!init.ok) {
    await db.rpc('paystack_mark_status', { p_reference: reference, p_status: 'failed' });
    console.error('[paystack-checkout] initialize failed', init.message);
    go('error', 'We could not start the payment. Please try again in a moment.');
  }
  redirect(init.authorizationUrl);
}
