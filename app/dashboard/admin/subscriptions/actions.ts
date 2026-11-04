'use server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isValidWhatsAppNumber, toWhatsAppDigits } from '@/lib/site';
import { isPaidPlan, isUuid, parsePriceToMinor, subscriptionErrorCopy } from '@/lib/subscriptions';

const BASE = '/dashboard/admin/subscriptions';

/** Only paths inside the admin page are accepted as a return address. */
function backPath(formData: FormData): string {
  const value = String(formData.get('back') ?? '');
  return value === BASE || value.startsWith(`${BASE}?`) ? value : BASE;
}

function go(back: string, kind: 'error' | 'ok', message: string): never {
  redirect(`${back}${back.includes('?') ? '&' : '?'}${kind}=${encodeURIComponent(message)}`);
}

/** Signed-in admin only. Every database function also checks is_admin() itself, so this is a second lock. */
async function adminSession() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect('/signin');
  const { data: isAdmin } = await supabase.rpc('is_admin');
  if (isAdmin !== true) redirect('/dashboard');
  return supabase;
}

const text = (f: FormData, name: string) => String(f.get(name) ?? '').trim();

function optionalMonths(value: string): number | null | undefined {
  if (value === '') return null;
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 12 ? n : undefined;
}

export async function approveRequestAction(formData: FormData) {
  const supabase = await adminSession();
  const back = backPath(formData);
  const id = text(formData, 'request_id');
  if (!isUuid(id)) go(back, 'error', 'That request could not be found.');
  const amountText = text(formData, 'amount');
  const amount = amountText === '' ? null : parsePriceToMinor(amountText);
  if (amountText !== '' && amount === null) go(back, 'error', 'Enter the amount received in dollars, for example 9 or 24.50.');
  const months = optionalMonths(text(formData, 'months'));
  if (months === undefined) go(back, 'error', 'Choose between 1 and 12 months.');
  const { error } = await supabase.rpc('admin_approve_request', {
    p_request: id,
    p_payment_reference: text(formData, 'payment_reference') || null,
    p_amount_minor: amount,
    p_months: months,
    p_notes: text(formData, 'notes').slice(0, 1000) || null
  });
  if (error) go(back, 'error', subscriptionErrorCopy(error));
  go(back, 'ok', 'Request approved. The customer now has paid access and was notified.');
}

export async function rejectRequestAction(formData: FormData) {
  const supabase = await adminSession();
  const back = backPath(formData);
  const id = text(formData, 'request_id');
  if (!isUuid(id)) go(back, 'error', 'That request could not be found.');
  const reason = text(formData, 'reason');
  if (reason.length < 3 || reason.length > 500) go(back, 'error', 'Enter a reason of 3 to 500 characters. The customer will see it.');
  const { error } = await supabase.rpc('admin_reject_request', { p_request: id, p_reason: reason });
  if (error) go(back, 'error', subscriptionErrorCopy(error));
  go(back, 'ok', 'Request rejected. The customer was notified with your reason.');
}

export async function renewSubscriptionAction(formData: FormData) {
  const supabase = await adminSession();
  const back = backPath(formData);
  const id = text(formData, 'subscription_id');
  if (!isUuid(id)) go(back, 'error', 'That subscription could not be found.');
  const months = Number(text(formData, 'months'));
  if (!Number.isInteger(months) || months < 1 || months > 12) go(back, 'error', 'Choose between 1 and 12 months.');
  const amount = parsePriceToMinor(text(formData, 'amount'));
  if (amount === null) go(back, 'error', 'Enter the amount received in dollars, for example 9 or 24.50.');
  const reference = text(formData, 'payment_reference');
  if (reference.length < 3 || reference.length > 120) go(back, 'error', 'Enter the payment reference (3 to 120 characters).');
  const { error } = await supabase.rpc('admin_renew_subscription', {
    p_subscription: id,
    p_months: months,
    p_payment_reference: reference,
    p_amount_minor: amount,
    p_notes: text(formData, 'notes').slice(0, 1000) || null
  });
  if (error) go(back, 'error', subscriptionErrorCopy(error));
  go(back, 'ok', 'Subscription renewed. The new period follows the current one.');
}

export async function cancelSubscriptionAction(formData: FormData) {
  const supabase = await adminSession();
  const back = backPath(formData);
  const id = text(formData, 'subscription_id');
  if (!isUuid(id)) go(back, 'error', 'That subscription could not be found.');
  const reason = text(formData, 'reason');
  if (reason.length < 3 || reason.length > 500) go(back, 'error', 'Enter a reason of 3 to 500 characters.');
  const { error } = await supabase.rpc('admin_cancel_subscription', { p_subscription: id, p_reason: reason });
  if (error) go(back, 'error', subscriptionErrorCopy(error));
  go(back, 'ok', 'Subscription cancelled. The customer is back on Free and was notified. The record is kept as history.');
}

export async function grantComplimentaryAction(formData: FormData) {
  const supabase = await adminSession();
  const back = backPath(formData);
  const userId = text(formData, 'user_id');
  if (!isUuid(userId)) go(back, 'error', 'Enter a valid account ID.');
  const plan = text(formData, 'plan');
  if (!isPaidPlan(plan)) go(back, 'error', 'Choose Pro or Premium.');
  const months = Number(text(formData, 'months'));
  if (!Number.isInteger(months) || months < 1 || months > 12) go(back, 'error', 'Choose between 1 and 12 months.');
  const reason = text(formData, 'reason');
  if (reason.length < 3 || reason.length > 1000) go(back, 'error', 'Enter a reason of 3 to 1,000 characters.');
  const { error } = await supabase.rpc('admin_grant_complimentary', { p_user: userId, p_plan: plan, p_months: months, p_reason: reason });
  if (error) go(back, 'error', subscriptionErrorCopy(error));
  go(back, 'ok', 'Complimentary subscription granted. It is labelled as complimentary in the history.');
}

export async function updateConfigAction(formData: FormData) {
  const supabase = await adminSession();
  const back = backPath(formData);
  const pro = parsePriceToMinor(text(formData, 'price_pro'));
  const premium = parsePriceToMinor(text(formData, 'price_premium'));
  if (pro === null || premium === null) go(back, 'error', 'Enter both prices in dollars, above zero, with at most 2 decimals.');
  const instructions = String(formData.get('payment_instructions') ?? '').trim();
  if (instructions.length > 2000) go(back, 'error', 'Payment instructions must be 2,000 characters or fewer.');
  const email = text(formData, 'support_email');
  if (email && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)) go(back, 'error', 'Enter a valid support email or leave it empty.');
  const whatsapp = text(formData, 'support_whatsapp');
  if (whatsapp && (whatsapp.length > 30 || !isValidWhatsAppNumber(toWhatsAppDigits(whatsapp)))) go(back, 'error', 'Enter the WhatsApp number with its country code, for example +234..., or leave it empty.');
  const { error } = await supabase.rpc('admin_update_subscription_config', {
    p_price_pro_minor: pro,
    p_price_premium_minor: premium,
    p_payment_instructions: instructions,
    p_support_email: email,
    p_support_whatsapp: whatsapp
  });
  if (error) go(back, 'error', subscriptionErrorCopy(error));
  go(back, 'ok', 'Settings saved. New prices apply to new requests; requests already sent keep the price they were created with.');
}
