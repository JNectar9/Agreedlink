import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PROTECTED = ['/dashboard', '/portal'];
const isProtected = (path: string) => PROTECTED.some((p) => path === p || path.startsWith(`${p}/`));

// Keeps the Supabase login fresh on every page in the matcher, and sends signed-out visitors away from the private pages only.
// Public pages (home, pricing, about...) never redirect anyone; they only refresh the login so it is not lost when you
// visit them from the dashboard.
export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const protectedPath = isProtected(request.nextUrl.pathname);
  const toSignIn = () => {
    const target = request.nextUrl.clone();
    const wanted = request.nextUrl.pathname;
    target.pathname = '/signin';
    target.search = wanted === '/dashboard' ? '' : `?next=${encodeURIComponent(wanted)}`;
    return NextResponse.redirect(target);
  };
  if (!url || !key) return protectedPath ? toSignIn() : NextResponse.next();

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

  if (!protectedPath) {
    try {
      await supabase.auth.getUser();
    } catch {
      // A hiccup while refreshing must never block a public page.
    }
    return response;
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return toSignIn();
  return response;
}

export const config = { matcher: ['/', '/pricing', '/about', '/contact', '/privacy', '/terms', '/dashboard/:path*', '/portal/:path*'] };
