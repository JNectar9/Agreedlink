'use server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { affiliateErrorCopy, parseApplication } from '@/lib/affiliate';

function go(kind: 'error' | 'ok', message: string): never {
  redirect(`/affiliate/profile?${kind}=${encodeURIComponent(message)}`);
}

/** Sends an application. It always starts as "pending". The database checks every field again. */
export async function applyAction(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect('/signin?next=/affiliate/profile');
  const parsed = parseApplication(Object.fromEntries(formData));
  if (!parsed.ok) go('error', parsed.error);
  const { error } = await supabase.rpc('affiliate_apply', {
    p_name: parsed.value.name, p_email: parsed.value.email, p_whatsapp: parsed.value.whatsapp,
    p_platform: parsed.value.platform, p_reason: parsed.value.reason
  });
  if (error) go('error', affiliateErrorCopy(error));
  go('ok', 'Application sent. We will review it and update this page.');
}
