// Pure helpers for the admin subscription dashboard. All figures come from the database function
// admin_subscription_dashboard(); this file only reads that result defensively and prepares chart geometry.

export type TrendPoint = { month: string; revenueMinor: number };
export type RecentPayment = {
  id: string; userId: string; email: string; plan: 'pro' | 'premium'; amountMinor: number; months: number; approvedAt: string; status: 'active' | 'cancelled';
};
export type DashboardStats = {
  generatedAt: string;
  usersTotal: number; usersThisMonth: number;
  subscribersPro: number; subscribersPremium: number; subscribersComplimentary: number;
  revenueLifetimeMinor: number; revenueMonthMinor: number; pendingExpectedMinor: number;
  requestsPending: number; requestsApproved: number; requestsRejected: number;
  expiring7d: number;
  trend: TrendPoint[];
  recentPayments: RecentPayment[];
};

const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};
const str = (v: unknown): string => (typeof v === 'string' ? v : '');

/** Turns the raw JSON from the database into a safe shape. Returns null when the result is not an object. */
export function parseDashboard(raw: unknown): DashboardStats | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const trend = (Array.isArray(r.trend) ? r.trend : []).map((t) => {
    const o = (t ?? {}) as Record<string, unknown>;
    return { month: str(o.month), revenueMinor: num(o.revenue_minor) };
  });
  const recentPayments = (Array.isArray(r.recent_payments) ? r.recent_payments : []).map((p) => {
    const o = (p ?? {}) as Record<string, unknown>;
    return {
      id: str(o.id), userId: str(o.user_id), email: str(o.email), plan: o.plan === 'premium' ? 'premium' : 'pro',
      amountMinor: num(o.amount_minor), months: num(o.months), approvedAt: str(o.approved_at), status: o.status === 'cancelled' ? 'cancelled' : 'active'
    } as RecentPayment;
  });
  return {
    generatedAt: str(r.generated_at),
    usersTotal: num(r.users_total), usersThisMonth: num(r.users_this_month),
    subscribersPro: num(r.subscribers_pro), subscribersPremium: num(r.subscribers_premium), subscribersComplimentary: num(r.subscribers_complimentary),
    revenueLifetimeMinor: num(r.revenue_lifetime_minor), revenueMonthMinor: num(r.revenue_month_minor), pendingExpectedMinor: num(r.pending_expected_minor),
    requestsPending: num(r.requests_pending), requestsApproved: num(r.requests_approved), requestsRejected: num(r.requests_rejected),
    expiring7d: num(r.expiring_7d),
    trend, recentPayments
  };
}

/** Only 6 or 12 months are offered; anything else falls back to 6. */
export function parseRange(value: unknown): 6 | 12 {
  return String(value) === '12' ? 12 : 6;
}

/** Short month name from a 'YYYY-MM-DD' date. Uses UTC so the label never shifts a month. */
export function monthLabel(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
}

/**
 * A tidy top for the chart's y axis, in minor units, split into 4 equal steps of 1, 2, 2.5 or 5 times a power of ten.
 * Never below $100 so an empty chart still shows a sensible scale.
 */
export function niceTop(maxMinor: number): { top: number; step: number } {
  const raw = Math.max(maxMinor, 10000) / 4;
  const k = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * k).find((s) => s >= raw) ?? 10 * k;
  return { top: step * 4, step };
}

export type ChartGeometry = {
  ticks: { value: number; y: number }[];
  points: { x: number; y: number; label: string; value: number }[];
  line: string;
  area: string;
};

/** Converts the trend into SVG coordinates inside a width x height box with the given padding. */
export function chartGeometry(trend: TrendPoint[], width: number, height: number, pad: { left: number; right: number; top: number; bottom: number }): ChartGeometry {
  const { top, step } = niceTop(Math.max(0, ...trend.map((t) => t.revenueMinor)));
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const y = (v: number) => pad.top + innerH - (v / top) * innerH;
  const x = (i: number) => pad.left + (trend.length <= 1 ? innerW / 2 : (i / (trend.length - 1)) * innerW);
  const points = trend.map((t, i) => ({ x: x(i), y: y(t.revenueMinor), label: monthLabel(t.month), value: t.revenueMinor }));
  const round = (n: number) => Math.round(n * 10) / 10;
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${round(p.x)} ${round(p.y)}`).join(' ');
  const baseline = round(pad.top + innerH);
  const area = points.length ? `${line} L${round(points[points.length - 1].x)} ${baseline} L${round(points[0].x)} ${baseline} Z` : '';
  const ticks = [0, 1, 2, 3, 4].map((i) => ({ value: i * step, y: round(y(i * step)) }));
  return { ticks, points: points.map((p) => ({ ...p, x: round(p.x), y: round(p.y) })), line, area };
}
