'use server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function claimRecordsAction() {
  const { data, error } = await createClient().rpc('claim_customer_records');
  if (error) {
    const unverified = error.message.includes('email_not_verified');
    redirect(`/portal?error=${encodeURIComponent(unverified ? 'Confirm your email address first. Open the confirmation email we sent when you created your account, then try again.' : 'We could not look for your agreements right now. Please try again later.')}`);
  }
  const n = Number(data ?? 0);
  redirect(`/portal?ok=${encodeURIComponent(n > 0 ? `Done. ${n} client record${n === 1 ? '' : 's'} linked to your account.` : 'No new records found for this email. A business needs your exact email address on file before its agreements can appear here.')}`);
}
