export const STATUS_FILTERS = ['all', 'awaiting_approval', 'approved', 'changes_pending', 'completed', 'declined', 'expired', 'cancelled'] as const;
export type StatusFilter = (typeof STATUS_FILTERS)[number];

/** Accepts any capitalisation or spacing ("Approved", " APPROVED ", "changes pending"). Unknown values mean All. */
export function normalizeFilter(value: string | undefined | null): StatusFilter {
  const v = (value ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  return (STATUS_FILTERS as readonly string[]).includes(v) ? (v as StatusFilter) : 'all';
}

/**
 * Whether an agreement belongs in a filter. Every approved agreement is listed under Approved, even while a
 * change is pending (it also appears under Changes pending). Everything appears under All.
 */
export function matchesFilter(a: { status: string; shown: string }, filter: StatusFilter): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'approved':
      return a.status === 'approved';
    default:
      return a.shown === filter;
  }
}
