'use server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { affiliateErrorCopy } from '@/lib/affiliate';
import { isCurrencyCode, parseMoneyToMinor } from '@/lib/money';
import { isUuid } from '@/lib/subscriptions';

const BASE = '/dashboard/admin/affiliates';

/** Only addresses inside this admin page are accepted as a return address. */
function backPath(f: FormData): string {
  const v = String(f.get('back') ?? '');
  return v === BASE || v.startsWith(`${BASE}?`) ? v : BASE;
}
function go(back: string, kind: 'error' | 'ok', message: string): never {
  redirect(`${back}${back.includes('?') ? '&' : '?'}${kind}=${encodeURIComponent(message)}`);
}
/** Signed-in admin only. Every database function checks is_admin() too, so this is a second lock. */
async function adminSession() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect('/signin');
  const { data } = await supabase.rpc('is_admin');
  if (data !== true) redirect('/dashboard');
  return supabase;
}
const text = (f: FormData, k: string) => String(f.get(k) ?? '').trim();

export async function decideAction(f: FormData) {
  const supabase = await adminSession();
  const back = backPath(f);
  const id = text(f, 'affiliate_id');
  const decision = text(f, 'decision');
  if (!isUuid(id) || !['approve', 'reject', 'suspend', 'reactivate'].includes(decision)) go(back, 'error', 'That action is not allowed.');
  const { error } = await supabase.rpc('admin_affiliate_decide', { p_id: id, p_decision: decision, p_note: text(f, 'note').slice(0, 500) || null });
  if (error) go(back, 'error', affiliateErrorCopy(error));
  const done: Record<string, string> = { approve: 'Approved. The affiliate now has a link.', reject: 'Application rejected.', suspend: 'Affiliate suspended.', reactivate: 'Affiliate reactivated.' };
  go(back, 'ok', done[decision]);
}

export async function preparePayoutsAction(f: FormData) {
  const supabase = await adminSession();
  const back = backPath(f);
  const { data, error } = await supabase.rpc('admin_affiliate_prepare_payouts', {});
  if (error) go(back, 'error', affiliateErrorCopy(error));
  const made = Number(data ?? 0);
  go(back, 'ok', made > 0 ? `${made} payout${made === 1 ? '' : 's'} prepared. Review and approve each one.` : 'Nothing is eligible yet. Unqualified commissions roll over.');
}

export async function approvePayoutAction(f: FormData) {
  const supabase = await adminSession();
  const back = backPath(f);
  const id = text(f, 'payout_id');
  if (!isUuid(id)) go(back, 'error', 'That payout could not be found.');
  const { error } = await supabase.rpc('admin_affiliate_approve_payout', { p_payout: id });
  if (error) go(back, 'error', affiliateErrorCopy(error));
  go(back, 'ok', 'Payout approved. Pay it, then record the payment reference.');
}

export async function recordPayoutAction(f: FormData) {
  const supabase = await adminSession();
  const back = backPath(f);
  const id = text(f, 'payout_id');
  const reference = text(f, 'reference');
  const date = text(f, 'paid_at');
  if (!isUuid(id)) go(back, 'error', 'That payout could not be found.');
  if (reference.length < 3 || reference.length > 120) go(back, 'error', 'Enter a payment reference of 3 to 120 characters.');
  const when = new Date(`${date}T12:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(when.getTime())) go(back, 'error', 'Enter the date the money was sent.');
  const { error } = await supabase.rpc('admin_affiliate_record_payout', { p_payout: id, p_reference: reference, p_paid_at: when.toISOString() });
  if (error) go(back, 'error', affiliateErrorCopy(error));
  go(back, 'ok', 'Marked as paid. The affiliate can see the reference.');
}

export async function cancelPayoutAction(f: FormData) {
  const supabase = await adminSession();
  const back = backPath(f);
  const id = text(f, 'payout_id');
  const reason = text(f, 'reason');
  if (!isUuid(id)) go(back, 'error', 'That payout could not be found.');
  if (reason.length < 5) go(back, 'error', 'Enter a reason of at least 5 characters.');
  const { error } = await supabase.rpc('admin_affiliate_cancel_payout', { p_payout: id, p_reason: reason.slice(0, 500) });
  if (error) go(back, 'error', affiliateErrorCopy(error));
  go(back, 'ok', 'Payout cancelled. Its commissions go back to pending.');
}

export async function adjustAction(f: FormData) {
  const supabase = await adminSession();
  const back = backPath(f);
  const id = text(f, 'affiliate_id');
  const currency = text(f, 'currency').toUpperCase();
  const reason = text(f, 'reason');
  if (!isUuid(id)) go(back, 'error', 'That affiliate could not be found.');
  if (!isCurrencyCode(currency)) go(back, 'error', 'Choose a valid currency.');
  if (reason.length < 5) go(back, 'error', 'Enter a reason of at least 5 characters.');
  const amount = parseMoneyToMinor(text(f, 'amount'), currency);
  if (amount === null || amount <= 0) go(back, 'error', 'Enter an amount above zero.');
  const signed = text(f, 'direction') === 'subtract' ? -amount : amount;
  const { error } = await supabase.rpc('admin_affiliate_adjust', { p_affiliate: id, p_amount_minor: signed, p_currency: currency, p_reason: reason.slice(0, 500) });
  if (error) go(back, 'error', affiliateErrorCopy(error));
  go(back, 'ok', 'Adjustment saved and written to the audit log.');
}

export async function reverseAction(f: FormData) {
  const supabase = await adminSession();
  const back = backPath(f);
  const id = text(f, 'commission_id');
  const reason = text(f, 'reason');
  if (!isUuid(id)) go(back, 'error', 'That commission could not be found.');
  if (reason.length < 5) go(back, 'error', 'Enter a reason of at least 5 characters.');
  const { data, error } = await supabase.rpc('admin_affiliate_reverse', { p_commission: id, p_reason: reason.slice(0, 500) });
  if (error) go(back, 'error', affiliateErrorCopy(error));
  const out: Record<string, string> = {
    reversed: 'Commission reversed.', already_reversed: 'That commission was already reversed.',
    in_open_payout: 'It is in an open payout. Cancel that payout first.', not_found: 'That commission could not be found.'
  };
  go(back, data === 'reversed' ? 'ok' : 'error', out[String(data)] ?? 'Nothing changed.');
}
