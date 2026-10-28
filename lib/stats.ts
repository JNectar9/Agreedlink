export type DayBucket = { key: string; label: string; value: number };

function dayKey(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

/** Counts how many ISO timestamps fall on each of the last `days` calendar days in the given time zone. */
export function bucketByDay(isoDates: string[], days: number, now: Date = new Date(), timeZone = 'UTC'): DayBucket[] {
  const labelFmt = new Intl.DateTimeFormat('en', { timeZone, month: 'short', day: 'numeric' });
  const buckets: DayBucket[] = [];
  const seen = new Set<string>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const key = dayKey(d, timeZone);
    if (seen.has(key)) continue;
    seen.add(key);
    buckets.push({ key, label: labelFmt.format(d), value: 0 });
  }
  const index = new Map(buckets.map((b) => [b.key, b]));
  for (const iso of isoDates) {
    const hit = index.get(dayKey(new Date(iso), timeZone));
    if (hit) hit.value += 1;
  }
  return buckets;
}
