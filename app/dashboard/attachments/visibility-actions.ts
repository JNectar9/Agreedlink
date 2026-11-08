'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { attachmentErrorCopy } from '@/lib/attachments';
import { isUuid } from '@/lib/subscriptions';

type Result = { ok: true; customerVisible: boolean } | { ok: false; error: string };

/** A short technical tag so a failure can be named exactly. Only the signed-in owner ever sees it. */
const detail = (e: { code?: string; message?: string } | null) => ` [${e?.code ?? 'error'}: ${String(e?.message ?? '').slice(0, 80)}]`;

/**
 * Shows or hides one file for the customer, then reads it back to prove the change was saved.
 * It says "ok" only if the database really holds the new value.
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
  if (error) return { ok: false, error: attachmentErrorCopy(error) + detail(error) };

  const { data, error: readError } = await supabase.from('agreement_attachments').select('customer_visible').eq('id', id).maybeSingle();
  if (readError || !data) return { ok: false, error: `Sent, but not confirmed. Refresh and check the file.${detail(readError)}` };
  const actual = (data as { customer_visible: boolean | null }).customer_visible !== false;
  if (actual !== wanted) return { ok: false, error: `The change did not save. Saved value: ${actual ? 'visible' : 'private'}.` };

  // Make sure no page keeps showing the old state.
  revalidatePath('/dashboard/agreements/[id]/attachments', 'page');
  return { ok: true, customerVisible: actual };
}
