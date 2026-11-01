import { z } from 'zod';
import { isCurrencyCode, parseMoneyToMinor } from './money';
import type { Terms } from './terms';

export type Result<T> = ({ ok: true } & T) | { ok: false; error: string };

const text = (max: number, min = 0) => z.string().trim().min(min).max(max);
const dateString = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a valid date.')
  .refine((d) => {
    const parsed = new Date(`${d}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === d;
  }, 'Use a valid date.');
const optionalDate = z.union([dateString, z.literal('')]).optional().default('');
const optionalText = (max: number) => z.string().trim().max(max).optional().default('');

function firstError(error: z.ZodError): string {
  const issue = error.issues[0];
  const field = String(issue.path[0] ?? 'form').replace(/_/g, ' ');
  return `${field}: ${issue.message}`;
}

const agreementSchema = z.object({
  project_name: text(120, 2),
  client_name: text(120, 1),
  client_email: z.union([z.string().trim().email().max(254), z.literal('')]).optional().default(''),
  description: text(4000, 1),
  deliverables: text(4000, 1),
  start_date: optionalDate,
  delivery_date: dateString,
  currency: z.string().trim().toUpperCase().refine(isCurrencyCode, 'Choose a valid currency.'),
  amount: z.string().trim().min(1, 'Enter the total price.'),
  included_revisions: z.coerce.number().int().min(0).max(50),
  revision_definition: optionalText(1000),
  excluded_work: optionalText(2000),
  additional_work_pricing: z.enum(['quote_first', 'hourly', 'fixed_per_item']),
  additional_work_price: optionalText(30),
  payment_terms_text: optionalText(2000)
});

export function parseAgreementForm(input: Record<string, unknown>): Result<{ terms: Terms }> {
  const parsed = agreementSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const v = parsed.data;
  const amount = parseMoneyToMinor(v.amount, v.currency);
  if (amount === null || amount <= 0) {
    return { ok: false, error: 'amount: enter a positive amount using digits and an optional decimal point.' };
  }
  if (v.start_date && v.start_date > v.delivery_date) {
    return { ok: false, error: 'delivery date: must be on or after the start date.' };
  }
  let extra: number | null = null;
  if (v.additional_work_pricing !== 'quote_first') {
    extra = parseMoneyToMinor(v.additional_work_price, v.currency);
    if (extra === null || extra <= 0) {
      return { ok: false, error: 'additional work price: enter a positive amount or choose "quote first".' };
    }
  }
  return {
    ok: true,
    terms: {
      project_name: v.project_name,
      client_name: v.client_name,
      client_email: v.client_email || null,
      description: v.description,
      deliverables: v.deliverables,
      start_date: v.start_date || null,
      delivery_date: v.delivery_date,
      currency: v.currency,
      amount_minor: amount,
      included_revisions: v.included_revisions,
      revision_definition: v.revision_definition,
      excluded_work: v.excluded_work,
      additional_work_pricing: v.additional_work_pricing,
      additional_work_price_minor: extra,
      payment_terms_text: v.payment_terms_text
    }
  };
}

export function parseDecision(
  input: Record<string, unknown>,
  allowed: readonly string[]
): Result<{ decision: string; name: string; email: string; message: string }> {
  const schema = z.object({
    decision: z.string().refine((d) => allowed.includes(d), 'Choose one of the available options.'),
    name: text(120, 1),
    email: z.union([z.string().trim().email().max(254), z.literal('')]).optional().default(''),
    message: optionalText(2000)
  });
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  if (parsed.data.decision === 'clarify' && !parsed.data.message) {
    return { ok: false, error: 'message: tell us what you would like clarified.' };
  }
  return { ok: true, ...parsed.data };
}
