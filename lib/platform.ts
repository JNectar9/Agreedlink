import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { isServerConfigured } from '@/lib/env';

export type PlatformStats = {
  users: number;
  agreements: number;
  /** Paid subscribers. Billing is not connected yet, so this is a real 0 until the Paystack phase. */
  subscribers: number;
  signups: string[];
};

/** Real counts straight from the database. Only call this for owners or for the public strip. */
export async function platformStats(): Promise<PlatformStats | null> {
  if (!isServerConfigured()) return null;
  try {
    const admin = createAdminClient();
    const since = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
    const [users, agreements, signups] = await Promise.all([
      admin.from('profiles').select('id', { count: 'exact', head: true }),
      admin.from('agreements').select('id', { count: 'exact', head: true }),
      admin.from('profiles').select('created_at').gte('created_at', since).order('created_at')
    ]);
    if (users.error || agreements.error) return null;
    return {
      users: users.count ?? 0,
      agreements: agreements.count ?? 0,
      subscribers: 0,
      signups: (signups.data ?? []).map((r: { created_at: string }) => r.created_at)
    };
  } catch {
    return null;
  }
}

/**
 * Real numbers for the public site, shown only once there are enough real users that the figures
 * mean something. Change the threshold with PUBLIC_STATS_MIN_USERS (set 0 to always show).
 */
export async function publicStats(): Promise<{ users: number; agreements: number; subscribers: number } | null> {
  const min = Number(process.env.PUBLIC_STATS_MIN_USERS ?? 25);
  const stats = await platformStats();
  if (!stats || stats.users < (Number.isFinite(min) ? min : 25)) return null;
  return { users: stats.users, agreements: stats.agreements, subscribers: stats.subscribers };
}
