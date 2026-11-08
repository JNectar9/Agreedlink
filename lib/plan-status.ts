// Plan status helpers. The one source of truth for the plan you are on RIGHT NOW is my_subscription() in the database.
// Notifications are only a history of events and are never used to work out the current plan.

export type NoteLike = { id: string; type?: string | null; title?: string | null; created_at: string };

export type NoteRow = NoteLike & { body?: string | null; read_at?: string | null; agreement_id?: string | null };

/** Subscription and payment notifications. They describe events that happened, not the plan you have now. */
export function isPlanUpdate(n: NoteLike): boolean {
  const type = String(n.type ?? '').toLowerCase();
  return type === 'subscription' || type === 'payment' || /^(subscription|payment)\b/i.test(String(n.title ?? ''));
}

export function sortNewestFirst<T extends { created_at: string }>(notes: T[]): T[] {
  return [...notes].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

/** The newest plan update is "latest". Every older one is "history". Other notifications get no tag. */
export function tagPlanUpdates(notes: NoteLike[]): Map<string, 'latest' | 'history'> {
  const out = new Map<string, 'latest' | 'history'>();
  sortNewestFirst(notes.filter(isPlanUpdate)).forEach((n, i) => out.set(n.id, i === 0 ? 'latest' : 'history'));
  return out;
}

export type SubLike = {
  effective_plan?: string;
  state?: string;
  current?: { expires_at?: string } | null;
  last_expired_at?: string | null;
};

function shortDate(iso: string, timezone: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  try {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: timezone });
  } catch {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  }
}

/** "Current plan: Pro - Active until Dec 5, 2026". Returns null when the plan could not be read. */
export function currentPlanLine(sub: SubLike | null, timezone: string): string | null {
  if (!sub || typeof sub !== 'object') return null;
  const plan = sub.effective_plan === 'pro' ? 'Pro' : sub.effective_plan === 'premium' ? 'Premium' : sub.effective_plan === 'free' ? 'Free' : null;
  if (!plan) return null;
  if (plan === 'Free') {
    const ended = sub.state === 'expired' && sub.last_expired_at ? shortDate(sub.last_expired_at, timezone) : '';
    return ended ? `Current plan: Free - your paid plan ended on ${ended}` : 'Current plan: Free';
  }
  const until = sub.current?.expires_at ? shortDate(sub.current.expires_at, timezone) : '';
  return until ? `Current plan: ${plan} - Active until ${until}` : `Current plan: ${plan} - Active`;
}
