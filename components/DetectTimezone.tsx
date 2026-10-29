'use client';
import { useEffect, useState } from 'react';

/** Hidden field that carries the device's time zone into the sign-up form. Left empty if it cannot be detected. */
export function DetectTimezone() {
  const [zone, setZone] = useState('');
  useEffect(() => {
    try { setZone(Intl.DateTimeFormat().resolvedOptions().timeZone ?? ''); } catch { setZone(''); }
  }, []);
  return <input type="hidden" name="timezone" value={zone} readOnly />;
}
