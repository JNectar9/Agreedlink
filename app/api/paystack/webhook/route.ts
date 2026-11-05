import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { chargeEventKey, isPlausibleReference, isValidPaystackSignature, verifyPaystackTransaction } from '@/lib/paystack';

// Paystack calls this URL server to server. It carries no login cookie, so it is deliberately outside /dashboard
// (the middleware only guards /dashboard and /portal). Its protection is the HMAC SHA-512 signature below.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const reply = (body: Record<string, unknown>, status = 200) => NextResponse.json(body, { status });

export async function POST(req: NextRequest) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    console.error('[paystack-webhook] PAYSTACK_SECRET_KEY is not set');
    return reply({ error: 'not_configured' }, 500);
  }

  // 1. Raw bytes exactly as sent. The signature is checked BEFORE the body is parsed or trusted.
  const raw = Buffer.from(await req.arrayBuffer());
  if (!isValidPaystackSignature(raw, req.headers.get('x-paystack-signature'), secret)) {
    return reply({ error: 'invalid_signature' }, 401);
  }

  let event: { event?: unknown; data?: { reference?: unknown } | null };
  try {
    event = JSON.parse(raw.toString('utf8'));
  } catch {
    return reply({ error: 'invalid_json' }, 400);
  }
  const eventType = typeof event.event === 'string' ? event.event.slice(0, 60) : 'unknown';
  const reference = event.data?.reference;

  let db: ReturnType<typeof createAdminClient>;
  try {
    db = createAdminClient();
  } catch (err) {
    console.error('[paystack-webhook] database client unavailable', err);
    return reply({ error: 'not_configured' }, 500);
  }

  // 2. Only charge.success changes anything. Other events are logged and acknowledged so Paystack stops retrying.
  if (eventType !== 'charge.success' || !isPlausibleReference(reference)) {
    const key = chargeEventKey(eventType, isPlausibleReference(reference) ? reference : createHash('sha256').update(raw).digest('hex'));
    await db.from('paystack_webhook_events').insert({
      event_key: key,
      event_type: eventType,
      reference: isPlausibleReference(reference) ? reference : null,
      status: 'ignored',
      payload: event,
      processed_at: new Date().toISOString()
    }); // a repeated delivery hits the unique key; that is fine, the answer is still 200
    return reply({ received: true, handled: false });
  }

  // 3. Duplicate protection: one row per event key. A delivery that was already processed is acknowledged and stops here.
  const eventKey = chargeEventKey(eventType, reference);
  const { error: insertError } = await db.from('paystack_webhook_events').insert({
    event_key: eventKey,
    event_type: eventType,
    reference,
    status: 'processing',
    payload: event
  });
  if (insertError) {
    if (insertError.code !== '23505') {
      console.error('[paystack-webhook] could not record event', insertError.message);
      return reply({ error: 'storage_error' }, 500); // Paystack retries
    }
    const { data: existing } = await db.from('paystack_webhook_events').select('status').eq('event_key', eventKey).maybeSingle();
    if (existing?.status === 'processed') return reply({ received: true, duplicate: true });
    // Earlier attempt failed or was interrupted: continue. paystack_activate is idempotent, so this cannot double-apply.
  }

  const finish = async (status: string, httpStatus: number, error: string | null = null) => {
    await db
      .from('paystack_webhook_events')
      .update({ status, error: error ? error.slice(0, 500) : null, processed_at: new Date().toISOString() })
      .eq('event_key', eventKey);
    return reply({ received: true, status }, httpStatus);
  };

  try {
    // 4. Ask Paystack whether this reference was really paid. The webhook body alone is never proof of payment.
    const verified = await verifyPaystackTransaction(reference, secret);
    if (!verified.ok) {
      return verified.transient ? await finish('failed', 500, verified.message) : await finish('not_successful', 200, verified.message);
    }
    const d = verified.data;
    if (d.status !== 'success' || d.reference !== reference) {
      return await finish('not_successful', 200, `Paystack status: ${d.status}`);
    }

    // 5. Atomic, idempotent activation. The database compares the paid amount and currency with the amount stored
    //    on the server when checkout started, and it writes the user's row in public.subscriptions.
    const { data: outcome, error: rpcError } = await db.rpc('paystack_activate', {
      p_reference: reference,
      p_amount_minor: d.amount,
      p_currency: d.currency,
      p_paystack_id: String(d.id ?? ''),
      p_channel: d.channel ?? '',
      p_customer_code: d.customer?.customer_code ?? ''
    });
    if (rpcError) {
      console.error('[paystack-webhook] activation failed', rpcError.message);
      return await finish('failed', 500, rpcError.message);
    }

    if (outcome === 'activated' || outcome === 'already_processed') return await finish('processed', 200);
    // These need a person to look at them. Retrying cannot fix them, so acknowledge.
    if (outcome === 'unknown_reference' || outcome === 'amount_mismatch') return await finish(outcome, 200, `Activation outcome: ${outcome}`);
    return await finish('failed', 500, `Unexpected activation outcome: ${String(outcome)}`);
  } catch (err) {
    console.error('[paystack-webhook] unexpected error', err);
    return await finish('failed', 500, err instanceof Error ? err.message : 'Unexpected error');
  }
}
