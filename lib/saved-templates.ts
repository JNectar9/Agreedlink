// Saved (reusable) templates. The database enforces the plan limit and every field rule
// (supabase/migrations/20261103_saved_templates.sql). This file validates early and reads rows defensively.
import type { TemplateValues } from './templates';

export type SavedTemplate = { id: string; name: string; summary: string; fields: TemplateValues; created_at: string };

const PRICING = ['quote_first', 'hourly', 'fixed_per_item'] as const;
type Pricing = (typeof PRICING)[number];

/** Same limits as the new-agreement form, so a saved template can always fill it. */
export const TEMPLATE_LIMITS = { name: 80, summary: 200, description: 4000, deliverables: 4000, revision_definition: 1000, excluded_work: 2000, payment_terms_text: 2000 } as const;

export type TemplateInput = { name: string; summary: string; fields: TemplateValues };

export function parseTemplateForm(input: Record<string, unknown>): { ok: true; value: TemplateInput } | { ok: false; error: string } {
  const text = (key: string) => String(input[key] ?? '').trim();
  const name = text('name');
  if (name.length < 2 || name.length > TEMPLATE_LIMITS.name) return { ok: false, error: 'Give the template a name of 2 to 80 characters.' };
  const summary = text('summary');
  if (summary.length > TEMPLATE_LIMITS.summary) return { ok: false, error: 'The short description must be 200 characters or fewer.' };

  const fields: TemplateValues = {};
  for (const key of ['description', 'deliverables', 'revision_definition', 'excluded_work', 'payment_terms_text'] as const) {
    const value = text(key);
    if (value.length > TEMPLATE_LIMITS[key]) return { ok: false, error: `That text is too long. The limit is ${TEMPLATE_LIMITS[key].toLocaleString('en-US')} characters.` };
    if (value) fields[key] = value;
  }
  const revisions = text('included_revisions');
  if (revisions !== '') {
    const n = Number(revisions);
    if (!Number.isInteger(n) || n < 0 || n > 50) return { ok: false, error: 'Included revisions must be a whole number from 0 to 50.' };
    fields.included_revisions = n;
  }
  const pricing = text('additional_work_pricing');
  if (pricing !== '') {
    if (!(PRICING as readonly string[]).includes(pricing)) return { ok: false, error: 'Choose how extra work is priced.' };
    fields.additional_work_pricing = pricing as Pricing;
  }
  const hasContent = Boolean(fields.description || fields.deliverables || fields.revision_definition || fields.excluded_work || fields.payment_terms_text);
  if (!hasContent) return { ok: false, error: 'Fill in at least one field, such as the description or deliverables, so the template has something to reuse.' };
  return { ok: true, value: { name, summary, fields } };
}

/** Turns stored JSON into safe form defaults. Anything unexpected is ignored, never rendered. */
export function toTemplateValues(raw: unknown): TemplateValues {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const r = raw as Record<string, unknown>;
  const out: TemplateValues = {};
  for (const key of ['description', 'deliverables', 'revision_definition', 'excluded_work', 'payment_terms_text'] as const) {
    const v = r[key];
    if (typeof v === 'string' && v.length <= TEMPLATE_LIMITS[key]) out[key] = v;
  }
  if (typeof r.included_revisions === 'number' && Number.isInteger(r.included_revisions) && r.included_revisions >= 0 && r.included_revisions <= 50) out.included_revisions = r.included_revisions;
  if (typeof r.additional_work_pricing === 'string' && (PRICING as readonly string[]).includes(r.additional_work_pricing)) out.additional_work_pricing = r.additional_work_pricing as Pricing;
  return out;
}

export function toSavedTemplate(row: unknown): SavedTemplate | null {
  if (!row || typeof row !== 'object') return null;
  const r = row as Record<string, unknown>;
  if (typeof r.id !== 'string' || typeof r.name !== 'string') return null;
  return { id: r.id, name: r.name, summary: typeof r.summary === 'string' ? r.summary : '', fields: toTemplateValues(r.fields), created_at: typeof r.created_at === 'string' ? r.created_at : '' };
}

const DB_ERRORS: Record<string, string> = {
  not_authenticated: 'Please sign in again.',
  template_limit: 'You have reached the saved template limit for your plan. Delete one you no longer need, or upgrade your plan.',
  template_name_taken: 'You already have a template with that name. Choose a different name.',
  template_name_invalid: 'Give the template a name of 2 to 80 characters.',
  template_summary_invalid: 'The short description must be 200 characters or fewer.',
  template_fields_invalid: 'Those template details are not valid. Check the lengths and numbers and try again.',
  not_found: 'That template could not be found. It may already be deleted.'
};

/** Plain-words copy for a Postgres error. Unknown errors never expose database details. */
export function templateErrorCopy(error: { message?: string; code?: string } | null | undefined): string {
  if (!error) return 'Something went wrong. Please try again.';
  if (error.code === '42P01' || error.code === '42883' || error.code === 'PGRST202' || error.code === 'PGRST205') {
    return 'Saved templates are not set up in the database yet. Run the migration 20261103_saved_templates.sql and try again.';
  }
  const message = error.message ?? '';
  const code = Object.keys(DB_ERRORS).find((key) => message.includes(key));
  return code ? DB_ERRORS[code] : 'Something went wrong. Please try again.';
}
