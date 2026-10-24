// All user-facing strings that are reused across screens live here so a translation layer can be
// added later. Most page copy is still inline in this first milestone (see docs/REMAINING.md).
export const en = {
  status: {
    draft: 'Draft',
    awaiting_approval: 'Awaiting approval',
    approved: 'Approved',
    changes_pending: 'Changes pending',
    declined: 'Declined',
    completed: 'Completed',
    expired: 'Expired'
  },
  events: {
    created: 'Agreement created',
    link_regenerated: 'Customer link regenerated',
    link_revoked: 'Customer link revoked',
    link_opened: 'Link opened',
    customer_approved: 'Customer approved',
    customer_declined: 'Customer declined',
    clarification_requested: 'Customer asked for clarification',
    change_proposed: 'Change proposed',
    change_superseded: 'Proposal replaced',
    change_withdrawn: 'Proposal withdrawn',
    change_approved: 'Change approved',
    change_rejected: 'Change rejected',
    change_clarification_requested: 'Clarification requested on a change',
    completed: 'Marked completed',
    expired: 'Link expired'
  } as Record<string, string>,
  sources: {
    recorded_by_app: 'Recorded by AgreedLink',
    creator_reported: 'Reported by creator',
    customer_entered: 'Entered by customer'
  } as Record<string, string>,
  errors: {
    not_pending: 'This item is no longer waiting for a decision. Refresh the page to see its current state.',
    version_mismatch: 'The terms changed since you opened this page. Refresh to review the latest version.',
    expired: 'This link has expired. Ask the sender for a new link.',
    invalid_link: 'This link is not valid. Ask the sender for a new link.',
    name_required: 'Enter your name so the decision can be recorded.',
    message_required: 'Tell us what you would like clarified.',
    invalid_decision: 'That choice is not available.',
    free_plan_limit: 'The free plan allows 3 new agreements per month. Paid plans are not available yet.',
    change_already_pending: 'A proposal is already waiting for the customer. Withdraw it before sending another.',
    invalid_state: 'That action is not available for the current status.',
    not_found: 'We could not find that agreement.',
    default: 'Something went wrong. Please try again.'
  } as Record<string, string>,
  share: {
    subject: (project: string) => `Please review and approve: ${project}`,
    body: (creator: string, project: string, url: string) =>
      `Hello,\n\n${creator} shared the agreement for "${project}" with you. Please review the details and respond using this link:\n${url}\n\nThank you.`
  }
};

export function errorCopy(code: string | undefined): string {
  return en.errors[code ?? 'default'] ?? en.errors.default;
}
