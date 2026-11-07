import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { hasSupabaseSessionCookie, isProtectedPath } from '@/lib/session-hint';

/**
 * Keeps the Supabase sign-in alive on every page and keeps signed-out visitors out of /dashboard and /portal.
 *
 * Why it also runs on public pages: Supabase renews the sign-in cookie only here, because a page cannot write cookies.
 * If a signed-in person opened a public page (like /pricing) after their short-lived token expired, the page would use up
 * their one-time refresh token without saving the new one, and the next visit to /dashboard would sign them out.
 * Public pages never redirect: a visitor with no sign-in cookie is let straight through without any Supabase call.
 */
export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const protectedPath = isProtectedPath(request.nextUrl.pathname);

  const toSignIn = () => {
    const target = request.nextUrl.clone();
    const wanted = request.nextUrl.pathname;
    target.pathname = '/signin';
    target.search = wanted === '/dashboard' ? '' : `?next=${encodeURIComponent(wanted)}`;
    return NextResponse.redirect(target);
  };

  if (!url || !key) return protectedPath ? toSignIn() : NextResponse.next();
  if (!protectedPath && !hasSupabaseSessionCookie(request.cookies.getAll().map((c) => c.name))) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      }
    }
  });

  try {
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user && protectedPath) return toSignIn();
  } catch {
    // Supabase could not be reached. Protected pages stay closed. Public pages still open.
    if (protectedPath) return toSignIn();
  }
  return response;
}

// Everything except static files, images, the payment webhook and other API routes, and the sign-in callback.
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|api/|auth/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml|woff2?)$).*)']
};
