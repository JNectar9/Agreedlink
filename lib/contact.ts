import { z } from 'zod';
import type { Result } from './validation';

const contactSchema = z.object({
  name: z.string().trim().min(1, 'Enter your name.').max(100),
  email: z.string().trim().email('Enter a valid email address.').max(254),
  subject: z.string().trim().max(150).optional().default(''),
  message: z.string().trim().min(10, 'Write at least 10 characters.').max(3000)
});

export type ContactInput = z.infer<typeof contactSchema>;

export function parseContactForm(input: Record<string, unknown>): Result<{ data: ContactInput }> {
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: `${String(issue.path[0] ?? 'form').replace(/_/g, ' ')}: ${issue.message}` };
  }
  return { ok: true, data: parsed.data };
}

/**
 * Cheap spam signals. A hidden field must stay empty (bots fill every field) and the form must
 * have been open for at least 3 seconds and less than a day. These checks are only a first filter;
 * the database also limits messages per email and per hour.
 */
export function checkSpamSignals(input: Record<string, unknown>, now: number): { ok: boolean } {
  if (typeof input.company_site === 'string' && input.company_site.trim() !== '') return { ok: false };
  const opened = Number(input.ts);
  if (!Number.isFinite(opened)) return { ok: false };
  const age = now - opened;
  return { ok: age >= 3000 && age <= 24 * 60 * 60 * 1000 };
}
