// Timestamps are stored in UTC (timestamptz). These helpers only format them for display.
export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone });
    return true;
  } catch {
    return false;
  }
}

export function formatDateTime(iso: string, timeZone = 'UTC', locale = 'en'): string {
  const zone = isValidTimeZone(timeZone) ? timeZone : 'UTC';
  // Note: dateStyle/timeStyle cannot be combined with timeZoneName, so explicit fields are used.
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: zone,
    timeZoneName: 'short'
  }).format(new Date(iso));
}

/** Plain calendar dates (YYYY-MM-DD) have no time zone, so they are formatted as UTC dates. */
export function formatPlainDate(date: string, locale = 'en'): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`));
}

/** "Good morning", "Good afternoon" or "Good evening" for the given time zone. */
export function greeting(timeZone = 'UTC', now: Date = new Date()): string {
  const zone = isValidTimeZone(timeZone) ? timeZone : 'UTC';
  const hour = Number(new Intl.DateTimeFormat('en', { hour: 'numeric', hourCycle: 'h23', timeZone: zone }).format(now));
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
}
