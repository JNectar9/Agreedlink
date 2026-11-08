'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { attachmentErrorCopy } from '@/lib/attachments';
import { isUuid } from '@/lib/subscriptions';

type Result = { ok: true; customerVisible: boolean } | { ok: false; error: string };

/**
 * Shows or hides one file for the customer, then READS IT BACK to prove the change was saved.
 * It never reports success unless the database really holds the new value.
 * It uses the same database function as before (set_attachment_visibility).
 */
export async function toggleVisibilityAction(id: string, makeVisible: boolean): Promise<Result> {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Please sign in again.' };
  if (!isUuid(id)) return { ok: false, error: 'That file could not be found.' };
  const wanted = Boolean(makeVisible);

  const { error } = await supabase.rpc('set_attachment_visibility', { p_id: id, p_visible: wanted });
  if (error) return { ok: false, error: attachmentErrorCopy(error) };

  const { data, error: readError } = await supabase
    .from('agreement_attachments')
    .select('customer_visible')
    .eq('id', id)
    .maybeSingle();
  if (readError || !data) {
    return { ok: false, error: 'The change was sent but could not be confirmed. Refresh the page and check the file.' };
  }
  const actual = (data as { customer_visible: boolean | null }).customer_visible !== false;
  if (actual !== wanted) return { ok: false, error: 'The change did not save, so nothing was changed. Please try again.' };

  // Make sure no page keeps showing the old state.
  revalidatePath('/dashboard/agreements/[id]/attachments', 'page');
  return { ok: true, customerVisible: actual };
}
