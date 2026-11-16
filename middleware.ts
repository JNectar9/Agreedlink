import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { REF_COOKIE, REF_MAX_AGE, REF_PATTERN, isBotAgent, sha256Hex, signRef, verifyRef } from '@/lib/referral-cookie';

// Keeps the Supabase session fresh and keeps signed-out visitors out of /dashboard, /portal and /affiliate.
// The marketing pages in the matcher below only REFRESH the session. They never redirect and never sign anyone out.
// It also records affiliate clicks (?ref=CODE) and attaches a new customer to the affiliate who referred them.
const GUARDED = ['/dashboard', '/portal', '/affiliate'];

/** Calls a database function with the server key. Returns null if anything goes wrong. Never throws. */
async function serverRpc(name: string, body: Record<string, unknown>): Promise<unknown> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  try {
    const res = await fetch(`${url}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store'
    });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

/** A real visitor opened a referral link: count one click per visitor per day and remember the affiliate for 30 days. */
async function captureClick(request: NextRequest, response: NextResponse) {
  const secret = process.env.SHARE_TOKEN_SECRET;
  const code = (request.nextUrl.searchParams.get('ref') ?? '').toUpperCase();
  if (!secret || !REF_PATTERN.test(code)) return;
  const agent = request.headers.get('user-agent');
  if (isBotAgent(agent)) return;
  const ip = (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim();
  const hash = await sha256Hex(`${ip}|${agent}|${new Date().toISOString().slice(0, 10)}|${secret}`);
  const valid = await serverRpc('affiliate_log_click', { p_code: code, p_visitor_hash: hash });
  // The first affiliate link a visitor opens keeps the credit for 30 days. A later link does not take it over.
  if (valid === true && !request.cookies.get(REF_COOKIE)) {
    response.cookies.set(REF_COOKIE, await signRef(code, Date.now(), secret), {
      httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: REF_MAX_AGE, path: '/'
    });
  }
}

/** A signed-in person has a referral cookie: ask the database to attach them (it enforces every rule), then clear the cookie. */
async function claimReferral(request: NextRequest, response: NextResponse, userId: string) {
  const raw = request.cookies.get(REF_COOKIE)?.value;
  const secret = process.env.SHARE_TOKEN_SECRET;
  if (!raw || !secret) return;
  const ref = await verifyRef(raw, secret);
  const outcome = ref ? await serverRpc('affiliate_attribute', { p_user: userId, p_code: ref.code, p_clicked_at: new Date(ref.clickedAtMs).toISOString() }) : 'invalid';
  if (outcome !== null) response.cookies.delete(REF_COOKIE);
}

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
    // Public page: refresh the session if there is one, count a referral click if there is one, and always let the page load.
    try {
      await supabase.auth.getUser();
      if (request.nextUrl.searchParams.has('ref')) await captureClick(request, response);
    } catch {
      // A slow or failed refresh must never block a public page.
    }
    return response;
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return toSignIn();
  try {
    await claimReferral(request, response, user.id);
  } catch {
    // Attribution problems must never block the page.
  }
  return response;
}

export const config = {
  matcher: ['/', '/pricing', '/about', '/contact', '/privacy', '/terms', '/dashboard/:path*', '/portal/:path*', '/affiliate/:path*']
};
