import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isServerConfigured } from '@/lib/env';
import { hashToken, TOKEN_PATTERN } from '@/lib/tokens';

const BOTS = /bot|crawler|spider|preview|whatsapp|facebookexternalhit|slack|telegram|curl|wget|headless/i;

// Called by the browser after the customer page renders. Stores only timestamps and a count,
// never an IP address. Best effort: it can miss opens (blocked scripts) and cannot prove reading.
export async function POST(request: Request) {
  if (!isServerConfigured() || BOTS.test(request.headers.get('user-agent') ?? '')) return new NextResponse(null, { status: 204 });
  let token = '';
  try {
    token = String((await request.json())?.token ?? '');
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  if (!TOKEN_PATTERN.test(token)) return new NextResponse(null, { status: 400 });
  await createAdminClient().rpc('record_link_open', { p_token_hash: hashToken(token) });
  return new NextResponse(null, { status: 204 });
}
