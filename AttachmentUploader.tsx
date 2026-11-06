'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Paperclip } from 'lucide-react';
import { createBrowserSupabase } from '@/lib/supabase/browser';
import { abortAttachmentAction, beginAttachmentAction, finishAttachmentAction, setVisibilityAction } from '@/app/dashboard/attachments/actions';
import { ACCEPT_ATTRIBUTE, checkFileChoice, formatBytes, type AttachmentLimits } from '@/lib/attachments';

type Props = { agreementId: string; limits: AttachmentLimits };

/**
 * Uploads straight from the browser to private storage using a one-time link, because the app's server cannot
 * receive large files. The database checks every limit before and after the upload.
 */
export function AttachmentUploader({ agreementId, limits }: Props) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [keepPrivate, setKeepPrivate] = useState(false);
  const [message, setMessage] = useState<{ kind: 'error' | 'ok'; text: string } | null>(null);

  async function upload() {
    const file = input.current?.files?.[0];
    if (!file) { setMessage({ kind: 'error', text: 'Choose a file first.' }); return; }
    const problem = checkFileChoice({ name: file.name, type: file.type, size: file.size }, limits);
    if (problem) { setMessage({ kind: 'error', text: problem }); return; }

    setBusy(true);
    setMessage(null);
    try {
      const begin = await beginAttachmentAction({ agreementId, fileName: file.name, mimeType: file.type, size: file.size });
      if (!begin.ok) { setMessage({ kind: 'error', text: begin.error }); return; }

      // Private is decided while the file is still pending, so a private file is never visible, even briefly.
      if (keepPrivate) {
        const vis = await setVisibilityAction(begin.id, false);
        if (!vis.ok) { await abortAttachmentAction(begin.id); setMessage({ kind: 'error', text: vis.error }); return; }
      }

      const { error } = await createBrowserSupabase().storage.from('attachments').uploadToSignedUrl(begin.path, begin.token, file, { contentType: file.type });
      if (error) {
        await abortAttachmentAction(begin.id);
        setMessage({ kind: 'error', text: 'The upload failed. Check your connection and try again.' });
        return;
      }
      const done = await finishAttachmentAction(begin.id);
      if (!done.ok) { setMessage({ kind: 'error', text: done.error }); return; }

      if (input.current) input.current.value = '';
      setMessage({ kind: 'ok', text: keepPrivate ? 'File uploaded. It is private: only you can see it.' : 'File uploaded. Your customer can see it.' });
      router.refresh();
    } catch {
      setMessage({ kind: 'error', text: 'Something went wrong. Please try again.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor="attachment-file" className="label">Choose a file</label>
        <input id="attachment-file" ref={input} type="file" accept={ACCEPT_ATTRIBUTE} disabled={busy} className="input" />
        <p className="hint">Up to {formatBytes(limits.maxFileBytes)} per file. PDF, PNG, JPEG, WebP, text, CSV, Word, Excel or PowerPoint.</p>
      </div>
      <label className="flex min-h-[44px] items-start gap-3 rounded-xl border border-line p-3 text-sm">
        <input type="checkbox" checked={keepPrivate} onChange={(e) => setKeepPrivate(e.target.checked)} disabled={busy} className="mt-0.5 h-5 w-5 shrink-0" />
        <span><strong className="text-navy">Keep this file private (only me)</strong><br /><span className="text-xs text-muted">Unchecked means your customer can see and download it. You can change this later.</span></span>
      </label>
      <button type="button" onClick={upload} disabled={busy} className="btn-primary w-full sm:w-auto"><Paperclip size={16} aria-hidden="true" /> {busy ? 'Uploading, please wait...' : 'Upload file'}</button>
      {message ? <p role={message.kind === 'error' ? 'alert' : 'status'} className={`rounded-lg border p-3 text-sm ${message.kind === 'error' ? 'border-bad/30 bg-bad-bg text-bad' : 'border-ok/30 bg-ok-bg text-ok'}`}>{message.text}</p> : null}
    </div>
  );
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
  const back = backTo(String(formData.get('agreement_id') ?? ''));
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
