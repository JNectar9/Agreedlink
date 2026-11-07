import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Keeps the Supabase session fresh and keeps signed-out visitors out of /dashboard and /portal.
// The marketing pages in the matcher below only REFRESH the session. They never redirect and never sign anyone out,
// so a signed-in person who opens the home page or Pricing is still signed in when they come back to the dashboard.
const GUARDED = ['/dashboard', '/portal'];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const guarded = GUARDED.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const toSignIn = () => {
    const target = request.nextUrl.clone();
    target.pathname = '/signin';
    target.search = pathname === '/dashboard' ? '' : `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(target);
  };
  if (!url || !key) return guarded ? toSignIn() : NextResponse.next();

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

  if (!guarded) {
    // Public page: refresh the session if there is one, and always let the page load.
    try {
      await supabase.auth.getUser();
    } catch {
      // A slow or failed refresh must never block a public page.
    }
    return response;
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return toSignIn();
  return response;
}

export const config = {
  matcher: ['/', '/pricing', '/about', '/contact', '/privacy', '/terms', '/dashboard/:path*', '/portal/:path*']
};
