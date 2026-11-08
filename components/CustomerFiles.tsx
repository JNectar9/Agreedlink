import { Download, ExternalLink, FileText } from 'lucide-react';
import { formatBytes, typeLabel } from '@/lib/attachments';
import { fileKind } from '@/lib/attachment-visibility';
import { kindLabel } from '@/lib/review-layout';
import { ImageLightbox } from '@/components/ImageLightbox';

/** Everything needed to show one file to a customer. The links are app routes that check access; they are not storage links. */
export type CustomerFile = { id: string; fileName: string; mimeType: string; sizeBytes: number; createdAt: string; viewUrl: string; downloadUrl: string };

const SHARED_PILL = 'rounded-full bg-ok-bg px-2.5 py-1 text-xs font-semibold text-ok';
const LINK = 'inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-brand';

/**
 * "Files shared with you" for the customer page. Pass ONLY files that came from the server-side
 * customer_files() function. This component trusts its input and never fetches anything itself.
 */
export function CustomerFiles({ files }: { files: CustomerFile[] }) {
  if (files.length === 0) return null;
  return (
    <section className="rounded-2xl border border-line bg-white p-4 shadow-sm" aria-labelledby="customer-files-h">
      <h2 id="customer-files-h" className="text-lg font-bold text-navy">Files shared with you</h2>
      <ul className="mt-3 space-y-5">
        {files.map((f) => {
          const kind = fileKind(f.mimeType);
          return (
            <li key={f.id} className="min-w-0 space-y-2">
              {kind === 'image' ? (
                <div className="relative">
                  <ImageLightbox src={f.viewUrl} alt={f.fileName} downloadHref={f.downloadUrl} />
                  <span className={`pointer-events-none absolute right-2 top-2 ${SHARED_PILL}`}>Shared with you</span>
                </div>
              ) : null}
              {kind === 'pdf' ? (
                <object data={f.viewUrl} type="application/pdf" className="h-72 w-full rounded-xl border border-line" aria-label={`Preview of ${f.fileName}`}>
                  <p className="p-3 text-sm text-muted">Your browser cannot show this PDF here. Use View full size file.</p>
                </object>
              ) : null}
              {kind === 'other' ? (
                <div className="flex h-24 flex-col items-center justify-center rounded-xl border border-line bg-page text-muted">
                  <FileText size={28} aria-hidden="true" />
                  <span className="mt-1 text-xs">{typeLabel(f.mimeType)}</span>
                </div>
              ) : null}
              <div className="min-w-0">
                <p className="break-words font-bold text-navy">{f.fileName}</p>
                <p className="text-sm text-muted">{kindLabel(kind, typeLabel(f.mimeType))} &bull; {formatBytes(f.sizeBytes)}</p>
                {kind !== 'image' ? <span className={`mt-1 inline-block ${SHARED_PILL}`}>Shared with you</span> : null}
              </div>
              <div className="flex flex-wrap gap-x-5">
                {kind !== 'other' ? (
                  <a href={f.viewUrl} target="_blank" rel="noopener noreferrer" className={LINK}>View full size file <ExternalLink size={14} aria-hidden="true" /></a>
                ) : null}
                <a href={f.downloadUrl} className={LINK}><Download size={14} aria-hidden="true" /> Download</a>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
