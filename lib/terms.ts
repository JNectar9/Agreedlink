import { formatMinor, formatDeltaMinor, type CurrencyCode } from './money';
import { formatPlainDate } from './time';

export type PricingMethod = 'quote_first' | 'hourly' | 'fixed_per_item';

/** The full set of terms a customer sees. Stored as an immutable JSON snapshot per version. */
export type Terms = {
  project_name: string;
  client_name: string;
  client_email: string | null;
  description: string;
  deliverables: string;
  start_date: string | null;
  delivery_date: string;
  currency: CurrencyCode;
  amount_minor: number;
  included_revisions: number;
  revision_definition: string;
  excluded_work: string;
  additional_work_pricing: PricingMethod;
  additional_work_price_minor: number | null;
  payment_terms_text: string;
};

export type TermRow = { key: string; label: string; before: string; after: string; changed: boolean };

function summary(t: Terms) {
  return {
    price: formatMinor(t.amount_minor, t.currency),
    delivery: formatPlainDate(t.delivery_date),
    revisions: String(t.included_revisions),
    deliverables: t.deliverables.trim() || 'None listed',
    excluded: t.excluded_work.trim() || 'None listed'
  };
}

/** Side-by-side rows for the current approved terms versus a proposal. */
export function compareTerms(current: Terms, proposed: Terms): TermRow[] {
  const a = summary(current);
  const b = summary(proposed);
  const row = (key: string, label: string, before: string, after: string): TermRow => ({
    key,
    label,
    before,
    after,
    changed: before !== after
  });
  return [
    row('price', 'Total price', a.price, b.price),
    row('delivery', 'Delivery date', a.delivery, b.delivery),
    row('revisions', 'Included revisions', a.revisions, b.revisions),
    row('deliverables', 'Deliverables', a.deliverables, b.deliverables),
    row('excluded', 'Work not included', a.excluded, b.excluded)
  ];
}

export function priceDifference(current: Terms, proposed: Terms): string {
  return formatDeltaMinor(proposed.amount_minor - current.amount_minor, current.currency);
}

export function pricingLabel(t: Terms): string {
  if (t.additional_work_pricing === 'quote_first') return 'Quoted before any extra work begins';
  const price = t.additional_work_price_minor == null ? 'price not set' : formatMinor(t.additional_work_price_minor, t.currency);
  return t.additional_work_pricing === 'hourly' ? `Hourly: ${price}` : `Fixed per item: ${price}`;
}
