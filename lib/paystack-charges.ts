// Pure maths and parsing for Paystack charges. No imports, so it can be tested on its own.
// Fee and VAT figures are always read from, or derived from, the fee Paystack itself reported for the payment.
// They are never estimated from a price list.

/** 'additional': VAT is charged on top of data.fees (net = amount - fees - VAT).
 *  'included':   data.fees already contains the VAT (net = amount - fees; VAT is shown separately).
 *  Which one is true for your Paystack account must be confirmed against a real live payment. */
export type VatMode = 'additional' | 'included';

/** Nigerian VAT on service fees: 7.5%, as basis points. */
export const VAT_RATE_BASIS_POINTS = 750;

export function vatModeFromEnv(value: string | undefined | null): VatMode {
  return String(value ?? '').trim().toLowerCase() === 'included' ? 'included' : 'additional';
}

export type Charges = { feeMinor: number; vatMinor: number; totalChargesMinor: number; vatMode: VatMode };

/**
 * feesMinor is data.fees from the VERIFIED Paystack transaction, in kobo.
 * Returns null when Paystack gave no usable fee. The caller must then record NO commission, never a guess.
 * A fee of 0 is valid (Paystack waives the fee on small payments).
 */
export function computePaystackCharges(feesMinor: unknown, mode: VatMode = 'additional'): Charges | null {
  if (typeof feesMinor !== 'number' || !Number.isInteger(feesMinor) || feesMinor < 0) return null;
  if (mode === 'included') {
    const vat = Math.round((feesMinor * VAT_RATE_BASIS_POINTS) / (10000 + VAT_RATE_BASIS_POINTS));
    return { feeMinor: feesMinor - vat, vatMinor: vat, totalChargesMinor: feesMinor, vatMode: mode };
  }
  const vat = Math.floor((feesMinor * VAT_RATE_BASIS_POINTS + 5000) / 10000); // round half up to the kobo
  return { feeMinor: feesMinor, vatMinor: vat, totalChargesMinor: feesMinor + vat, vatMode: mode };
}

/** Net revenue = payment - Paystack fee - VAT on that fee. Null if the charges are larger than the payment. */
export function netRevenueMinor(grossMinor: number, charges: Charges): number | null {
  if (!Number.isInteger(grossMinor) || grossMinor <= 0) return null;
  const net = grossMinor - charges.totalChargesMinor;
  return net >= 0 ? net : null;
}

/** Events that cancel a commission. A refund that Paystack has processed, or a dispute (chargeback) that was opened. */
export const REVERSAL_EVENTS: Record<string, string> = {
  'refund.processed': 'Paystack refund processed',
  'charge.dispute.create': 'Paystack dispute opened'
};

/** The original transaction's reference inside a refund or dispute event. Null if it cannot be found. */
export function reversalReference(event: { data?: unknown } | null | undefined): string | null {
  const d = event?.data;
  if (!d || typeof d !== 'object') return null;
  const data = d as Record<string, unknown>;
  const tx = data.transaction;
  const fromTx = tx && typeof tx === 'object' ? (tx as Record<string, unknown>).reference : undefined;
  for (const c of [data.transaction_reference, fromTx]) {
    if (typeof c === 'string' && /^[A-Za-z0-9._=-]{8,100}$/.test(c)) return c;
  }
  return null;
}
