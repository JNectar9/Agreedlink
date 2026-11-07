// Small pure helpers for the attachments page and the customer approval page layouts.

/** "- Logo\n2. Colours\n• Files" becomes ["Logo", "Colours", "Files"]. One paragraph stays one item. */
export function splitDeliverables(text: string): string[] {
  return String(text ?? '')
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:[-*\u2022]+|\d+[.)])\s+/, '').trim())
    .filter((line) => line.length > 0);
}

export type PillTone = 'ok' | 'warn' | 'bad' | 'muted';

/** The agreement status pill on the owner's attachments page. Shows the real status, never a made-up one. */
export function agreementPill(status: string): { text: string; tone: PillTone } {
  switch (status) {
    case 'draft': return { text: 'Draft', tone: 'muted' };
    case 'awaiting_approval': return { text: 'Awaiting approval', tone: 'warn' };
    case 'approved': return { text: 'Approved', tone: 'ok' };
    case 'completed': return { text: 'Completed', tone: 'ok' };
    case 'declined': return { text: 'Declined', tone: 'bad' };
    case 'expired': return { text: 'Expired', tone: 'muted' };
    case 'cancelled': return { text: 'Cancelled', tone: 'muted' };
    default: return { text: 'In progress', tone: 'muted' };
  }
}

export const PILL_CLASS: Record<PillTone, string> = {
  ok: 'bg-ok-bg text-ok',
  warn: 'bg-warn-bg text-warn',
  bad: 'bg-bad-bg text-bad',
  muted: 'bg-slate-100 text-slate-700'
};

const KIND_LABEL: Record<string, string> = { image: 'Image', pdf: 'PDF' };

/** "Image", "PDF" or the file's own type label, for the line under a shared file's name. */
export function kindLabel(kind: string, fallback: string): string {
  return KIND_LABEL[kind] ?? fallback;
}

/** What the customer page says under its title, depending on whether any files were shared. */
export function reviewSubtitle(fileCount: number): string {
  return fileCount > 0
    ? 'Please review the project details and attached files before approving.'
    : 'Please review the project details before approving.';
}

/** The file types and size line under the upload box. It lists what is really allowed. */
export function uploadHint(maxFileBytes: number): string {
  const mb = Math.round((maxFileBytes / (1024 * 1024)) * 10) / 10;
  return `JPG, PNG, WebP, PDF, Word, Excel, PowerPoint, TXT, CSV \u2022 Max ${mb} MB`;
}
