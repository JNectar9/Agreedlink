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
      'Standard support'
    ];
  }
  if (id === 'pro') return ['Everything in Free', limit];
  return ['Everything in Pro', limit, 'Priority support'];
}

/** Planned features for one plan. Never shown as available. */
export function comingSoonFeatures(id: PlanId): string[] {
  return PLAN_CONFIG[id].features.filter((f) => !f.live).map((f) => f.text);
}

/** The steps shown on both pages. Activation is manual, so nothing here promises instant or automatic access. */
export const ACTIVATION_STEPS = [
  'Pay the plan price using the payment instructions.',
  'Send a payment request with your payment reference or transfer ID.',
  'An administrator checks the payment and activates your plan. Nothing changes until they approve it.'
];

export const ACTIVATION_NOTE =
  'Subscriptions are activated by an administrator after the payment is 
