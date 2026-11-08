'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Banners that come from the address (?ok=... or ?error=...) are shown once. This removes them from the address right
 * after the page has loaded, so a refresh, the back button or a bookmark never brings an old banner back.
 * It only edits the address bar. It does not navigate and does not load the page again.
 */
export function ClearNoticeParams() {
  const pathname = usePathname();
  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has('ok') && !url.searchParams.has('error')) return;
    url.searchParams.delete('ok');
    url.searchParams.delete('error');
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  }, [pathname]);
  return null;
}
