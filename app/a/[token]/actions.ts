'use server';
import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { isServerConfigured, isSupabaseConfigured } from '@/lib/env';
import { hashToken, TOKEN_PATTERN } from '@/lib/tokens';
import { parseDecision } from '@/lib/validation';
import { errorCopy } from '@/messages/en';

type RpcResult = { ok: boolean; error?: string; decision?: string };

function back(token: string, kind: 'error' | 'done', value: string): never {
  redirect(`/a/${token}?${kind}=${encodeURIComponent(value)}`);
}

/**
 * If the customer is signed in with a CONFIRMED email, their identity is recorded with the decision. The identity comes
 * from the server-verified session, never from the form. Anyone else decides through the secure link with a typed name.
 * Email verification only means something while "Confirm email" stays switched on in Supabase.
 */
async function signedInIdentity(): Promise<{ p_user_id: string | null; p_verified_email: string | null }> {
  if (!isSupabaseConfigured()) return { p_user_id: null, p_verified_email: null };
  const {
    data: { user }
  } = await createClient().auth.getUser();
  if (user && user.email && user.email_confirmed_at) return { p_user_id: user.id, p_verified_email: user.email };
  return { p_user_id: null, p_verified_email: null };
}

async function call(token: string, fn: 'customer_decide_agreement' | 'customer_decide_change', args: Record<string, unknown>) {
  if (!TOKEN_PATTERN.test(token)) redirect('/');
  if (!isServerConfigured()) back(token, 'error', 'This service is not configured yet.');
  const who = await signedInIdentity();
  const { data, error } = await createAdminClient().rpc(fn, { p_token_hash: hashToken(token), ...args, ...who });
  if (error) back(token, 'error', errorCopy('default'));
  return data as RpcResult;
}

export async function decideAgreementAction(token: string, formData: FormData) {
  const parsed = parseDecision(Object.fromEntries(formData), ['approve', 'decline', 'clarify'] as const);
  if (!parsed.ok) back(token, 'error', parsed.error);
  const result = await call(token, 'customer_decide_agreement', {
    p_decision: parsed.decision,
    p_name: parsed.name,
    p_email: parsed.email,
    p_message: parsed.message,
    p_version: Number(formData.get('version'))
  });
  if (!result.ok) back(token, 'error', errorCopy(result.error));
  back(token, 'done', `agreement_${parsed.decision}`);
}

export async function decideChangeAction(token: string, formData: FormData) {
  const parsed = parseDecision(Object.fromEntries(formData), ['approve', 'reject', 'clarify'] as const);
  if (!parsed.ok) back(token, 'error', parsed.error);
  const changeId = String(formData.get('change_id') ?? '');
  if (!/^[0-9a-f-]{36}$/i.test(changeId)) back(token, 'error', errorCopy('not_pending'));
  const result = await call(token, 'customer_decide_change', {
    p_change: changeId,
    p_decision: parsed.decision,
    p_name: parsed.name,
    p_email: parsed.email,
    p_message: parsed.message
  });
  if (!result.ok) back(token, 'error', errorCopy(result.error));
  back(token, 'done', `change_${parsed.decision}`);
}
