// Pricing is configurable and every figure is a PROPOSAL, not a validated market price.
// Paid plans stay "not yet available" until the Paystack billing phase is built and tested.
// Only the Free limit (3 agreements per month) is enforced by the database today.
export type Plan = {
  id: 'free' | 'pro';
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
    price: '₦0',
    note: 'Available now',
    features: ['Up to 3 new agreements per month', 'Customer approval links', 'Change requests with comparison', 'Version and activity history'],
    available: true
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '₦2,500 per month (proposed)',
    note: 'Payment is not yet available',
    features: [],
    planned: ['Higher agreement limit', 'File attachments', 'PDF records', 'Business branding on agreements'],
    available: false
  }
];
