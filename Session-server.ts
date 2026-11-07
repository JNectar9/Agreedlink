import { cookies } from 'next/headers';
import { hasSupabaseSessionCookie } from '@/lib/session-hint';

/**
 * True when the browser carries a sign-in cookie. It only decides which buttons the public pages show (for example
 * "Dashboard" instead of "Log in"). It does not prove the session is valid: every protected page still checks it.
 */
export function hasSessionCookie(): boolean {
  return hasSupabaseSessionCookie(cookies().getAll().map((c) => c.name));
}
