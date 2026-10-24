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
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: zone,
    timeZoneName: 'short'
  }).format(new Date(iso));
}

/** Plain calendar dates (YYYY-MM-DD) have no time zone, so they are formatted as UTC dates. */
export function formatPlainDate(date: string, locale = 'en'): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`));
}
