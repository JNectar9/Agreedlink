// Money is always an integer count of minor units plus a currency code. No floats in calculations.
// Only these currencies are supported and tested. Add more here (with the right exponent) and in tests.
export const CURRENCIES = {
  USD: { exponent: 2, label: 'US dollar' },
  NGN: { exponent: 2, label: 'Nigerian naira' },
  GBP: { exponent: 2, label: 'British pound' },
  EUR: { exponent: 2, label: 'Euro' }
} as const;

export type CurrencyCode = keyof typeof CURRENCIES;
export const CURRENCY_CODES = Object.keys(CURRENCIES) as [CurrencyCode, ...CurrencyCode[]];

export function isCurrencyCode(value: string): value is CurrencyCode {
  return Object.prototype.hasOwnProperty.call(CURRENCIES, value);
}

/**
 * Parse a typed amount such as "1,250.50" into minor units using string arithmetic only.
 * Accepts "." as the decimal separator and optional "," thousands separators.
 * Returns null for anything ambiguous, negative, or with too many decimals.
 */
export function parseMoneyToMinor(input: string, currency: CurrencyCode): number | null {
  const exponent = CURRENCIES[currency].exponent;
  const text = input.trim();
  if (!/^(\d{1,3}(,\d{3})+|\d+)(\.\d+)?$/.test(text)) return null;
  const [whole, fraction = ''] = text.split('.');
  if (fraction.length > exponent) return null;
  const minor = Number(whole.replace(/,/g, '') + fraction.padEnd(exponent, '0'));
  return Number.isSafeInteger(minor) ? minor : null;
}

/** Display only. The division is for formatting and never feeds a calculation. */
export function formatMinor(minor: number, currency: CurrencyCode, locale = 'en'): string {
  const { exponent } = CURRENCIES[currency];
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: exponent,
    maximumFractionDigits: exponent
  }).format(minor / 10 ** exponent);
}

export function formatDeltaMinor(deltaMinor: number, currency: CurrencyCode, locale = 'en'): string {
  if (deltaMinor === 0) return 'No change';
  const sign = deltaMinor > 0 ? '+' : '-';
  return `${sign}${formatMinor(Math.abs(deltaMinor), currency, locale)}`;
}

/** Formats any stored amount; falls back to a plain label if a currency is not in the supported list. */
export function formatMinorSafe(minor: number, currency: string, locale = 'en'): string {
  return isCurrencyCode(currency) ? formatMinor(minor, currency, locale) : `${minor} ${currency} (minor units)`;
}

/** Minor units to an editable decimal string using string arithmetic only (for form defaults). */
export function minorToInputString(minor: number, currency: CurrencyCode): string {
  const { exponent } = CURRENCIES[currency];
  if (exponent === 0) return String(minor);
  const padded = String(minor).padStart(exponent + 1, '0');
  return `${padded.slice(0, -exponent)}.${padded.slice(-exponent)}`;
}
