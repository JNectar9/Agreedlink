// Affiliate helpers. The database does the real money maths (supabase/migrations/20261108_affiliates.sql).
// These functions mirror that maths so it can be tested, and prepare data for the screens.
import { formatMinorSafe } from './money';

export const COMMISSION_RATES: Record<number, number> = { 1: 50, 2: 20, 3: 20 };

/** Month 1 is 50%, months 2 and 3 are 20%, month 4 on is 0%. */
export function commissionRate(monthNo: number): number {
  return COMMISSION_RATES[monthNo] ?? 0;
}

/** Net = gross - processor fee. Commission = rate % of net, rounded down to a whole minor unit. Mirrors the database. */
export function calcCommission(grossMinor: number, feeMinor: number, monthNo: number): { netMinor: number; commissionMinor: number; ratePercent: number } {
  const ratePercent = commissionRate(monthNo);
  const netMinor = Math.max(0, Math.floor(grossMinor) - Math.max(0, Math.floor(feeMinor)));
  return { netMinor, ratePercent, commissionMinor: Math.floor((netMinor * ratePercent) / 100) };
}

export type PayoutDate = { date: Date; label: string; includes: string };

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const ordinal = (n: number) => (n % 10 === 1 && n !== 11 ? `${n}st` : n % 10 === 2 && n !== 12 ? `${n}nd` : n % 10 === 3 && n !== 13 ? `${n}rd` : `${n}th`);

/** Payments are on the 5th of every month. After the 5th, the next date is the 5th of next month. Uses UTC. */
export function nextPayoutDate(now: Date = new Date()): PayoutDate {
  let year = now.getUTCFullYear();
  let month = now.getUTCMonth();
  if (now.getUTCDate() > 5) { month += 1; if (month > 11) { month = 0; year += 1; } }
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  return { date: new Date(Date.UTC(year, month, 5)), label: `${ordinal(5)} ${MONTHS[month]}, ${year}`, includes: `${MONTHS[prevMonth]} ${prevYear}` };
}

export function maskCustomer(refNo: number | null | undefined): string {
  return refNo ? `Customer #${refNo}` : 'Adjustment';
}

/** Paying customers divided by clicks, as a percent with one decimal. */
export function conversionRate(paying: number, clicks: number): string {
  if (!clicks || clicks <= 0) return '0%';
  return `${Math.round((paying / clicks) * 1000) / 10}%`;
}

export function referralUrl(code: string, base: string): string {
  return `${base.replace(/\/+$/, '')}/?ref=${encodeURIComponent(code)}`;
}

export function whatsappShare(url: string): string {
  return `https://wa.me/?text=${encodeURIComponent(`Try AgreedLink to get your client's approval on every agreement: ${url}`)}`;
}

// ---------- reading database results safely ----------
const n = (v: unknown): number => { const x = typeof v === 'number' ? v : Number(v); return Number.isFinite(x) ? x : 0; };
const s = (v: unknown): string => (typeof v === 'string' ? v : '');
const arr = (v: unknown): Record<string, unknown>[] => (Array.isArray(v) ? v.filter((x): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x)) : []);

export type Totals = { currency: string; pendingMinor: number; approvedMinor: number; paidMinor: number };
export type SeriesPoint = { day: string; clicks: number; registrations: number; commissions: number };
export type Dashboard = {
  status: 'none' | 'pending' | 'approved' | 'rejected' | 'suspended';
  name: string; code: string; reviewNote: string;
  clicks: number; registrations: number; paying: number;
  totals: Totals[]; series: SeriesPoint[];
};

const STATUSES = ['pending', 'approved', 'rejected', 'suspended'] as const;

export function parseTotals(v: unknown): Totals[] {
  return arr(v).map((o) => ({ currency: s(o.currency), pendingMinor: n(o.pending_minor), approvedMinor: n(o.approved_minor), paidMinor: n(o.paid_minor) }));
}

export function parseDashboard(raw: unknown): Dashboard {
  const empty: Dashboard = { status: 'none', name: '', code: '', reviewNote: '', clicks: 0, registrations: 0, paying: 0, totals: [], series: [] };
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return empty;
  const r = raw as Record<string, unknown>;
  const status = (STATUSES as readonly string[]).includes(s(r.status)) ? (s(r.status) as Dashboard['status']) : 'none';
  return {
    status, name: s(r.name), code: s(r.code), reviewNote: s(r.review_note),
    clicks: n(r.clicks), registrations: n(r.registrations), paying: n(r.paying),
    totals: parseTotals(r.totals),
    series: arr(r.series).map((o) => ({ day: s(o.day), clicks: n(o.clicks), registrations: n(o.registrations), commissions: n(o.commissions) }))
  };
}

export type ReferralRow = { refNo: number; referredAt: string; plan: string; currentPlan: string; commissionMinor: number; currency: string; commissionStatus: string };
export function parseReferrals(raw: unknown): ReferralRow[] {
  return arr(raw).map((o) => ({ refNo: n(o.ref_no),
    referredAt: s(o.referred_at),
    plan: s(o.plan),
    currentPlan: s(o.current_plan),
    commissionMinor: n(o.commission_minor),
    currency: s(o.currency),
    commissionStatus: s(o.commission_status) }));
}

export type EarningRow = { refNo: number; plan: string; monthNo: number; kind: string; reason: string; commissionMinor: number; currency: string; status: string; paymentDate: string };
export function parseEarnings(raw: unknown): EarningRow[] {
  return arr(raw).map((o) => ({ refNo: n(o.ref_no),
    plan: s(o.plan),
    monthNo: n(o.month_no),
    kind: s(o.kind),
    reason: s(o.reason),
    commissionMinor: n(o.commission_minor),
    currency: s(o.currency),
    status: s(o.status),
    paymentDate: s(o.payment_date) }));
}

/** Sum of one column across currencies, as text such as "₦12,000.00 · $4.50". Zero shows in the fallback currency. */
export function moneyText(totals: Totals[], pick: (t: Totals) => number, fallbackCurrency: string): string {
  const parts = totals.filter((t) => pick(t) !== 0).map((t) => formatMinorSafe(pick(t), t.currency));
  return parts.length > 0 ? parts.join(' \u00b7 ') : formatMinorSafe(0, fallbackCurrency);
}
export const earnedOf = (t: Totals) => t.pendingMinor + t.approvedMinor + t.paidMinor;

export function planName(plan: string): string {
  return plan === 'pro' ? 'Pro' : plan === 'premium' ? 'Premium' : plan === 'free' ? 'Free' : '-';
}

/** "Active" when the customer is on a paid plan right now. */
export function subscriptionStatus(currentPlan: string): string {
  return currentPlan === 'pro' || currentPlan === 'premium' ? 'Active' : 'Not active';
}

export const COMMISSION_STATUS_LABEL: Record<string, string> = { none: 'None yet', pending: 'Pending', approved: 'Approved', paid: 'Paid', reversed: 'Reversed' };

// ---------- CSV (safe to open in Excel) ----------
export function csvCell(value: unknown): string {
  let text = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
export function toCsv(rows: Record<string, unknown>[], columns: string[]): string {
  return [columns.join(','), ...rows.map((r) => columns.map((c) => csvCell(r[c])).join(','))].join('\r\n') + '\r\n';
}

// ---------- chart geometry (three lines on one scale) ----------
export function chartScale(points: SeriesPoint[]): number {
  const max = Math.max(0, ...points.flatMap((p) => [p.clicks, p.registrations, p.commissions]));
  if (max <= 5) return 5;
  const k = 10 ** Math.floor(Math.log10(max));
  return ([1, 2, 5, 10].map((m) => m * k).find((v) => v >= max) ?? 10 * k);
}

// ---------- application form ----------
export type Application = { name: string; email: string; whatsapp: string; platform: string; reason: string };
export function parseApplication(input: Record<string, unknown>): { ok: true; value: Application } | { ok: false; error: string } {
  const t = (k: string) => String(input[k] ?? '').trim();
  const value = { name: t('name'), email: t('email'), whatsapp: t('whatsapp').replace(/[^0-9+]/g, ''), platform: t('platform'), reason: t('reason') };
  if (value.name.length < 2 || value.name.length > 120) return { ok: false, error: 'Enter your full name.' };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value.email) || value.email.length > 254) return { ok: false, error: 'Enter a valid email address.' };
  if (value.whatsapp.length < 7 || value.whatsapp.length > 20) return { ok: false, error: 'Enter your WhatsApp number with country code.' };
  if (value.platform.length < 2 || value.platform.length > 200) return { ok: false, error: 'Tell us where you will share AgreedLink.' };
  if (value.reason.length < 10 || value.reason.length > 1000) return { ok: false, error: 'Write 10 to 1,000 characters about why you want to join.' };
  return { ok: true, value };
}

const DB_ERRORS: Record<string, string> = {
  not_authenticated: 'Please sign in again.',
  already_applied: 'You have already applied.',
  name_invalid: 'Enter your full name.', email_invalid: 'Enter a valid email address.', whatsapp_invalid: 'Enter your WhatsApp number with country code.',
  platform_invalid: 'Tell us where you will share AgreedLink.', reason_invalid: 'Write 10 to 1,000 characters about why you want to join.',
  reason_required: 'Enter a reason of at least 5 characters.', reference_required: 'Enter a payment reference of 3 to 120 characters.',
  date_invalid: 'Enter a valid payment date.', amount_invalid: 'Enter an amount that is not zero.', currency_invalid: 'Choose a valid currency.',
  invalid_state: 'That cannot be done in the current state. Refresh the page.', invalid_decision: 'That action is not allowed.', not_found: 'That record could not be found.',
  not_authorized: 'You do not have permission to do that.', audit_log_is_append_only: 'The audit log cannot be changed.'
};

export function affiliateErrorCopy(error: { message?: string; code?: string } | null | undefined): string {
  if (!error) return 'Something went wrong. Please try again.';
  if (['42P01', '42883', 'PGRST202', 'PGRST205'].includes(error.code ?? '')) return 'Affiliates are not set up in the database yet. Run the migration 20261108_affiliates.sql.';
  const message = error.message ?? '';
  const key = Object.keys(DB_ERRORS).find((k) => message.includes(k));
  return key ? DB_ERRORS[key] : 'Something went wrong. Please try again.';
}
