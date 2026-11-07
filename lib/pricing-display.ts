// What the /pricing and /dashboard/billing pages say about each plan.
//
// AVAILABLE lists only things that exist in the product today (checked against the code and database):
//  - the active-agreement limits (3 / 50 / 200) are enforced by the database function that creates agreements;
//  - private approval links, change requests with comparison, version and activity history, and ready-made
//    templates are available to every plan;
//  - support levels are a service JNectar provides, not software.
// COMING SOON is read straight from PLAN_CONFIG (the entries marked live: false), so a feature is never
// shown as available until it is flipped to live there. Prices and limits themselves are not stored here.
import { PLAN_CONFIG, PLAN_ORDER, type PlanId } from './plans';

export { PLAN_ORDER };
export type { PlanId };

export const PLAN_TAGLINE: Record<PlanId, string> = {
  free: 'Try AgreedLink with a few active agreements.',
  pro: 'For freelancers with a steady flow of work.',
  premium: 'For small businesses with many agreements at once.'
};

/** Things that exist today, for one plan. `activeLimit` comes from the database when known, else from PLAN_CONFIG. */
export function availableFeatures(id: PlanId, activeLimit: number = PLAN_CONFIG[id].activeAgreements): string[] {
  const limit = `Up to ${activeLimit} active agreements at one time`;
  if (id === 'free') {
    return [
      limit,
      'Private approval links: your customer needs no account',
      'Change requests with a side-by-side comparison',
      'Version and activity history',
      'Ready-made agreement templates',
      '1 saved template',
      'Standard support'
    ];
  }
  if (id === 'pro') return ['Everything in Free', limit, '10 saved templates', 'PDF export', 'Attachments up to 10 MB per file (100 MB in total)'];
  return ['Everything in Pro', limit, 'Priority support', 'Attachments up to 50 MB per file (250 MB in total)', 'Advanced reporting'];
}

/** Planned features for one plan. Never shown as available. */
export function comingSoonFeatures(id: PlanId): string[] {
  return PLAN_CONFIG[id].features.filter((f) => !f.live).map((f) => f.text);
}

/** The steps shown on both pages. Activation is manual, so nothing here promises instant or automatic access. */
export const ACTIVATION_STEPS = [
  'Pay by bank transfer using the payment instructions.',
  'Send a payment request with your payment reference or transfer ID.',
  'An administrator checks the payment and activates your plan. Your plan does not change until they approve your request.'
];

export const ACTIVATION_NOTE = [
  'Card payments through Paystack activate your plan once Paystack confirms the payment.',
  'Bank transfer subscriptions are activated by an administrator after the payment is verified.',
  'Plan prices are shown in US dollars as a reference. Card checkout is charged in Nigerian naira.'
].join(' ');
