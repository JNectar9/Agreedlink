import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, FileText } from 'lucide-react';
import { requireSession } from '@/lib/data';
import { isUuid } from '@/lib/subscriptions';
import { MAX_FILES_PER_AGREEMENT, attachmentErrorCopy, formatBytes, parseLimits, toAttachment, typeLabel, type Attachment } from '@/lib/attachments';
import { VISIBILITY_NOTE, compareWithApproval, fileKind } from '@/lib/attachment-visibility';
import { PILL_CLASS, agreementPill } from '@/lib/review-layout';
import { formatDateTime } from '@/lib/time';
import { Notice } from '@/components/Notice';
import { ClearNoticeParams } from '@/components/ClearNoticeParams';
import { AttachmentUploader } from '@/components/AttachmentUploader';
import { AttachmentCard } from '@/components/AttachmentCard';

export const metadata = { title: 'Attachments' };
export const dynamic = 'force-dynamic';

export default async function AttachmentsPage({ params, searchParams }: { params: { id: string }; searchParams: { error?: string; ok?: string } }) {
  if (!isUuid(params.id)) notFound();
  const { supabase, profile } = await requireSession();
  const { data: agreement } = await supabase.from('agreements').select('id, project_name, current_version, status').eq('id', params.id).maybeSingle();
  if (!agreement) notFound();
  const version = Number((agreement as { current_version?: number }).current_version ?? 1);
  const pill = agreementPill(String((agreement as { status?: string }).status ?? ''));

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
  const slotsLeft = Math.max(0, MAX_FILES_PER_AGREEMENT - files.length);
  const setupError = limitsRes.error ?? listRes.error ?? null;

  // Owner-only thumbnails: short-lived private links made with the owner's own session.
  const imagePaths = items.filter((x) => fileKind(x.file.mimeType) === 'image').map((x) => x.path);
  const signed = imagePaths.length > 0 ? await supabase.storage.from('attachments').createSignedUrls(imagePaths, 600) : null;
  const thumb = new Map<string, string>((signed?.data ?? []).map((s) => [s.path ?? '', s.signedUrl] as [string, string]));

  const record = recordRes.error ? null : (recordRes.data as { approved_at: string } | null);
  const snapshot = snapRes.error ? [] : ((snapRes.data ?? []) as { attachment_id: string; file_name: string; mime_type: string; size_bytes: number }[]);
  const comparison = record ? compareWithApproval(files.filter((f) => f.customerVisible).map((f) => ({ id: f.id, fileName: f.fileName })), snapshot.map((s) => ({ id: s.attachment_id, fileName: s.file_name }))) : null;

  return (
    <div className="max-w-3xl space-y-5">
      <Link href={`/dashboard/agreements/${params.id}`} className="inline-flex min-h-[44px] items-center gap-2 text-sm font-medium text-ink"><ArrowLeft size={18} aria-hidden="true" /> Back to agreement</Link>
      <div>
        <h1 className="text-3xl font-bold">Attachments</h1>
        <p className="mt-1 text-muted">Manage files attached to this agreement.</p>
      </div>
      <ClearNoticeParams />
      <Notice error={searchParams.error} ok={searchParams.ok} />
      {setupError ? <Notice error={attachmentErrorCopy(setupError)} /> : null}

      <section className="flex items-center gap-3 rounded-2xl border border-brand/20 bg-brand-soft p-4" aria-label="Agreement">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-brand" aria-hidden="true"><FileText size={26} /></span>
        <div className="min-w-0 flex-1">
          <p className="break-words text-lg font-bold text-navy">{String((agreement as { project_name: string }).project_name)}</p>
          <p className="text-sm text-muted">Your agreement files and documents</p>
        </div>
        <span className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${PILL_CLASS[pill.tone]}`}>
          <span className="h-2 w-2 rounded-full bg-current" aria-hidden="true" /> {pill.text}
        </span>
      </section>

      {!allowed && !setupError ? (
        <section className="card space-y-3">
          <h2 className="text-lg">Attachments are part of Pro and Premium</h2>
          <p className="text-sm text-muted">Pro lets you attach files up to 10 MB each (100 MB in total). Premium allows up to 50 MB each (250 MB in total). {VISIBILITY_NOTE}</p>
          <Link href="/dashboard/billing" className="btn-primary w-full sm:w-auto">See plans on Billing</Link>
        </section>
      ) : null}

      {allowed && limits ? (
        <section className="space-y-3" aria-label="Add files">
          {slotsLeft === 0 ? (
            <p role="status" className="rounded-xl border border-warn/30 bg-warn-bg p-3 text-sm text-warn">This agreement already has {MAX_FILES_PER_AGREEMENT} files. Delete one to add another.</p>
          ) : (
            <AttachmentUploader agreementId={params.id} limits={limits} slotsLeft={slotsLeft} />
          )}
          <div aria-label="Storage used">
            <p className="text-xs text-muted">Storage used: <strong className="text-ink">{formatBytes(limits.usedBytes)}</strong> of {formatBytes(limits.totalBytes)}. Counts all your agreements. {VISIBILITY_NOTE}</p>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={usedPercent} aria-label="Storage used">
              <div className={`h-full rounded-full ${usedPercent >= 90 ? 'bg-bad' : 'bg-brand'}`} style={{ width: `${usedPercent}%` }} />
            </div>
          </div>
        </section>
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

      <section aria-label="Files">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xl font-bold">Your attachments</h2>
          <span className="rounded-full bg-brand px-3 py-1 text-sm font-semibold text-white">{files.length} {files.length === 1 ? 'file' : 'files'}</span>
        </div>
        {files.length === 0 ? <p className="card mt-3 text-sm text-muted">No files yet.</p> : (
          <ul className="mt-3 space-y-4">
            {items.map(({ file: f, path }) => (
              <AttachmentCard key={f.id} id={f.id} agreementId={params.id} fileName={f.fileName} mimeType={f.mimeType} sizeBytes={f.sizeBytes}
                createdAt={f.createdAt} customerVisible={f.customerVisible} thumbUrl={thumb.get(path) ?? null} />
            ))}
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
