// Pricing is configurable and every figure is a PROPOSAL, not a validated market price.
// No payment provider is connected, so paid plans are shown as "not yet available".
// Only the Free limit (3 agreements per month) is enforced by the database today.
export type Plan = {
  id: 'free' | 'pro' | 'early';
  name: string;
  price: string;
  note: string;
  features: string[];
  planned?: string[];
  available: boolean;
};

export const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    note: 'Available now',
    features: ['Up to 3 new agreements per month', 'Customer approval links', 'Change requests with comparison', 'Version and activity history'],
    available: true
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$9 per month (proposed)',
    note: 'Payment is not yet available',
    features: [],
    planned: ['Higher agreement limit', 'Downloadable records', 'Custom business branding'],
    available: false
  },
  {
    id: 'early',
    name: 'Early Access',
    price: '$19 one-time (proposed)',
    note: 'Payment is not yet available',
    features: [],
    planned: ['Pro features for 12 months from purchase', 'Access expires after 12 months and is not lifetime access'],
    available: false
  }
];
