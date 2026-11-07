'use client';
import { useRef, useState, type DragEvent } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Loader2, UploadCloud, XCircle } from 'lucide-react';
import { createBrowserSupabase } from '@/lib/supabase/browser';
import { abortAttachmentAction, beginAttachmentAction, finishAttachmentAction, setVisibilityAction } from '@/app/dashboard/attachments/actions';
import { ACCEPT_ATTRIBUTE, checkFileChoice, formatBytes, type AttachmentLimits } from '@/lib/attachments';
import { uploadHint } from '@/lib/review-layout';

type Props = { agreementId: string; limits: AttachmentLimits; slotsLeft?: number };
type Row = { key: string; name: string; state: 'waiting' | 'uploading' | 'done' | 'error'; text: string };

/**
 * Upload box: choose files or drag and drop them. Files go straight from the browser to private storage using a
 * one-time link, because the app's server cannot receive large files. The database checks every limit before and
 * after each upload. Several files are uploaded one after another.
 */
export function AttachmentUploader({ agreementId, limits, slotsLeft = 10 }: Props) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [keepPrivate, setKeepPrivate] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);

  const patch = (key: string, change: Partial<Row>) => setRows((all) => all.map((r) => (r.key === key ? { ...r, ...change } : r)));

  /** Uploads one file. Returns an error sentence, or null when it worked. */
  async function uploadOne(file: File, usedBytes: number): Promise<string | null> {
    const problem = checkFileChoice({ name: file.name, type: file.type, size: file.size }, { ...limits, usedBytes });
    if (problem) return problem;

    const begin = await beginAttachmentAction({ agreementId, fileName: file.name, mimeType: file.type, size: file.size });
    if (!begin.ok) return begin.error;

    // Private is decided while the file is still pending, so a private file is never visible, even briefly.
    if (keepPrivate) {
      const vis = await setVisibilityAction(begin.id, false);
      if (!vis.ok) { await abortAttachmentAction(begin.id); return vis.error; }
    }

    const { error } = await createBrowserSupabase().storage.from('attachments').uploadToSignedUrl(begin.path, begin.token, file, { contentType: file.type });
    if (error) {
      await abortAttachmentAction(begin.id);
      return 'The upload failed. Check your connection and try again.';
    }
    const done = await finishAttachmentAction(begin.id);
    return done.ok ? null : done.error;
  }

  async function uploadMany(list: File[]) {
    if (busy || list.length === 0) return;
    const chosen = list.slice(0, Math.max(0, slotsLeft));
    const skipped = list.length - chosen.length;
    const stamp = Date.now();
    const initial: Row[] = chosen.map((f, i) => ({ key: `${stamp}-${i}`, name: f.name, state: 'waiting', text: 'Waiting' }));
    if (skipped > 0) initial.push({ key: `${stamp}-skip`, name: `${skipped} more file${skipped === 1 ? '' : 's'}`, state: 'error', text: 'Not added: an agreement can have up to 10 files.' });
    setRows(initial);
    setBusy(true);
    let used = limits.usedBytes;
    try {
      for (let i = 0; i < chosen.length; i += 1) {
        const key = `${stamp}-${i}`;
        patch(key, { state: 'uploading', text: 'Uploading...' });
        let failure: string | null;
        try {
          failure = await uploadOne(chosen[i], used);
        } catch {
          failure = 'Something went wrong. Please try again.';
        }
        if (failure) patch(key, { state: 'error', text: failure });
        else { used += chosen[i].size; patch(key, { state: 'done', text: keepPrivate ? 'Uploaded. Only you can see it.' : 'Uploaded. Your customer can see it.' }); }
      }
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
      router.refresh();
    }
  }

  function onDrop(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setDragging(false);
    if (!busy) void uploadMany(Array.from(e.dataTransfer.files));
  }

  return (
    <div className="space-y-3">
      <label
        htmlFor="attachment-file"
        onDragOver={(e) => { e.preventDefault(); if (!busy) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed px-4 py-7 text-center focus-within:ring-2 focus-within:ring-brand/40 ${
          dragging ? 'border-brand bg-brand-soft' : 'border-brand/50 bg-brand-soft/40'
        } ${busy ? 'cursor-wait opacity-70' : ''}`}
      >
        <UploadCloud size={40} className="text-brand" aria-hidden="true" />
        <span className="mt-2 text-lg font-bold text-brand">Choose files</span>
        <span className="text-sm text-ink">or drag and drop here</span>
        <span className="mt-2 max-w-xs text-xs text-muted">{uploadHint(limits.maxFileBytes)}</span>
        <input id="attachment-file" ref={input} type="file" multiple accept={ACCEPT_ATTRIBUTE} disabled={busy} className="sr-only"
          onChange={(e) => void uploadMany(Array.from(e.target.files ?? []))} />
      </label>

      <label className="flex min-h-[44px] items-start gap-3 rounded-xl border border-line bg-white p-3 text-sm">
        <input type="checkbox" checked={keepPrivate} onChange={(e) => setKeepPrivate(e.target.checked)} disabled={busy} className="mt-0.5 h-5 w-5 shrink-0" />
        <span>
          <strong className="text-navy">Keep this file private (only me)</strong>
          <br />
          <span className="text-xs text-muted">Unchecked means your customer can see and download it. You can change this later.</span>
        </span>
      </label>

      <p className="text-xs text-muted">Up to {formatBytes(limits.maxFileBytes)} per file. Files start uploading as soon as you choose them.</p>

      {rows.length > 0 ? (
        <ul className="space-y-2" aria-live="polite">
          {rows.map((r) => (
            <li key={r.key} className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${
              r.state === 'error' ? 'border-bad/30 bg-bad-bg text-bad' : r.state === 'done' ? 'border-ok/30 bg-ok-bg text-ok' : 'border-line bg-white text-ink'
            }`}>
              {r.state === 'uploading' ? <Loader2 size={16} className="mt-0.5 shrink-0 animate-spin" aria-hidden="true" />
                : r.state === 'done' ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                : r.state === 'error' ? <XCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" /> : null}
              <span className="min-w-0 break-words"><strong>{r.name}</strong>: {r.text}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
