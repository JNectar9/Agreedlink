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
