import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { toCsv } from '@/lib/affiliate';

export const dynamic = 'force-dynamic';

type Row = Record<string, unknown>;
const list = (v: unknown): Row[] => (Array.isArray(v) ? (v as Row[]) : []);

/** CSV reports for admins only. Amounts are in minor units (kobo or cents) so nothing is rounded. */
export async function GET(request: Request) {
  const kind = new URL(request.url).searchParams.get('kind');
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse('Not found', { status: 404 });
  const { data: isAdmin } = await supabase.rpc('is_admin');
  if (isAdmin !== true) return new NextResponse('Not found', { status: 404 });

  let csv = '';
  if (kind === 'affiliates') {
    const rows = list((await supabase.rpc('admin_affiliate_overview')).data).map((a) => ({
      ...a,
      earnings: list(a.totals).map((t) => `${t.currency}: pending ${t.pending_minor}, approved ${t.approved_minor}, paid ${t.paid_minor}`).join(' | ')
    }));
    csv = toCsv(rows, ['name', 'email', 'whatsapp', 'platform', 'status', 'code', 'clicks', 'registrations', 'paying', 'pro_sales', 'premium_sales', 'earnings', 'created_at']);
  } else if (kind === 'payouts') {
    csv = toCsv(list((await supabase.rpc('admin_affiliate_payouts', { p_status: null })).data),
      ['name', 'code', 'currency', 'total_minor', 'status', 'scheduled_for', 'approved_at', 'payment_reference', 'paid_at']);
  } else if (kind === 'commissions') {
    const people = list((await supabase.rpc('admin_affiliate_overview')).data);
    const rows: Row[] = [];
    for (const p of people) {
      const items = list((await supabase.rpc('admin_affiliate_commissions', { p_affiliate: p.id })).data);
      for (const c of items) rows.push({ affiliate: p.name, code: p.code, ...c });
    }
    csv = toCsv(rows, ['affiliate', 'code', 'kind', 'payment_ref', 'plan', 'month_no', 'currency', 'gross_minor', 'fee_minor', 'net_minor', 'rate_percent', 'commission_minor', 'status', 'payment_date', 'eligible_after', 'reason']);
  } else {
    return new NextResponse('Not found', { status: 404 });
  }
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="affiliate-${kind}-${new Date().toISOString().slice(0, 10)}.csv"`,
      'Cache-Control': 'private, no-store'
    }
  });
}
