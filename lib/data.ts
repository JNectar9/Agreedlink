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
};

export type AgreementRow = {
  id: string;
  project_name: string;
  client_name: string;
  status: 'draft' | 'awaiting_approval' | 'approved' | 'declined' | 'completed' | 'expired';
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
    timezone: 'UTC',
    default_currency: 'USD'
  };
  return { supabase, user, profile: safeProfile };
}

export type DisplayStatus = keyof typeof en.status;

export function displayStatus(status: AgreementRow['status'], hasOpenChange: boolean): DisplayStatus {
  return status === 'approved' && hasOpenChange ? 'changes_pending' : status;
}
