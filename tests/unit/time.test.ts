import { describe, expect, it } from 'vitest';
import { formatDateTime, formatPlainDate, greeting, isValidTimeZone } from '@/lib/time';

describe('time formatting', () => {
  it('formats a UTC timestamp in the chosen time zone without throwing', () => {
    const utc = formatDateTime('2026-10-24T22:30:00Z', 'UTC');
    expect(utc).toContain('2026');
    expect(utc).toContain('UTC');
    const lagos = formatDateTime('2026-10-24T22:30:00Z', 'Africa/Lagos');
    expect(lagos).toContain('11:30');
  });

  it('falls back to UTC for an invalid time zone', () => {
    expect(formatDateTime('2026-10-24T22:30:00Z', 'Not/AZone')).toContain('UTC');
  });

  it('formats plain dates without shifting the day', () => {
    expect(formatPlainDate('2026-12-10')).toContain('10');
    expect(formatPlainDate('2026-12-10')).toContain('2026');
  });

  it('validates time zones', () => {
    expect(isValidTimeZone('Europe/London')).toBe(true);
    expect(isValidTimeZone('Nope')).toBe(false);
  });

  it('chooses a greeting using the given time zone', () => {
    expect(greeting('UTC', new Date('2026-10-25T08:00:00Z'))).toBe('Good morning');
    expect(greeting('Africa/Lagos', new Date('2026-10-25T11:30:00Z'))).toBe('Good afternoon');
    expect(greeting('Africa/Lagos', new Date('2026-10-25T22:30:00Z'))).toBe('Good evening');
    expect(greeting('Not/AZone', new Date('2026-10-25T08:00:00Z'))).toBe('Good morning');
  });
});
