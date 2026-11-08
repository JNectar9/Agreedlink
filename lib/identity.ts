export type ApprovalIdentity = {
  auth_method?: string | null;
  approved_by_name?: string | null;
  verified_email?: string | null;
  email_matches_customer?: boolean | null;
};

/**
 * Describes how a decision was made without overstating it. Only a signed-in account whose confirmed email
 * matches the client email on the agreement counts as verified. A typed name on a link never does.
 */
export function describeIdentity(i: ApprovalIdentity): { verified: boolean; label: string; detail: string } {
  if (i.auth_method === 'account' && i.verified_email) {
    if (i.email_matches_customer === true) {
      return { verified: true, label: 'Verified email', detail: `Signed in as ${i.verified_email}. The email is confirmed and matches the customer email on the agreement.` };
    }
    if (i.email_matches_customer === false) {
      return { verified: false, label: 'Signed-in account, different email', detail: `Signed in as ${i.verified_email} (email confirmed). It differs from the customer email on the agreement, so it is not shown as verified.` };
    }
    return { verified: false, label: 'Signed-in account', detail: `Signed in as ${i.verified_email} (email confirmed). The agreement has no customer email to compare, so it is not shown as verified.` };
  }
  return { verified: false, label: 'Typed name on a secure link', detail: 'The person typed a name on a private link. Their identity was not verified.' };
}
