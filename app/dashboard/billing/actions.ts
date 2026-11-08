'use server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { parseRequestForm, subscriptionErrorCopy } from '@/lib/subscriptions';

function go(kind: 'error' | 'ok', message: string): never {
  redirect(`/dashboard/billing?${kind}=${encodeURIComponent(message)}`);
}

/**
 * Creates a pending request. The browser may only send plan, months, reference and notes: the database copies the
 * price from subscription_config, forces the status to pending, and allows one pending request per user.
 */
export async function submitSubscriptionRequestAction(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect('/signin');

  const parsed = parseRequestForm(Object.fromEntries(formData));
  if (!parsed.ok) go('error', parsed.error);

  const { error } = await supabase.from('subscription_requests').insert({
    requested_plan: parsed.value.plan,
    months: parsed.value.months,
    payment_reference: parsed.value.reference,
    customer_notes: parsed.value.notes
  });
  if (error) go('error', subscriptionErrorCopy(error));
  go('ok', 'Request sent. We will check your payment and update this page. You do not need to send it again.');
}
