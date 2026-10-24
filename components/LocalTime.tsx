'use client';
import { useEffect, useState } from 'react';
import { formatDateTime } from '@/lib/time';

/** Renders a UTC timestamp in the visitor's own time zone (UTC first, then local after load). */
export function LocalTime({ iso }: { iso: string }) {
  const [text, setText] = useState(() => formatDateTime(iso, 'UTC'));
  useEffect(() => {
    setText(formatDateTime(iso, Intl.DateTimeFormat().resolvedOptions().timeZone, navigator.language));
  }, [iso]);
  return <time dateTime={iso}>{text}</time>;
}
