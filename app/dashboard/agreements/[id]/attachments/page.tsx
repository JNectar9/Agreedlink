import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Download, Eye, EyeOff, FileText, Pencil, Trash2 } from 'lucide-react';
import { requireSession } from '@/lib/data';
import { isUuid } from '@/lib/subscriptions';
import { MAX_FILES_PER_AGREEMENT, attachmentErrorCopy, formatBytes, parseLimits, toAttachment, typeLabel, type Attachment } from '@/lib/attachments';
import { VISIBILITY_NOTE, compareWithApproval, fileKind, visibilityBadge } from '@/lib/attachment-visibility';
import { formatDateTime } from '@/lib/time';
import { Notice } from '@/components/Notice';
import { SubmitButton } from '@/components/SubmitButton';
import { AttachmentUploader } from '@/components/AttachmentUploader';
import { ImageLightbox } from '@/components/ImageLightbox';
import { changeVisibilityFormAction, deleteAttachmentAction, renameAttachmentFormAction } from '@/app/dashboard/attachments/actions';

export const metadata = { title: 'Attachments' };
export const dynamic = 'force-dynamic';

export default async function AttachmentsPage({ params, searchParams }: { params: { id: string }; searchParams: { error?: string; ok?: string } }) {
  if (!isUuid(params.id)) notFound();
  const { supabase, profile } = await requireSession();
  const { data: agreement } = await supabase.from('agreements').select('id, project_name, current_version').eq('id', params.id).maybeSingle();
  if (!agreement) notFound();
  const version = Number((agreement as { current_version?: number }).current_version ?? 1);

  const [limitsRes, listRes, recordRes, snapRes] = await Promise.all([
    supabase.rpc('my_attachment_limits'),
    supabase.from('agreement_attachments').select('id, file_name, mime_type, size_bytes, created_at, customer_visible, storage_path').eq('agreement_id', params.id).eq('status', 'ready').order('created_at', { ascending: false }),
    supabase.from('approval_file_records').select('approved_at').eq('agreement_id', params.id).eq('version_number', version).maybeSingle(),
    supabase.from('approval_attachment_snapshots').select('attachment_id, file_name, mime_type, size_bytes').eq('agreement_id', params.id).eq('version_number', version).order('file_added_at', { ascending: true })
  ]);
  const limits = parseLimits(limitsRes.data);
  const rows = (listRes.data ?? []) as (Record<string, unknown> & { storage_path: string })[];
  const items = rows.map((r) => ({ file: toAttachment(r), path: r.storage_path })).filter((x): x is { file: Attachment; path: string } => x.file !== null);
  const files = items.map((x) => x.file);
  const allowed = Boolean(limits && limits.maxFileBytes > 0);
  const usedPercent = limits && limits.totalBytes > 0 ? Math.min(100, Math.round((limits.usedBytes / limits.totalBytes) * 100)) : 0;
  const atFileLimit = files.length >= MAX_FILES_PER_AGREEMENT;
  const setupError = limitsRes.error ?? listRes.error ?? null;

  // Owner-only thumbnails: short-lived private links made with the owner's own session.
  const imagePaths = items.filter((x) => fileKind(x.file.mimeType) === 'image').map((x) => x.path);
  const signed = imagePaths.length > 0 ? await supabase.storage.from('attachments').createSignedUrls(imagePaths, 600) : null;
  const thumb = new Map((signed?.data ?? []).map((s) => [s.path ?? '', s.signedUrl]));

  const record = recordRes.error ? null : (recordRes.data as { approved_at: string } | null);
  const snapshot = snapRes.error ? [] : ((snapRes.data ?? []) as { attachment_id: string; file_name: string; mime_type: string; size_bytes: number }[]);
  const comparison = record ? compareWithApproval(files.filter((f) => f.customerVisible).map((f) => ({ id: f.id, fileName: f.fileName })), snapshot.map((s) => ({ id: s.attachment_id, fileName: s.file_name }))) : null;

  return (
    <div className="max-w-3xl space-y-5">
      <Link href={`/dashboard/agreements/${params.id}`} className="inline-flex items-center gap-1 text-sm font-medium text-brand"><ArrowLeft size={16} aria-hidden="true" /> Back to agreement</Link>
      <div>
        <h1 className="text-2xl sm:text-3xl">Attachments</h1>
        <p className="break-words text-sm text-muted">{String((agreement as { project_name: string }).project_name)}</p>
        <p className="mt-2 text-sm text-ink">Visible files are shown to your customer on their approval page. Private files are never shown. You can change this per file.</p>
      </div>
      <Notice error={searchParams.error} ok={searchParams.ok} />
      {setupError ? <Notice error={attachmentErrorCopy(setupError)} /> : null}

      {!allowed && !setupError ? (
        <section className="card space-y-3">
          <h2 className="text-lg">Attachments are part of Pro and Premium</h2>
          <p className="text-sm text-muted">Pro lets you attach files up to 10 MB each (100 MB in total). Premium allows up to 50 MB each (250 MB in total). {VISIBILITY_NOTE}</p>
          <Link href="/dashboard/billing" className="btn-primary w-full sm:w-auto">See plans on Billing</Link>
        </section>
      ) : null}

      {allowed && limits ? (
        <>
          <section className="card space-y-3" aria-label="Storage used">
            <p className="text-sm text-ink">Storage used: <strong>{formatBytes(limits.usedBytes)}</strong> of {formatBytes(limits.totalBytes)}</p>
            <div className="h-2 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={usedPercent} aria-label="Storage used">
              <div className={`h-full rounded-full ${usedPercent >= 90 ? 'bg-bad' : 'bg-brand'}`} style={{ width: `${usedPercent}%` }} />
            </div>
            <p className="text-xs text-muted">Counts all your agreements.</p>
          </section>

          <section className="card space-y-3" aria-label="Add a file">
            <h2 className="text-lg">Add a file</h2>
            {atFileLimit ? (
              <p role="status" className="rounded-lg border border-warn/30 bg-warn-bg p-3 text-sm text-warn">This agreement already has {MAX_FILES_PER_AGREEMENT} files. Delete one to add another.</p>
            ) : (
              <AttachmentUploader agreementId={params.id} limits={limits} />
            )}
          </section>
        </>
      ) : null}

      {comparison && !comparison.same ? (
        <section role="status" className="space-y-1 rounded-xl border border-warn/30 bg-warn-bg p-3 text-sm text-warn" aria-label="Files changed since approval">
          <p className="font-semibold">The files your customer can see now differ from the files recorded at approval.</p>
          <p className="text-xs">The approval record is kept as it was. It has not been changed.</p>
          {comparison.added.length > 0 ? <p className="break-words text-xs">Added since: {comparison.added.join(', ')}</p> : null}
          {comparison.removed.length > 0 ? <p className="break-words text-xs">Removed or made private since: {comparison.removed.join(', ')}</p> : null}
          {comparison.renamed.length > 0 ? <p className="break-words text-xs">Renamed since: {comparison.renamed.join('; ')}</p> : null}
        </section>
      ) : null}

      <section className="card" aria-label="Files">
        <h2 className="text-lg">Files on this agreement</h2>
        {files.length === 0 ? <p className="mt-3 text-sm text-muted">No files yet.</p> : (
          <ul className="mt-2 divide-y divide-line">
            {items.map(({ file: f, path }) => {
              const badge = visibilityBadge(f.customerVisible);
              const kind = fileKind(f.mimeType);
              const url = thumb.get(path);
              return (
                <li key={f.id} className="space-y-3 py-4 text-sm">
                 {kind === 'image' && url ? (
                    <ImageLightbox src={url} alt={f.fileName} downloadHref={`/dashboard/attachments/${f.id}/download`} showPreviewButton />
                  ) : null}
                  <div className="min-w-0">
                    <p className="flex items-start gap-2 break-words font-semibold text-navy"><FileText size={16} className="mt-1 shrink-0" aria-hidden="true" /> <span className="min-w-0 break-words">{f.fileName}</span></p>
                    <p className="text-xs text-muted">{typeLabel(f.mimeType)}, {formatBytes(f.sizeBytes)}, added {formatDateTime(f.createdAt, profile.timezone)}</p>
                    <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${badge.tone === 'visible' ? 'bg-ok-bg text-ok' : 'bg-page text-muted'}`}>
                      {badge.tone === 'visible' ? <Eye size={12} aria-hidden="true" /> : <EyeOff size={12} aria-hidden="true" />} {badge.text}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                  {kind === 'pdf' || (kind === 'image' && !url) ? <a href={`/dashboard/attachments/${f.id}/download?inline=1`}target="_blank" rel="noopener noreferrer" className="btn-secondary"><Eye size={16} aria-hidden="true" /> Preview</a> : null}
                    <a href={`/dashboard/attachments/${f.id}/download`} className="btn-secondary"><Download size={16} aria-hidden="true" /> Download</a>
                    <form action={changeVisibilityFormAction}>
                      <input type="hidden" name="attachment_id" value={f.id} />
                      <input type="hidden" name="agreement_id" value={params.id} />
                      <input type="hidden" name="make_visible" value={f.customerVisible ? 'false' : 'true'} />
                      <button type="submit" className="btn-secondary">{f.customerVisible ? <><EyeOff size={16} aria-hidden="true" /> Make private</> : <><Eye size={16} aria-hidden="true" /> Show to customer</>}</button>
                    </form>
                  </div>
                  <details className="rounded-xl border border-line px-3 py-2">
                    <summary className="flex cursor-pointer items-center gap-2 font-semibold text-navy"><Pencil size={14} aria-hidden="true" /> Rename</summary>
                    <form action={renameAttachmentFormAction} className="mt-2 space-y-2">
                      <input type="hidden" name="attachment_id" value={f.id} />
                      <input type="hidden" name="agreement_id" value={params.id} />
                      <label htmlFor={`rename-${f.id}`} className="label">New file name</label>
                      <input id={`rename-${f.id}`} name="file_name" defaultValue={f.fileName} maxLength={150} required className="input" />
                      <button type="submit" className="btn-primary w-full sm:w-auto">Save name</button>
                    </form>
                  </details>
                  <details className="rounded-xl border border-line px-3 py-2">
                    <summary className="cursor-pointer font-semibold text-bad">Delete</summary>
                    <form action={deleteAttachmentAction} className="mt-2 space-y-2">
                      <input type="hidden" name="attachment_id" value={f.id} />
                      <input type="hidden" name="agreement_id" value={params.id} />
                      <p className="text-xs text-muted">This permanently removes the file. Approval records that already listed it are kept.</p>
                      <SubmitButton variant="danger" pendingText="Deleting..." className="w-full"><Trash2 size={16} aria-hidden="true" /> Delete file</SubmitButton>
                    </form>
                  </details>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {record ? (
        <section className="card" aria-label="Files recorded at approval">
          <h2 className="text-lg">Files recorded at approval</h2>
          <p className="text-xs text-muted">Version {version}, approved {formatDateTime(record.approved_at, profile.timezone)}. This list is a permanent record and does not change when files change.</p>
          {snapshot.length === 0 ? <p className="mt-2 text-sm text-muted">No files were shared when this version was approved.</p> : (
            <ul className="mt-2 space-y-1 text-sm">{snapshot.map((s) => <li key={s.attachment_id} className="break-words">{s.file_name} <span className="text-xs text-muted">({typeLabel(s.mime_type)}, {formatBytes(s.size_bytes)})</span></li>)}</ul>
          )}
        </section>
      ) : null}
    </div>
  );
}
