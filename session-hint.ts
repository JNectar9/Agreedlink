// Pure helpers about the Supabase sign-in cookie. No secrets and no network calls, so they are safe in the middleware.

/** The sign-in cookie is named sb-<project>-auth-token, and is split into .0 .1 parts when it is large. */
const SESSION_COOKIE = /^sb-.+-auth-token(\.\d+)?$/;

export function hasSupabaseSessionCookie(cookieNames: string[]): boolean {
  return cookieNames.some((name) => SESSION_COOKIE.test(name));
}

/** Pages that need a signed-in user. Everything else is public. */
export function isProtectedPath(pathname: string): boolean {
  return pathname === '/dashboard' || pathname.startsWith('/dashboard/') || pathname === '/portal' || pathname.startsWith('/portal/');
}
