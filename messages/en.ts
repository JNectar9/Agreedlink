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
    expired: 'Expired',
    cancelled: 'Cancelled'
  },
  events: {
    created: 'Agreement created',
    link_regenerated: 'New customer link created',
    link_revoked: 'Customer link revoked',
    link_opened: 'Customer link opened',
    customer_approved: 'Customer approved the agreement',
    customer_declined: 'Customer declined the agreement',
    clarification_requested: 'Customer asked a question',
    change_proposed: 'Change request sent',
    change_superseded: 'Change request replaced',
    change_withdrawn: 'Change request withdrawn',
    change_approved: 'Change request approved',
    change_rejected: 'Change request rejected',
    change_clarification_requested: 'Customer asked a question about a change request',
    completed: 'Agreement marked as completed',
    expired: 'Customer link expired',
    cancelled: 'Agreement cancelled'
  } as Record<string, string>,
  sources: {
    recorded_by_app: 'Recorded by AgreedLink',
    creator_reported: 'Reported by the sender',
    customer_entered: 'Entered by the customer'
  } as Record<string, string>,
  errors: {
    not_pending: 'This item is no longer waiting for a decision. Refresh the page to see its current state.',
    version_mismatch: 'The terms changed since you opened this page. Refresh to review the latest version.',
    expired: 'This link has expired. Ask the sender for a new link.',
    invalid_link: 'This link is not valid. Ask the sender for a new link.',
    name_required: 'Enter your name so the decision can be recorded.',
    message_required: 'Tell the sender what you would like clarified.',
    invalid_decision: 'That choice is not available.',
    plan_limit: 'You have reached the active agreement limit for your subscription plan. Complete or cancel an agreement to free a place, or view the plans on the Billing page.',
    free_plan_limit: 'The Free plan allows up to 3 active agreements at one time. Complete or cancel an agreement, or upgrade your subscription plan on the Billing page.',
    change_already_pending: 'A change request is already waiting for the customer. Withdraw it before sending another.',
    invalid_amount: 'The revised total must stay above zero.',
    currency_mismatch: 'The currency of a change must match the agreement.',
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
