import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

/**
 * /billing is a short address that people and old links use. The real page is /dashboard/billing, which is
 * protected: signed-in people go straight there, and signed-out people are sent to log in first and then back.
 */
export default function BillingRedirect({ searchParams }: { searchParams: { plan?: string | string[] } }) {
  const plan = Array.isArray(searchParams.plan) ? searchParams.plan[0] : searchParams.plan;
  const query = plan === 'pro' || plan === 'premium' ? `?plan=${plan}` : '';
  redirect(`/dashboard/billing${query}`);
}
