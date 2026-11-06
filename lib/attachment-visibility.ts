// Helpers for customer-visible attachments and approval evidence. Pure functions, no database access.
// Who may see a file is decided in the database and on the server (customer_visible = true AND status = 'ready').
// Nothing here grants access; it only prepares text and comparisons.

export const VISIBILITY_NOTE = 'Files are visible to your customer unless you mark them private. Private files are never shown to your customer.';
export const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

export type FileKind = 'image' | 'pdf' | 'other';
export const fileKind = (mime: string): FileKind => (IMAGE_TYPES.includes(mime) ? 'image' : mime === 'application/pdf' ? 'pdf' : 'other');

export type FileRef = { id: string; fileName: string };
export type ApprovalComparison = { same: boolean; added: string[]; removed: string[]; renamed: string[] };

/**
 * Compares the files a customer can see now with the files recorded at approval. Files are matched by id, so a
 * replaced file (a new upload) shows as one removed and one added. A visible file made private shows as removed.
 */
export function compareWithApproval(current: FileRef[], approved: FileRef[]): ApprovalComparison {
  const now = new Map(current.map((f) => [f.id, f.fileName]));
  const then = new Map(approved.map((f) => [f.id, f.fileName]));
  const added = current.filter((f) => !then.has(f.id)).map((f) => f.fileName);
  const removed = approved.filter((f) => !now.has(f.id)).map((f) => f.fileName);
  const renamed = approved.filter((f) => now.has(f.id) && now.get(f.id) !== f.fileName).map((f) => `${f.fileName} is now ${now.get(f.id)}`);
  return { same: added.length === 0 && removed.length === 0 && renamed.length === 0, added, removed, renamed };
}

export function visibilityBadge(customerVisible: boolean): { text: string; tone: 'visible' | 'private' } {
  return customerVisible ? { text: 'Visible to customer', tone: 'visible' } : { text: 'Private \u2014 only me', tone: 'private' };
}

export function formatFileDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
}
