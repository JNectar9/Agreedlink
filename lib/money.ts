// Money is always an integer count of minor units plus an ISO 4217 currency code. No floats in calculations.
// The currency list, names, symbols and minor-unit digits come from the standard Intl data built into
// the browser and Node, not from a hand-typed list.
export type CurrencyCode = string;

const FALLBACK_CODES = ['NGN', 'USD', 'GBP', 'EUR', 'GHS', 'KES', 'ZAR', 'CAD', 'AUD', 'JPY', 'INR', 'CNY', 'AED', 'XOF', 'XAF'];

function loadCodes(): string[] {
  try {
    const list = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf?.('currency');
    return list && list.length > 0 ? list : FALLBACK_CODES;
  } catch {
    return FALLBACK_CODES;
  }
}

const ALL_CODES = loadCodes();
const SUPPORTED = new Set(ALL_CODES);

/** Currencies shown first in lists. */
export const PRIORITY_CODES = ['NGN', 'USD', 'GBP', 'EUR', 'GHS', 'KES', 'ZAR'];

export function isCurrencyCode(value: string): boolean {
  return /^[A-Z]{3}$/.test(value) && SUPPORTED.has(value);
}

/** Number of minor-unit digits for the currency (2 for NGN and USD, 0 for JPY, 3 for KWD). */
export function currencyExponent(currency: CurrencyCode): number {
  try {
    return new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2;
  } catch {
    return 2;
  }
}

export type CurrencyOption = { code: string; name: string; symbol: string };

const AMBIGUOUS_SYMBOLS = new Set(['$', '¥', 'kr', '£']);
const modeCache = new Map<string, 'narrowSymbol' | 'symbol'>();

/**
 * Which standard symbol style to use. The short local symbol (for example the naira sign for NGN) is used when it is
 * unambiguous. Shared signs such as $ are shown in the locale's own form (US$, CA$, A$) so currencies never look alike.
 */
export function currencyDisplayMode(code: string, locale = 'en'): 'narrowSymbol' | 'symbol' {
  const key = `${locale}:${code}`;
  const cached = modeCache.get(key);
  if (cached) return cached;
  let mode: 'narrowSymbol' | 'symbol' = 'symbol';
  try {
    const narrow = new Intl.NumberFormat(locale, { style: 'currency', currency: code, currencyDisplay: 'narrowSymbol' }).formatToParts(0).find((p) => p.type === 'currency')?.value;
    if (narrow && narrow !== code && !AMBIGUOUS_SYMBOLS.has(narrow)) mode = 'narrowSymbol';
  } catch {
    mode = 'symbol';
  }
  modeCache.set(key, mode);
  return mode;
}

export function currencySymbol(code: string, locale = 'en'): string {
  try {
    const parts = new Intl.NumberFormat(locale, { style: 'currency', currency: code, currencyDisplay: currencyDisplayMode(code, locale) }).formatToParts(0);
    return parts.find((p) => p.type === 'currency')?.value ?? code;
  } catch {
    return code;
  }
}

/** Every supported world currency with its name and symbol, priority currencies first. */
export function currencyOptions(locale = 'en'): CurrencyOption[] {
  let names: Intl.DisplayNames | null = null;
  try {
    names = new Intl.DisplayNames([locale], { type: 'currency' });
  } catch {
    names = null;
  }
  const rest = ALL_CODES.filter((c) => !PRIORITY_CODES.includes(c)).sort();
  const ordered = [...PRIORITY_CODES.filter((c) => SUPPORTED.has(c)), ...rest];
  return ordered.map((code) => ({ code, name: names?.of(code) ?? code, symbol: currencySymbol(code, locale) }));
}

/**
 * Parse a typed amount such as "1,250.50" into minor units using string arithmetic only.
 * Accepts "." as the decimal separator and optional "," thousands separators.
 * Returns null for anything ambiguous, negative, or with too many decimals for the currency.
 */
export function parseMoneyToMinor(input: string, currency: CurrencyCode): number | null {
  const exponent = currencyExponent(currency);
  const text = input.trim();
  if (!/^(\d{1,3}(,\d{3})+|\d+)(\.\d+)?$/.test(text)) return null;
  const [whole, fraction = ''] = text.split('.');
  if (fraction.length > exponent) return null;
  const minor = Number(whole.replace(/,/g, '') + fraction.padEnd(exponent, '0'));
  return Number.isSafeInteger(minor) ? minor : null;
}

/** Display only. The division is for formatting and never feeds a calculation. */
export function formatMinor(minor: number, currency: CurrencyCode, locale = 'en'): string {
  const exponent = currencyExponent(currency);
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    currencyDisplay: currencyDisplayMode(currency, locale),
    minimumFractionDigits: exponent,
    maximumFractionDigits: exponent
  }).format(minor / 10 ** exponent);
}

export function formatDeltaMinor(deltaMinor: number, currency: CurrencyCode, locale = 'en'): string {
  if (deltaMinor === 0) return 'No change';
  const sign = deltaMinor > 0 ? '+' : '-';
  return `${sign}${formatMinor(Math.abs(deltaMinor), currency, locale)}`;
}

/** Formats any stored amount; falls back to a plain label if the code is not a known currency. */
export function formatMinorSafe(minor: number, currency: string, locale = 'en'): string {
  return isCurrencyCode(currency) ? formatMinor(minor, currency, locale) : `${minor} ${currency} (minor units)`;
}

/** Minor units to an editable decimal string using string arithmetic only (for form defaults). */
export function minorToInputString(minor: number, currency: CurrencyCode): string {
  const exponent = currencyExponent(currency);
  if (exponent === 0) return String(minor);
  const padded = String(minor).padStart(exponent + 1, '0');
  return `${padded.slice(0, -exponent)}.${padded.slice(-exponent)}`;
}
