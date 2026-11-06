import { Download, Eye, FileText } from 'lucide-react';
import { formatBytes, typeLabel } from '@/lib/attachments';
import { fileKind, formatFileDate } from '@/lib/attachment-visibility';
import { ImageLightbox } from '@/components/ImageLightbox';

/** Everything needed to show one file to a customer. The links are app routes that check access; they are not storage links. */
export type CustomerFile = { id: string; fileName: string; mimeType: string; sizeBytes: number; createdAt: string; viewUrl: string; downloadUrl: string };

/**
 * "Files from your freelancer" for the customer page. Pass ONLY files that came from the server-side
 * customer_visible_attachments() function. This component trusts its input and never fetches anything itself.
 */
export function CustomerFiles({ files }: { files: CustomerFile[] }) {
  if (files.length === 0) return null;
  return (
    <section className="card space-y-4" aria-labelledby="customer-files-h">
      <div>
        <h2 id="customer-files-h" className="text-lg">Files from your freelancer</h2>
        <p className="text-sm text-muted">Look at these files before you approve, ask a question or decline. You can view and download each one.</p>
      </div>
      <ul className="space-y-4">
        {files.map((f) => {
          const kind = fileKind(f.mimeType);
          return (
            <li key={f.id} className="min-w-0 space-y-3 rounded-xl border border-line p-3">
              {kind === 'image' ? <ImageLightbox src={f.viewUrl} alt={f.fileName} downloadHref={f.downloadUrl} /> : null}
              {kind === 'pdf' ? (
                <object data={f.viewUrl} type="application/pdf" className="h-72 w-full rounded-xl border border-line" aria-label={`Preview of ${f.fileName}`}>
                  <p className="p-3 text-sm text-muted">Your browser cannot show this PDF here. Use View PDF.</p>
                </object>
              ) : null}
              <div className="min-w-0">
                <p className="flex items-start gap-2 break-words font-semibold text-navy"><FileText size={16} className="mt-1 shrink-0" aria-hidden="true" /> <span className="min-w-0 break-words">{f.fileName}</span></p>
                <p className="text-xs text-muted">{typeLabel(f.mimeType)}, {formatBytes(f.sizeBytes)}, added {formatFileDate(f.createdAt)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {kind === 'pdf' ? <a href={f.viewUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary"><Eye size={16} aria-hidden="true" /> View PDF</a> : null}
                <a href={f.downloadUrl} className="btn-primary"><Download size={16} aria-hidden="true" /> Download</a>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
