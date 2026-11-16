import { redirect } from 'next/navigation';
import { requireSession } from '@/lib/data';
import { parseDashboard } from '@/lib/affiliate';

/** The public site address used in referral links. Never "localhost". */
export function siteBase(): string {
  const v = process.env.NEXT_PUBLIC_SITE_URL;
  return v && !/localhost|127\.0\.0\.1/.test(v) ? v.replace(/\/+$/, '') : 'https://agreedlink.vercel.app';
}

/** The signed-in person's affiliate record, read through the database function. */
export async function loadAffiliate(days = 30) {
  const { supabase, user, profile } = await requireSession();
  const { data, error } = await supabase.rpc('affiliate_dashboard', { p_days: days });
  return { supabase, user, profile, dash: parseDashboard(data), error };
}

/** Pending, rejected and non-affiliates cannot see earnings or links. They are sent to the application page. */
export async function requireAffiliate(days = 30) {
  const result = await loadAffiliate(days);
  if (result.dash.status !== 'approved' && result.dash.status !== 'suspended') redirect('/affiliate/profile');
  return result;
}
