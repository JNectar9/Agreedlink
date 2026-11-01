export type CustomerRecord = { claimed_by?: string | null; email_verified_at?: string | null; email?: string | null };

/** A customer shows as verified only after their account email was confirmed and claimed the record. */
export function customerVerification(c: CustomerRecord): { verified: boolean; label: string } {
  if (c.email && c.claimed_by && c.email_verified_at) return { verified: true, label: 'Email verified' };
  if (c.email) return { verified: false, label: 'Email not verified' };
  return { verified: false, label: 'No email on record' };
}

/** Phone numbers are never shown as verified because no phone verification exists yet. */
export const PHONE_STATUS = 'Phone not verified';

/** Removes characters that could change a search filter, and limits the length. */
export function safeSearchTerm(input: string | undefined | null): string {
  return (input ?? '').replace(/[,()%*\\"'`;:<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
}
