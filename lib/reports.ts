// Advanced reporting (Premium). All numbers come from the database function report_overview().
// This file only reads that result defensively and prepares display values.
import { formatMinorSafe } from './money';

export type MoneyRow = { currency: string; agreedMinor: number; pipelineMinor: number };
export type DeltaRow = { currency: string; deltaMinor: number };
export type MonthRow = { month: string; created: number; approved: number };
export type UpcomingRow = { id: string; projectName: string; clientName: string; deliveryDate: string };
export type ActivityRow = { agreementId: string; projectName: string; eventType: string; actorName: string; message: string; createdAt: string };
export type Report = {
  generatedAt: string;
  agreementsTotal: number;
  byStatus: Record<string, number>;
  value: MoneyRow[];
  monthly: MonthRow[];
  approvalsCount: number;
  avgApprovalHours: number | null;
  changesByStatus: Record<string, number>;
  changeValue: DeltaRow[];
  overdue: number;
  upcoming: UpcomingRow[];
  activity: ActivityRow[];
};

const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const count = (v: unknown): number => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};
const whole = (v: unknown): number => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};
const list = (v: unknown): Record<string, unknown>[] =>
  Array.isArray(v) ? v.filter((x): x is Record<string, unknown> => Boolean(x) && typeof x === 'object' && !Array.isArray(x)) : [];
const counts = (v: unknown): Record<string, number> => {
  const out: Record<string, number> = {};
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    for (const [k, n] of Object.entries(v as Record<string, unknown>)) out[k] = count(n);
  }
  return out;
};

/** Turns the raw database JSON into a safe shape. Returns null when the result is not an object. */
export function parseReport(raw: unknown): Report | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const hours = r.avg_approval_hours;
  return {
    generatedAt: str(r.generated_at),
    agreementsTotal: count(r.agreements_total),
    byStatus: counts(r.by_status),
    value: list(r.value_by_currency).map((o) => ({ currency: str(o.currency), agreedMinor: count(o.agreed_minor), pipelineMinor: count(o.pipeline_minor) })),
    monthly: list(r.monthly).map((o) => ({ month: str(o.month), created: count(o.created), approved: count(o.approved) })),
    approvalsCount: count(r.approvals_count),
    avgApprovalHours: hours === null || hours === undefined ? null : count(hours),
    changesByStatus: counts(r.changes_by_status),
    changeValue: list(r.change_value_by_currency).map((o) => ({ currency: str(o.currency), deltaMinor: whole(o.delta_minor) })),
    overdue: count(r.overdue),
    upcoming: list(r.upcoming).map((o) => ({ id: str(o.id), projectName: str(o.project_name), clientName: str(o.client_name), deliveryDate: str(o.delivery_date) })),
    activity: list(r.recent_activity).map((o) => ({
      agreementId: str(o.agreement_id), projectName: str(o.project_name), eventType: str(o.event_type),
      actorName: str(o.actor_name), message: str(o.message), createdAt: str(o.created_at)
    }))
  };
}

/** Only 6 or 12 months are offered. Anything else falls back to 6. */
export function parseReportRange(value: unknown): 6 | 12 {
  return String(value) === '12' ? 12 : 6;
}

export function monthName(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
}

/** Bar width as a whole percent of the largest value. Non-zero values never disappear. */
export function barPercent(value: number, max: number): number {
  if (value <= 0 || max <= 0) return 0;
  return Math.max(4, Math.min(100, Math.round((value / max) * 100)));
}

export function formatHours(hours: number | null): string {
  if (hours === null) return 'Not enough data yet';
  if (hours < 1) return 'Under 1 hour';
  if (hours < 48) return `${Math.round(hours * 10) / 10} hours`;
  return `${Math.round((hours / 24) * 10) / 10} days`;
}

export function prettyEvent(type: string): string {
  const text = type.replace(/_/g, ' ').trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : 'Activity';
}

export function signedMoney(deltaMinor: number, currency: string): string {
  const text = formatMinorSafe(Math.abs(deltaMinor), currency);
  return deltaMinor < 0 ? `-${text}` : deltaMinor > 0 ? `+${text}` : text;
}

const ERRORS: Record<string, string> = {
  not_authenticated: 'Please sign in again.',
  premium_required: 'Advanced reporting is part of the Premium plan.'
};

export function reportErrorCopy(error: { message?: string; code?: string } | null | undefined): string {
  if (!error) return 'Something went wrong. Please try again.';
  if (error.code === '42883' || error.code === 'PGRST202') {
    return 'Reports are not set up in the database yet. Run the migration 20261104_advanced_reporting.sql and try again.';
  }
  const message = error.message ?? '';
  const code = Object.keys(ERRORS).find((key) => message.includes(key));
  return code ? ERRORS[code] : 'Something went wrong. Please try again.';
