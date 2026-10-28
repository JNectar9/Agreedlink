import { describe, expect, it } from 'vitest';
import { bucketByDay } from '@/lib/stats';

describe('bucketByDay', () => {
  const now = new Date('2026-10-25T12:00:00Z');

  it('returns one bucket per day, oldest first, ending today', () => {
    const b = bucketByDay([], 7, now, 'UTC');
    expect(b).toHaveLength(7);
    expect(b[0].key).toBe('2026-10-19');
    expect(b[6].key).toBe('2026-10-25');
    expect(b.every((x) => x.value === 0)).toBe(true);
  });

  it('counts timestamps on the right day and ignores anything outside the window', () => {
    const b = bucketByDay(['2026-10-25T01:00:00Z', '2026-10-25T09:00:00Z', '2026-10-24T10:00:00Z', '2026-10-01T10:00:00Z'], 7, now, 'UTC');
    expect(b[6].value).toBe(2);
    expect(b[5].value).toBe(1);
    expect(b.reduce((s, x) => s + x.value, 0)).toBe(3);
  });

  it('uses the given time zone to decide which day a timestamp belongs to', () => {
    // 23:30 UTC on Oct 24 is already Oct 25 in Lagos (UTC+1).
    const lagos = bucketByDay(['2026-10-24T23:30:00Z'], 3, now, 'Africa/Lagos');
    expect(lagos[2].key).toBe('2026-10-25');
    expect(lagos[2].value).toBe(1);
    const utc = bucketByDay(['2026-10-24T23:30:00Z'], 3, now, 'UTC');
    expect(utc[2].value).toBe(0);
    expect(utc[1].value).toBe(1);
  });
});
