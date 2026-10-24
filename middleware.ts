import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Refreshes the Supabase session cookie and keeps signed-out visitors out of /dashboard.
export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const toSignIn = () => {
    const target = request.nextUrl.clone();
    target.pathname = '/signin';
    target.search = '';
    return NextResponse.redirect(target);
  };
  if (!url || !key) return toSignIn();

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
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return toSignIn();
  return response;
}

export const config = { matcher: ['/dashboard/:path*'] };
