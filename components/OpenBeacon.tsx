'use client';
import { useEffect } from 'react';

/** Records one "link opened" after the page renders in a real browser (not for previews). */
export function OpenBeacon({ token }: { token: string }) {
  useEffect(() => {
    fetch('/api/open', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
      keepalive: true
    }).catch(() => undefined);
  }, [token]);
  return null;
}
