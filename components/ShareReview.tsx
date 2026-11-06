import Link from 'next/link';
import { EyeOff, FileText } from 'lucide-react';
import type { ReactNode } from 'react';
import { createClient } from '@/lib/supabase/server';
import { formatBytes, toAttachment, typeLabel, type Attachment } from '@/lib/attachments';
import { fileKind } from '@/lib/attachment-visibility';

/**
 * "Review what your customer will see". Wrap the customer link and share buttons with this component.
 * Shows visible files (with image previews) and which files are private and excluded.
 */
export async function ShareReview({ agreementId, children }: { agreementId: string; children: ReactNode }) {
  const supabase = createClient();
  const { data, error } = await supabase.from('agreement_attachments')
    .select('id, file_name, mime_type, size_bytes, created_at, customer_visible, storage_path')
    .eq('agreement_id', agreementId).eq('status', 'ready').order('created_at', { ascending: true });
  const rows = (error ? [] : (data ?? [])) as (Record<string, unknown> & { storage_path: string })[];
  const files = rows.map((r) => ({ file: toAttachment(r), path: r.storage_path })).filter((x): x is { file: Attachment; path: string } => x.file !== null);
  const visible = files.filter((x) => x.file.customerVisible);
  const hidden = files.filter((x) => !x.file.customerVisible);

  const imagePaths = visible.filter((x) => fileKind(x.file.mimeType) === 'image').map((x) => x.path);
  const signed = imagePaths.length > 0 ? await supabase.storage.from('attachments').createSignedUrls(imagePaths, 600) : null;
  const thumb = new Map((signed?.data ?? []).map((s) => [s.path ?? '', s.signedUrl]));

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-navy">Review what your customer will see</h3>
        {visible.length === 0 ? <p className="text-sm text-muted">Your customer will not see any files.</p> : (
          <ul className="space-y-3">
            {visible.map(({ file, path }) => {
              const url = thumb.get(path);
              return (
                <li key={file.id} className="flex min-w-0 items-center gap-3 rounded-xl border border-line p-2 text-sm">
                  {fileKind(file.mimeType) === 'image' && url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={url} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                  ) : <FileText size={28} className="shrink-0 text-brand" aria-hidden="true" />}
                  <span className="min-w-0">
                    <span className="block break-words font-semibold text-navy">{file.fileName}</span>
                    <span className="block text-xs text-muted">{typeLabel(file.mimeType)}{fileKind(file.mimeType) === 'pdf' ? ' (PDF preview)' : ''}, {formatBytes(file.sizeBytes)}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        {hidden.length > 0 ? (
          <div className="rounded-xl bg-page p-3 text-sm">
            <p className="flex items-center gap-2 font-medium text-navy"><EyeOff size={16} aria-hidden="true" /> Private, not shown to your customer</p>
            <ul className="mt-1 text-xs text-muted">{hidden.map(({ file }) => <li key={file.id} className="break-words">{file.fileName}</li>)}</ul>
          </div>
        ) : null}
        <Link href={`/dashboard/agreements/${agreementId}/attachments`} className="text-sm font-semibold text-brand">Manage files and visibility</Link>
      </div>
      {children}
    </div>
  );
}
