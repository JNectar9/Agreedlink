import { NextResponse } from 'next/server';
import { requireSession, type AgreementRow } from '@/lib/data';
import { buildAgreementPdf, pdfFileName } from '@/lib/agreement-pdf';
import { isUuid } from '@/lib/subscriptions';
import type { Terms } from '@/lib/terms';

export const dynamic = 'force-dynamic';

/**
 * Downloads a PDF record of one agreement. Pro and Premium only. Row Level Security means the owner is the only
 * person who can read the agreement, so a link to someone else's agreement simply returns "not found".
 */
export async function GET(request: Request, { params }: { params: { id: string } }) {
  if (!isUuid(params.id)) return new NextResponse('Not found', { status: 404 });
  const { supabase, profile, user } = await requireSession();

  const subRes = await supabase.rpc('my_subscription');
  const plan = (subRes.data as { effective_plan?: string } | null)?.effective_plan ?? 'free';
  if (plan !== 'pro' && plan !== 'premium') {
    const message = encodeURIComponent('PDF export is part of the Pro and Premium plans.');
    return NextResponse.redirect(new URL(`/dashboard/billing?error=${message}`, request.url), 303);
  }

  const { data: row } = await supabase.from('agreements').select('*').eq('id', params.id).maybeSingle();
  if (!row) return new NextResponse('Not found', { status: 404 });
  const a = row as AgreementRow & { client_email?: string | null; completed_at?: string | null };

  const [versionsRes, approvalsRes, changesRes] = await Promise.all([
    supabase.from('agreement_versions').select('version_number, terms, created_at').eq('agreement_id', a.id),
    supabase.from('version_approvals').select('*').eq('agreement_id', a.id).eq('version_number', a.current_version).maybeSingle(),
    supabase.from('change_requests').select('status, description, price_delta_minor, created_at, decided_at, decided_by_name').eq('agreement_id', a.id).order('created_at', { ascending: true })
  ]);

  const versionRows = (versionsRes.data ?? []) as { version_number: number; terms: Terms; created_at: string }[];
  const current = versionRows.find((v) => v.version_number === a.current_version)?.terms;
  if (!current) return new NextResponse('Not found', { status: 404 });

  const bytes = buildAgreementPdf({
    agreement: {
      projectName: a.project_name, clientName: a.client_name, clientEmail: a.client_email ?? null, status: a.status, currency: a.currency,
      originalAmountMinor: a.original_amount_minor, currentAmountMinor: a.current_amount_minor, deliveryDate: a.current_delivery_date,
      version: a.current_version, createdAt: a.created_at, completedAt: a.completed_at ?? null
    },
    terms: current,
    creator: {
      name: profile.business_name || profile.display_name || '',
      email: profile.business_email || user.email || '',
      phone: profile.business_phone ?? '', website: profile.business_website ?? '', address: profile.business_address ?? ''
    },
    approval: (approvalsRes.data as (Record<string, unknown> & { approved_at?: string }) | null) ?? null,
    versions: versionRows.map((v) => ({ number: v.version_number, createdAt: v.created_at, amountMinor: v.terms.amount_minor, deliveryDate: v.terms.delivery_date })),
    changes: ((changesRes.data ?? []) as { status: string; description: string; price_delta_minor: number; created_at: string; decided_at: string | null; decided_by_name: string | null }[]).map((c) => ({
      status: c.status, description: c.description, priceDeltaMinor: c.price_delta_minor, createdAt: c.created_at, decidedAt: c.decided_at, decidedBy: c.decided_by_name
    })),
    timezone: profile.timezone,
    generatedAt: new Date().toISOString()
  });

  // A plain copy keeps the body type simple for every TypeScript version.
  return new Response(new Uint8Array(bytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${pdfFileName(a.project_name, a.current_version)}"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}
