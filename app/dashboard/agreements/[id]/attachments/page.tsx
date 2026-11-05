import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Download, Trash2 } from 'lucide-react';
import { requireSession } from '@/lib/data';
import { isUuid } from '@/lib/subscriptions';
import { MAX_FILES_PER_AGREEMENT, attachmentErrorCopy, formatBytes, parseLimits, toAttachment, typeLabel } from '@/lib/attachments';
import { formatDateTime } from '@/lib/time';
import { Notice } from '@/components/Notice';
import { SubmitButton } from '@/components/SubmitButton';
import { AttachmentUploader } from '@/components/AttachmentUploader';
import { deleteAttachmentAction } from '@/app/dashboard/attachments/actions';

export const metadata = { title: 'Attachments' };
export const dynamic = 'force-dynamic';

export default async function AttachmentsPage({ params, searchParams }: { params: { id: string }; searchParams: { error?: string; ok?: string } }) {
  if (!isUuid(params.id)) notFound();
  const { supabase, profile } = await requireSession();
  const { data: agreement } = await supabase.from('agreements').select('id, project_name').eq('id', params.id).maybeSingle();
  if (!agreement) notFound();

  const [limitsRes, listRes] = await Promise.all([
    supabase.rpc('my_attachment_limits'),
    supabase.from('agreement_attachments').select('id, file_name, mime_type, size_bytes, created_at').eq('agreement_id', params.id).eq('status', 'ready').order('created_at', { ascending: false })
  ]);
  const limits = parseLimits(limitsRes.data);
  const files = (listRes.data ?? []).map(toAttachment).filter((f): f is NonNullable<ReturnType<typeof toAttachment>> => f !== null);
  const allowed = Boolean(limits && limits.maxFileBytes > 0);
  const usedPercent = limits && limits.totalBytes > 0 ? Math.min(100, Math.round((limits.usedBytes / limits.totalBytes) * 100)) : 0;
  const atFileLimit = files.length >= MAX_FILES_PER_AGREEMENT;
  const setupError = limitsRes.error ?? listRes.error ?? null;

  return (
    <div className="max-w-3xl space-y-5">
      <Link href={`/dashboard/agreements/${params.id}`} className="inline-flex items-center gap-1 text-sm font-medium text-brand"><ArrowLeft size={16} aria-hidden="true" /> Back to agreement</Link>
      <div>
        <h1 className="text-2xl sm:text-3xl">Attachments</h1>
        <p className="break-words text-sm text-muted">{String((agreement as { project_name: string }).project_name)}</p>
      </div>
      <Notice error={searchParams.error} ok={searchParams.ok} />
      {setupError ? <Notice error={attachmentErrorCopy(setupError)} /> : null}

      {!allowed && !setupError ? (
        <section className="card space-y-3">
          <h2 className="text-lg">Attachments are part of Pro and Premium</h2>
          <p className="text-sm text-muted">Pro lets you attach files up to 10 MB each (100 MB in total). Premium allows up to 50 MB each (250 MB in total). Files are private to you and are not shown to your customer.</p>
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
            <p className="text-xs text-muted">Counts all your agreements. Files are private, are not shown to your customer, and can be deleted at any time.</p>
          </section>

          <section className="card space-y-3" aria-label="Add a file">
            <h2 className="text-lg">Add a file</h2>
            {atFileLimit ? (
              <p role="status" className="rounded-lg border border-warn/30 bg-warn-bg p-3 text-sm text-warn">
                This agreement already has {MAX_FILES_PER_AGREEMENT} files. Delete one to add another.
              </p>
            ) : (
              <AttachmentUploader agreementId={params.id} limits={limits} />
            )}
          </section>
        </>
      ) : null}

      <section className="card" aria-label="Files">
        <h2 className="text-lg">Files on this agreement</h2>
        {files.length === 0 ? <p className="mt-3 text-sm text-muted">No files yet.</p> : (
          <ul className="mt-2 divide-y divide-line">
            {files.map((f) => (
              <li key={f.id} className="space-y-2 py-3 text-sm">
                <div className="min-w-0">
                  <p className="break-words font-semibold text-navy">{f.fileName}</p>
                  <p className="text-xs text-muted">{typeLabel(f.mimeType)}, {formatBytes(f.sizeBytes)}, added {formatDateTime(f.createdAt, profile.timezone)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <a href={`/dashboard/attachments/${f.id}/download`} className="btn-secondary"><Download size={16} aria-hidden="true" /> Download</a>
                  <details className="rounded-xl border border-line px-3 py-2">
                    <summary className="cursor-pointer font-semibold text-bad">Delete</summary>
                    <form action={deleteAttachmentAction} className="mt-2 space-y-2">
                      <input type="hidden" name="attachment_id" value={f.id} />
                      <input type="hidden" name="agreement_id" value={params.id} />
                      <p className="text-xs text-muted">This permanently removes the file.</p>
                      <SubmitButton variant="danger" pendingText="Deleting..." className="w-full"><Trash2 size={16} aria-hidden="true" /> Delete file</SubmitButton>
                    </form>
                  </details>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
