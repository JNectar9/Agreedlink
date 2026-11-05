// Agreement attachments. The database (supabase/migrations/20261105_agreement_attachments.sql) enforces the plan,
// file type, size, total storage and file count. This file validates early so people get a clear message first.

export const ALLOWED_TYPES: Record<string, string> = {
  'application/pdf': 'PDF',
  'image/png': 'PNG image',
  'image/jpeg': 'JPEG image',
  'image/webp': 'WebP image',
  'text/plain': 'Text file',
  'text/csv': 'CSV file',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel spreadsheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PowerPoint'
};

export const ACCEPT_ATTRIBUTE = '.pdf,.png,.jpg,.jpeg,.webp,.txt,.csv,.docx,.xlsx,.pptx';
export const MAX_FILES_PER_AGREEMENT = 10;

export type AttachmentLimits = { plan: string; maxFileBytes: number; totalBytes: number; usedBytes: number };
export type Attachment = { id: string; fileName: string; mimeType: string; sizeBytes: number; createdAt: string };

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  const mb = bytes / (1024 * 1024);
  return mb >= 100 ? `${Math.round(mb)} MB` : `${Math.round(mb * 10) / 10} MB`;
}

export function typeLabel(mime: string): string {
  return ALLOWED_TYPES[mime] ?? 'File';
}

/** Same cleaning the database does: no slashes or control characters, 150 characters at most. */
export function cleanFileName(name: string): string {
  return name.replace(/[\\/\u0000-\u001f\u007f]/g, '_').trim().slice(0, 150);
}

/** Returns a plain-words problem with the chosen file, or null when it can be sent. */
export function checkFileChoice(file: { name: string; type: string; size: number }, limits: AttachmentLimits): string | null {
  if (limits.maxFileBytes <= 0) return 'Attachments are part of the Pro and Premium plans.';
  if (!cleanFileName(file.name)) return 'That file has no usable name.';
  if (!ALLOWED_TYPES[file.type]) return 'That file type is not allowed. You can attach PDF, PNG, JPEG, WebP, text, CSV, Word, Excel and PowerPoint files.';
  if (file.size <= 0) return 'That file is empty.';
  if (file.size > limits.maxFileBytes) return `That file is ${formatBytes(file.size)}. Your plan allows up to ${formatBytes(limits.maxFileBytes)} per file.`;
  const remaining = Math.max(0, limits.totalBytes - limits.usedBytes);
  if (file.size > remaining) return `Not enough storage left. You have ${formatBytes(remaining)} free of ${formatBytes(limits.totalBytes)}. Delete a file to make room.`;
  return null;
}

export function parseLimits(raw: unknown): AttachmentLimits | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0);
  return { plan: typeof r.plan === 'string' ? r.plan : 'free', maxFileBytes: n(r.max_file_bytes), totalBytes: n(r.total_bytes), usedBytes: n(r.used_bytes) };
}

export function toAttachment(row: unknown): Attachment | null {
  if (!row || typeof row !== 'object') return null;
  const r = row as Record<string, unknown>;
  if (typeof r.id !== 'string' || typeof r.file_name !== 'string') return null;
  return {
    id: r.id, fileName: r.file_name, mimeType: typeof r.mime_type === 'string' ? r.mime_type : '',
    sizeBytes: typeof r.size_bytes === 'number' ? r.size_bytes : 0, createdAt: typeof r.created_at === 'string' ? r.created_at : ''
  };
}

const DB_ERRORS: Record<string, string> = {
  not_authenticated: 'Please sign in again.',
  not_found: 'That file or agreement could not be found.',
  attachments_not_in_plan: 'Attachments are part of the Pro and Premium plans.',
  attachment_name_invalid: 'That file name is not valid.',
  attachment_type_not_allowed: 'That file type is not allowed.',
  attachment_size_invalid: 'That file is empty or its size could not be read.',
  attachment_too_large: 'That file is larger than your plan allows per file.',
  attachment_quota_exceeded: 'Not enough storage left on your plan. Delete a file to make room.',
  attachment_limit_per_agreement: 'An agreement can have up to 10 attachments. Delete one to add another.',
  attachment_not_uploaded: 'The upload did not finish. Please try again.',
  attachment_size_mismatch: 'The uploaded file did not match its size. Please try again.'
};

export function attachmentErrorCopy(error: { message?: string; code?: string } | null | undefined): string {
  if (!error) return 'Something went wrong. Please try again.';
  if (error.code === '42P01' || error.code === '42883' || error.code === 'PGRST202' || error.code === 'PGRST205') {
    return 'Attachments are not set up in the database yet. Run the migration 20261105_agreement_attachments.sql and try again.';
  }
  const message = error.message ?? '';
  const code = Object.keys(DB_ERRORS).find((key) => message.includes(key));
  return code ? DB_ERRORS[code] : 'Something went wrong. Please try again.';
}
