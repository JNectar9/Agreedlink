import Link from 'next/link';
import { Eye, EyeOff, FileText } from 'lucide-react';
import type { ReactNode } from 'react';
import { createClient } from '@/lib/supabase/server';
import { formatBytes, toAttachment, typeLabel, type Attachment } from '@/lib/attachments';
import { fileKind, visibilityBadge } from '@/lib/attachment-visibility';
import { changeVisibilityFormAction } from '@/app/dashboard/attachments/actions';

/**
 * "Review what your customer will see", shown on the agreement page above the share buttons.
 * Every file has a badge and a Make private / Make visible button that saves straight away and brings you back here,
 * so the customer link and the Copy / WhatsApp / Email / Share buttons never leave the screen.
 */
export async function ShareReview({ agreementId, children }: { agreementId: string; children: ReactNode }) {
  const supabase = createClient();
  const { data, error } = await supabase.from('agreement_attachments')
    .select('id, file_name, mime_type, size_bytes, created_at, customer_visible, storage_path')
    .eq('agreement_id', agreementId).eq('status', 'ready').order('created_at', { ascending: true });
  const rows = (error ? [] : (data ?? [])) as (Record<string, unknown> & { storage_path: string })[];
  const files = rows.map((r) => ({ file: toAttachment(r), path: r.storage_path })).filter((x): x is { file: Attachment; path: string } => x.file !== null);
  const visibleCount = files.filter((x) => x.file.customerVisible).length;

  // Owner-only thumbnails: short-lived private links made with the owner's own session.
  const imagePaths = files.filter((x) => fileKind(x.file.mimeType) === 'image').map((x) => x.path);
  const signed = imagePaths.length > 0 ? await supabase.storage.from('attachments').createSignedUrls(imagePaths, 600) : null;
  const thumb = new Map((signed?.data ?? []).map((s) => [s.path ?? '', s.signedUrl]));

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-navy">Review what your customer will see</h3>
        <p className="text-sm text-muted">
          {files.length === 0
            ? 'No files on this agreement yet.'
            : `${visibleCount} of ${files.length} file${files.length === 1 ? ' is' : 's are'} visible to your customer. Private files are never shown.`}
        </p>
        {files.length > 0 ? (
          <ul className="space-y-3">
            {files.map(({ file, path }) => {
              const url = thumb.get(path);
              const badge = visibilityBadge(file.customerVisible);
              return (
                <li key={file.id} className="min-w-0 space-y-2 rounded-xl border border-line p-2 text-sm">
                  <div className="flex min-w-0 items-center gap-3">
                    {fileKind(file.mimeType) === 'image' && url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={url} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                    ) : <FileText size={28} className="shrink-0 text-brand" aria-hidden="true" />}
                    <span className="min-w-0">
                      <span className="block break-words font-semibold text-navy">{file.fileName}</span>
                      <span className="block text-xs text-muted">{typeLabel(file.mimeType)}, {formatBytes(file.sizeBytes)}</span>
                      <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${badge.tone === 'visible' ? 'bg-ok-bg text-ok' : 'bg-page text-muted'}`}>
                        {badge.tone === 'visible' ? <Eye size={12} aria-hidden="true" /> : <EyeOff size={12} aria-hidden="true" />} {badge.text}
                      </span>
                    </span>
                  </div>
                  <form action={changeVisibilityFormAction}>
                    <input type="hidden" name="attachment_id" value={file.id} />
                    <input type="hidden" name="agreement_id" value={agreementId} />
                    <input type="hidden" name="return_to" value="agreement" />
                    <input type="hidden" name="make_visible" value={file.customerVisible ? 'false' : 'true'} />
                    <button type="submit" className="btn-secondary w-full sm:w-auto">
                      {file.customerVisible ? <><EyeOff size={16} aria-hidden="true" /> Make private</> : <><Eye size={16} aria-hidden="true" /> Make visible</>}
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        ) : null}
        <Link href={`/dashboard/agreements/${agreementId}/attachments`} target="_blank" rel="noopener noreferrer" className="inline-block text-sm font-semibold text-brand">Add, rename or delete files (opens in a new tab)</Link>
      </div>
      {children}
    </div>
  );
}
