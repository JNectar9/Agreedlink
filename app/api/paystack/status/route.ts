import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { paystackMode } from '@/lib/paystack';

// TEMPORARY setup check. Signed-in users only. It answers yes or no and never returns a key.
// Open it in the browser on the same address you use for Billing: /api/paystack/status
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'sign_in_required' }, { status: 401 });

  const secret = process.env.PAYSTACK_SECRET_KEY;
  return NextResponse.json(
    {
      paystack_secret_key_present: Boolean(secret && secret.trim()),
      paystack_secret_key_has_extra_spaces: Boolean(secret && secret !== secret.trim()),
      paystack_mode: paystackMode(secret?.trim()),
      supabase_service_role_key_present: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      vercel_environment: process.env.VERCEL_ENV ?? null,
      git_branch: process.env.VERCEL_GIT_COMMIT_REF ?? null,
      deployment_host: process.env.VERCEL_URL ?? null
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
