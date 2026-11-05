'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Paperclip } from 'lucide-react';
import { createBrowserSupabase } from '@/lib/supabase/browser';
import { abortAttachmentAction, beginAttachmentAction, finishAttachmentAction } from '@/app/dashboard/attachments/actions';
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

      const { error } = await createBrowserSupabase().storage.from('attachments').uploadToSignedUrl(begin.path, begin.token, file, { contentType: file.type });
      if (error) {
        await abortAttachmentAction(begin.id);
        setMessage({ kind: 'error', text: 'The upload failed. Check your connection and try again.' });
        return;
      }
      const done = await finishAttachmentAction(begin.id);
      if (!done.ok) { setMessage({ kind: 'error', text: done.error }); return; }

      if (input.current) input.current.value = '';
      setMessage({ kind: 'ok', text: 'File uploaded.' });
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
      <button type="button" onClick={upload} disabled={busy} className="btn-primary w-full sm:w-auto"><Paperclip size={16} aria-hidden="true" /> {busy ? 'Uploading, please wait...' : 'Upload file'}</button>
      {message ? <p role={message.kind === 'error' ? 'alert' : 'status'} className={`rounded-lg border p-3 text-sm ${message.kind === 'error' ? 'border-bad/30 bg-bad-bg text-bad' : 'border-ok/30 bg-ok-bg text-ok'}`}>{message.text}</p> : null}
    </div>
  );
}
