import { describe, expect, it } from 'vitest';
import { formatDeltaMinor, formatMinor, isCurrencyCode, minorToInputString, parseMoneyToMinor } from '@/lib/money';

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
