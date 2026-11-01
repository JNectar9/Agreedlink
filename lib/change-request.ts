import { currencyExponent, parseMoneyToMinor } from './money';
import { compareTerms, type Terms } from './terms';

export type PriceMode = 'none' | 'add' | 'reduce';
type Fail = { ok: false; error: string };

/**
 * Turns "Additional cost" or "Price reduction" plus a typed amount into a signed change in minor units.
 * Uses string arithmetic from money.ts, never floating point.
 */
export function parsePriceDelta(mode: string, amount: string, currency: string): { ok: true; delta: number } | Fail {
  if (mode === 'none' || mode === '') return { ok: true, delta: 0 };
  if (mode !== 'add' && mode !== 'reduce') return { ok: false, error: 'Choose additional cost, price reduction, or no price change.' };
  const minor = parseMoneyToMinor(amount, currency);
  if (minor === null || minor <= 0) return { ok: false, error: `Enter a positive amount with at most ${currencyExponent(currency)} decimal places.` };
  return { ok: true, delta: mode === 'add' ? minor : -minor };
}

/** The revised total is the current approved total plus the change. It must stay above zero. */
export function computeRevisedTotal(currentMinor: number, deltaMinor: number): { ok: true; total: number } | Fail {
  const total = currentMinor + deltaMinor;
  if (!Number.isSafeInteger(total)) return { ok: false, error: 'That amount is too large.' };
  if (total <= 0) return { ok: false, error: 'A price reduction cannot take the total to zero or below.' };
  return { ok: true, total };
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
function validDate(d: string): boolean {
  if (!DATE.test(d)) return false;
  const parsed = new Date(`${d}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === d;
}

export type ChangeProposal = {
  proposed: Terms;
  delta: number;
  description: string;
  reason: string;
  notes: string;
  idempotencyKey: string | null;
};

export function parseChangeProposal(input: Record<string, unknown>, current: Terms): ({ ok: true } & ChangeProposal) | Fail {
  const text = (k: string) => (typeof input[k] === 'string' ? (input[k] as string).trim() : '');
  const description = text('description');
  const reason = text('reason');
  const notes = text('notes_for_customer');
  const deliverables = text('deliverables');
  const excluded = text('excluded_work');
  if (!description) return { ok: false, error: 'Describe what is changing.' };
  if (description.length > 2000 || reason.length > 2000 || notes.length > 2000 || excluded.length > 2000) return { ok: false, error: 'One of the text fields is too long.' };
  if (!reason) return { ok: false, error: 'Give a reason for the change.' };
  if (!deliverables) return { ok: false, error: 'List the deliverables after the change.' };
  if (deliverables.length > 4000) return { ok: false, error: 'The deliverables text is too long.' };

  const delivery = text('new_delivery_date') || current.delivery_date;
  if (!validDate(delivery)) return { ok: false, error: 'Use a valid revised deadline.' };
  const revisionsText = text('new_included_revisions');
  const revisions = revisionsText === '' ? current.included_revisions : Number(revisionsText);
  if (!Number.isInteger(revisions) || revisions < 0 || revisions > 50) return { ok: false, error: 'Included revisions must be a whole number from 0 to 50.' };

  const price = parsePriceDelta(text('price_mode'), text('price_amount'), current.currency);
  if (!price.ok) return price;
  const total = computeRevisedTotal(current.amount_minor, price.delta);
  if (!total.ok) return total;

  const proposed: Terms = { ...current, amount_minor: total.total, delivery_date: delivery, included_revisions: revisions, deliverables, excluded_work: excluded };
  if (!compareTerms(current, proposed).some((row) => row.changed)) {
    return { ok: false, error: 'Nothing changed. Change the price, deadline, revisions or scope first.' };
  }
  const key = text('idempotency_key').slice(0, 80);
  return { ok: true, proposed, delta: price.delta, description, reason, notes, idempotencyKey: key || null };
}
