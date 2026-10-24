'use server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { defaultExpiry, encryptToken, generateToken, hashToken } from '@/lib/tokens';
import { parseAgreementForm, parseChangeForm } from '@/lib/validation';
import { CURRENCY_CODES } from '@/lib/money';
import { isValidTimeZone } from '@/lib/time';
import { errorCopy, en } from '@/messages/en';
import type { Terms } from '@/lib/terms';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function go(path: string, kind: 'error' | 'ok', message: string): never {
  redirect(`${path}?${kind}=${encodeURIComponent(message)}`);
}

function copyForDbError(message: string): string {
  const code = Object.keys(en.errors).find((key) => key !== 'default' && message.includes(key));
  return errorCopy(code);
}

async function session() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect('/signin');
  return { supabase, user };
}

function agreementPath(id: string) {
  return `/dashboard/agreements/${id}`;
}

export async function createAgreementAction(formData: FormData) {
  const { supabase } = await session();
  const parsed = parseAgreementForm(Object.fromEntries(formData));
  if (!parsed.ok) go('/dashboard/agreements/new', 'error', parsed.error);
  const token = generateToken();
  const { data, error } = await supabase.rpc('create_agreement', {
    p_terms: parsed.terms,
    p_token_hash: hashToken(token),
    p_token_ciphertext: encryptToken(token),
    p_expires_at: defaultExpiry(),
    p_idempotency_key: String(formData.get('idempotency_key') ?? '').slice(0, 80) || null
  });
  if (error || !data) go('/dashboard/agreements/new', 'error', copyForDbError(error?.message ?? ''));
  go(agreementPath(String(data)), 'ok', 'Agreement saved. Share the customer link below.');
}

export async function proposeChangeAction(agreementId: string, formData: FormData) {
  if (!UUID.test(agreementId)) redirect('/dashboard');
  const { supabase } = await session();
  const { data: agreement } = await supabase.from('agreements').select('current_version').eq('id', agreementId).maybeSingle();
  if (!agreement) go('/dashboard', 'error', errorCopy('not_found'));
  const { data: version } = await supabase
    .from('agreement_versions')
    .select('terms')
    .eq('agreement_id', agreementId)
    .eq('version_number', agreement.current_version)
    .maybeSingle();
  if (!version) go(agreementPath(agreementId), 'error', errorCopy('not_found'));
  const parsed = parseChangeForm(Object.fromEntries(formData), version.terms as Terms);
  if (!parsed.ok) go(agreementPath(agreementId), 'error', parsed.error);
  const { error } = await supabase.rpc('propose_change', {
    p_agreement: agreementId,
    p_description: parsed.description,
    p_reason: parsed.reason,
    p_notes: parsed.notes,
    p_proposed: parsed.proposed
  });
  if (error) go(agreementPath(agreementId), 'error', copyForDbError(error.message));
  go(agreementPath(agreementId), 'ok', 'Change proposed. Share the same customer link so they can review it.');
}

export async function withdrawChangeAction(agreementId: string, changeId: string) {
  if (!UUID.test(agreementId) || !UUID.test(changeId)) redirect('/dashboard');
  const { supabase } = await session();
  const { error } = await supabase.rpc('withdraw_change', { p_change: changeId });
  if (error) go(agreementPath(agreementId), 'error', copyForDbError(error.message));
  go(agreementPath(agreementId), 'ok', 'Proposal withdrawn. The approved terms are unchanged.');
}

export async function regenerateLinkAction(agreementId: string) {
  if (!UUID.test(agreementId)) redirect('/dashboard');
  const { supabase } = await session();
  const token = generateToken();
  const { error } = await supabase.rpc('regenerate_link', {
    p_agreement: agreementId,
    p_token_hash: hashToken(token),
    p_token_ciphertext: encryptToken(token),
    p_expires_at: defaultExpiry()
  });
  if (error) go(agreementPath(agreementId), 'error', copyForDbError(error.message));
  go(agreementPath(agreementId), 'ok', 'New link created. The previous link no longer works.');
}

export async function revokeLinkAction(agreementId: string) {
  if (!UUID.test(agreementId)) redirect('/dashboard');
  const { supabase } = await session();
  const { error } = await supabase.rpc('revoke_link', { p_agreement: agreementId });
  if (error) go(agreementPath(agreementId), 'error', copyForDbError(error.message));
  go(agreementPath(agreementId), 'ok', 'Link revoked. Customers can no longer open it.');
}

export async function completeAgreementAction(agreementId: string) {
  if (!UUID.test(agreementId)) redirect('/dashboard');
  const { supabase } = await session();
  const { error } = await supabase.rpc('mark_completed', { p_agreement: agreementId });
  if (error) go(agreementPath(agreementId), 'error', copyForDbError(error.message));
  go(agreementPath(agreementId), 'ok', 'Marked as completed. This is recorded as reported by you, not confirmed by the customer.');
}

export async function markNotificationsReadAction() {
  const { supabase, user } = await session();
  await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('owner_id', user.id).is('read_at', null);
  redirect('/dashboard');
}

export async function updateSettingsAction(formData: FormData) {
  const { supabase, user } = await session();
  const displayName = String(formData.get('display_name') ?? '').trim();
  const businessName = String(formData.get('business_name') ?? '').trim();
  const timezone = String(formData.get('timezone') ?? 'UTC');
  const currency = String(formData.get('default_currency') ?? 'USD');
  if (displayName.length > 120 || businessName.length > 120) go('/dashboard/settings', 'error', 'Names must be 120 characters or fewer.');
  if (!isValidTimeZone(timezone)) go('/dashboard/settings', 'error', 'Choose a valid time zone.');
  if (!(CURRENCY_CODES as readonly string[]).includes(currency)) go('/dashboard/settings', 'error', 'Choose a supported currency.');
  const { error } = await supabase
    .from('profiles')
    .update({ display_name: displayName, business_name: businessName, timezone, default_currency: currency })
    .eq('id', user.id);
  if (error) go('/dashboard/settings', 'error', errorCopy('default'));
  go('/dashboard/settings', 'ok', 'Settings saved.');
}
