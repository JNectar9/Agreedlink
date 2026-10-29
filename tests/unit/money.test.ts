import { describe, expect, it } from 'vitest';
import { currencyExponent, currencyOptions, currencySymbol, formatDeltaMinor, formatMinor, isCurrencyCode, minorToInputString, parseMoneyToMinor } from '@/lib/money';

describe('parseMoneyToMinor', () => {
  it('converts typed amounts to integer minor units', () => {
    expect(parseMoneyToMinor('1,250.50', 'USD')).toBe(125050);
    expect(parseMoneyToMinor('10', 'GBP')).toBe(1000);
    expect(parseMoneyToMinor('10.5', 'EUR')).toBe(1050);
    expect(parseMoneyToMinor('0.05', 'NGN')).toBe(5);
    expect(parseMoneyToMinor('150,000.00', 'NGN')).toBe(15000000);
  });

  it('rejects ambiguous, negative, or over-precise input', () => {
    for (const bad of ['', 'abc', '-5', '10.555', '1.250,50', '12,34', '10.', '.5', '1e3']) {
      expect(parseMoneyToMinor(bad, 'USD')).toBeNull();
    }
  });

  it('rejects values beyond the safe integer range', () => {
    expect(parseMoneyToMinor('9007199254740993', 'USD')).toBeNull();
  });

  it('adds without floating point drift', () => {
    expect((parseMoneyToMinor('0.10', 'USD') ?? 0) + (parseMoneyToMinor('0.20', 'USD') ?? 0)).toBe(30);
  });
});

describe('formatting', () => {
  it('formats minor units for display', () => {
    expect(formatMinor(123456, 'USD')).toContain('1,234.56');
    expect(formatMinor(5, 'NGN')).toContain('0.05');
  });

  it('formats price differences with a sign', () => {
    expect(formatDeltaMinor(0, 'USD')).toBe('No change');
    expect(formatDeltaMinor(2500, 'USD').startsWith('+')).toBe(true);
    expect(formatDeltaMinor(-2500, 'USD').startsWith('-')).toBe(true);
  });

  it('builds editable decimal strings with string arithmetic', () => {
    expect(minorToInputString(5, 'USD')).toBe('0.05');
    expect(minorToInputString(125050, 'USD')).toBe('1250.50');
    expect(minorToInputString(100, 'EUR')).toBe('1.00');
  });

  it('only accepts listed currencies', () => {
    expect(isCurrencyCode('USD')).toBe(true);
    expect(isCurrencyCode('XYZ')).toBe(false);
    expect(isCurrencyCode('toString')).toBe(false);
  });
});

describe('world currencies', () => {
  it('supports the requested currencies and rejects made-up codes', () => {
    for (const code of ['NGN', 'USD', 'GBP', 'EUR', 'GHS', 'KES', 'ZAR', 'JPY']) expect(isCurrencyCode(code)).toBe(true);
    for (const code of ['XYZ', 'ngn', 'NG', 'NGNN', '']) expect(isCurrencyCode(code)).toBe(false);
  });

  it('uses the correct number of minor-unit digits from standard data', () => {
    expect(currencyExponent('NGN')).toBe(2);
    expect(currencyExponent('JPY')).toBe(0);
    expect(currencyExponent('KWD')).toBe(3);
    expect(parseMoneyToMinor('1500', 'JPY')).toBe(1500);
    expect(parseMoneyToMinor('10.5', 'JPY')).toBeNull();
    expect(parseMoneyToMinor('1.234', 'KWD')).toBe(1234);
    expect(minorToInputString(1234, 'KWD')).toBe('1.234');
  });

  it('formats with the right symbol for each currency', () => {
    expect(formatMinor(150000, 'NGN')).toContain('1,500.00');
    expect(formatMinor(150000, 'GHS')).toContain('1,500.00');
    expect(formatMinor(1500, 'JPY')).toContain('1,500');
    expect(currencySymbol('NGN')).toBe('₦');
    expect(currencySymbol('GBP')).toBe('£');
    expect(currencySymbol('EUR')).toBe('€');
    expect(formatMinor(150000, 'NGN')).toContain('₦');
    expect(formatMinor(150000, 'USD')).toContain('$');
    expect(formatMinor(150000, 'CAD')).not.toBe(formatMinor(150000, 'USD'));
  });

  it('lists world currencies with codes, names and symbols, popular ones first', () => {
    const options = currencyOptions();
    expect(options.slice(0, 7).map((o) => o.code)).toEqual(['NGN', 'USD', 'GBP', 'EUR', 'GHS', 'KES', 'ZAR']);
    expect(options.length > 50).toBe(true);
    const zar = options.find((o) => o.code === 'ZAR');
    expect(zar?.name).toBe('South African Rand');
    expect(options.every((o) => o.name.length > 0 && o.symbol.length > 0)).toBe(true);
  });
});
