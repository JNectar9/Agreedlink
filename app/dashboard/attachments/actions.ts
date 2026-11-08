'use server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ALLOWED_TYPES, attachmentErrorCopy, cleanFileName } from '@/lib/attachments';
import { isUuid } from '@/lib/subscriptions';

const BUCKET = 'attachments';
type Fail = { ok: false; error: string };

async function session() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect('/signin');
  return supabase;
}

/** Step 1 of an upload: the database checks the plan, type, size and storage, then we create a one-time upload link. */
export async function beginAttachmentAction(input: { agreementId: string; fileName: string; mimeType: string; size: number }):
  Promise<{ ok: true; id: string; path: string; token: string } | Fail> {
  const supabase = await session();
  if (!isUuid(input.agreementId)) return { ok: false, error: 'That agreement could not be found.' };
  const fileName = cleanFileName(String(input.fileName ?? ''));
  if (!fileName) return { ok: false, error: 'That file has no usable name.' };
  if (!ALLOWED_TYPES[String(input.mimeType)]) return { ok: false, error: 'That file type is not allowed.' };
  const size = Number(input.size);
  if (!Number.isFinite(size) || size <= 0) return { ok: false, error: 'That file is empty or its size could not be read.' };

  const { data, error } = await supabase.rpc('begin_attachment', { p_agreement: input.agreementId, p_file_name: fileName, p_mime: input.mimeType, p_size: Math.floor(size) });
  if (error) return { ok: false, error: attachmentErrorCopy(error) };
  const result = data as { id?: string; path?: string; stale_paths?: string[] } | null;
  if (!result?.id || !result.path) return { ok: false, error: 'Something went wrong. Please try again.' };

  // Remove files left behind by earlier uploads that never finished. Best effort.
  if (Array.isArray(result.stale_paths) && result.stale_paths.length > 0) await supabase.storage.from(BUCKET).remove(result.stale_paths);

  const signed = await supabase.storage.from(BUCKET).createSignedUploadUrl(result.path);
  if (signed.error || !signed.data?.token) {
    await supabase.rpc('delete_attachment', { p_id: result.id });
    return { ok: false, error: 'Could not start the upload. Please try again.' };
  }
  return { ok: true, id: result.id, path: result.path, token: signed.data.token };
}

/** Step 3: the database reads the real stored size and only then marks the file ready. A bad file is removed. */
export async function finishAttachmentAction(id: string): Promise<{ ok: true } | Fail> {
  const supabase = await session();
  if (!isUuid(id)) return { ok: false, error: 'That file could not be found.' };
  const { error } = await supabase.rpc('finish_attachment', { p_id: id });
  if (error) {
    await abortAttachmentAction(id);
    return { ok: false, error: attachmentErrorCopy(error) };
  }
  return { ok: true };
}

/** Cleans up an upload that failed: removes the pending record and any partly uploaded file. */
export async function abortAttachmentAction(id: string): Promise<{ ok: true } | Fail> {
  const supabase = await session();
  if (!isUuid(id)) return { ok: false, error: 'That file could not be found.' };
  const { data, error } = await supabase.rpc('delete_attachment', { p_id: id });
  if (error) return { ok: false, error: attachmentErrorCopy(error) };
  if (typeof data === 'string' && data) await supabase.storage.from(BUCKET).remove([data]);
  return { ok: true };
}

export async function deleteAttachmentAction(formData: FormData) {
  const supabase = await session();
  const id = String(formData.get('attachment_id') ?? '');
  const agreementId = String(formData.get('agreement_id') ?? '');
  const back = isUuid(agreementId) ? `/dashboard/agreements/${agreementId}/attachments` : '/dashboard';
  const go = (kind: 'error' | 'ok', message: string): never => redirect(`${back}?${kind}=${encodeURIComponent(message)}`);
  if (!isUuid(id)) go('error', 'That file could not be found.');

  const { data: row } = await supabase.from('agreement_attachments').select('storage_path').eq('id', id).maybeSingle();
  if (!row) go('error', 'That file could not be found. It may already be deleted.');
  const path = String((row as { storage_path: string }).storage_path);
  const removed = await supabase.storage.from(BUCKET).remove([path]);
  if (removed.error) go('error', 'Could not delete the file. Please try again.');
  const { error } = await supabase.rpc('delete_attachment', { p_id: id });
  if (error) go('error', attachmentErrorCopy(error));
  go('ok', 'File deleted.');
}

/** Used by the uploader: marks a pending file private BEFORE it is uploaded, so it is never visible even for a moment. */
export async function setVisibilityAction(id: string, customerVisible: boolean): Promise<{ ok: true } | Fail> {
  const supabase = await session();
  if (!isUuid(id)) return { ok: false, error: 'That file could not be found.' };
  const { error } = await supabase.rpc('set_attachment_visibility', { p_id: id, p_visible: Boolean(customerVisible) });
  if (error) return { ok: false, error: attachmentErrorCopy(error) };
  return { ok: true };
}

function backTo(agreementId: string): string {
  return isUuid(agreementId) ? `/dashboard/agreements/${agreementId}/attachments` : '/dashboard';
}

export async function changeVisibilityFormAction(formData: FormData) {
  const supabase = await session();
  const id = String(formData.get('attachment_id') ?? '');
  const agreementId = String(formData.get('agreement_id') ?? '');
  // The agreement page sends return_to=agreement so the person stays on the Customer link page after toggling.
  const back = String(formData.get('return_to') ?? '') === 'agreement' && isUuid(agreementId) ? `/dashboard/agreements/${agreementId}` : backTo(agreementId);
  const makeVisible = String(formData.get('make_visible') ?? '') === 'true';
  const go = (kind: 'error' | 'ok', message: string): never => redirect(`${back}?${kind}=${encodeURIComponent(message)}`);
  if (!isUuid(id)) go('error', 'That file could not be found.');
  const { error } = await supabase.rpc('set_attachment_visibility', { p_id: id, p_visible: makeVisible });
  if (error) go('error', attachmentErrorCopy(error));
  go('ok', makeVisible ? 'This file is now visible to your customer.' : 'This file is now private. Your customer cannot see it.');
}

export async function renameAttachmentFormAction(formData: FormData) {
  const supabase = await session();
  const id = String(formData.get('attachment_id') ?? '');
  const back = backTo(String(formData.get('agreement_id') ?? ''));
  const name = cleanFileName(String(formData.get('file_name') ?? ''));
  const go = (kind: 'error' | 'ok', message: string): never => redirect(`${back}?${kind}=${encodeURIComponent(message)}`);
  if (!isUuid(id)) go('error', 'That file could not be found.');
  if (!name) go('error', 'Please type a file name.');
  const { error } = await supabase.rpc('rename_attachment', { p_id: id, p_name: name });
  if (error) go('error', attachmentErrorCopy(error));
  go('ok', 'File renamed.');
}
