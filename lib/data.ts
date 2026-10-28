import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { en } from '@/messages/en';
import type { Terms } from '@/lib/terms';

export type Profile = {
  id: string;
  display_name: string;
  business_name: string;
  timezone: string;
  default_currency: string;
  business_email?: string;
  business_phone?: string;
  business_website?: string;
  business_address?: string;
  phone?: string;
  avatar_path?: string | null;
};

export type AgreementRow = {
  id: string;
  project_name: string;
  client_name: string;
  status: 'draft' | 'awaiting_approval' | 'approved' | 'declined' | 'completed' | 'expired' | 'cancelled';
  currency: string;
  original_amount_minor: number;
  current_amount_minor: number;
  current_delivery_date: string;
  current_version: number;
  created_at: string;
  updated_at: string;
};

export type ChangeRow = {
  id: string;
  agreement_id: string;
  base_version: number;
  status: 'pending' | 'clarification_requested' | 'approved' | 'rejected' | 'withdrawn' | 'superseded';
  description: string;
  reason: string;
  notes_for_customer: string;
  proposed_terms: Terms;
  price_delta_minor: number;
  decided_at: string | null;
  decided_by_name: string | null;
  decision_note: string | null;
  created_at: string;
};

export const OPEN_CHANGE = ['pending', 'clarification_requested'];
/** Agreements in these statuses count toward the plan's active-agreement limit. */
export const ACTIVE_STATUSES = ['draft', 'awaiting_approval', 'approved'];

/** Signed-in user + profile, or a redirect to /signin. Use at the top of dashboard pages. */
export async function requireSession() {
  if (!isSupabaseConfigured()) redirect('/signin');
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect('/signin');
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
  const safeProfile: Profile = profile ?? {
    id: user.id,
    display_name: user.email ?? '',
    business_name: '',
    timezone: 'Africa/Lagos',
    default_currency: 'USD'
  };
  return { supabase, user, profile: safeProfile };
}

export type DisplayStatus = keyof typeof en.status;

export function displayStatus(status: AgreementRow['status'], hasOpenChange: boolean): DisplayStatus {
  return status === 'approved' && hasOpenChange ? 'changes_pending' : status;
}

/** Loads the signed-in user's agreements (RLS applies) with their display status. */
export async function loadAgreements(supabase: ReturnType<typeof createClient>) {
  const [{ data: rows }, { data: openChanges }] = await Promise.all([
    supabase.from('agreements').select('*').order('updated_at', { ascending: false }).limit(200),
    supabase.from('change_requests').select('agreement_id').in('status', OPEN_CHANGE)
  ]);
  const withOpen = new Set((openChanges ?? []).map((c: { agreement_id: string }) => c.agreement_id));
  return ((rows ?? []) as AgreementRow[]).map((a) => ({ ...a, shown: displayStatus(a.status, withOpen.has(a.id)) }));
}
