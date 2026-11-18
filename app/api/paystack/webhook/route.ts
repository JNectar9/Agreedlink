import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { chargeEventKey, isPlausibleReference, isValidPaystackSignature, verifyPaystackTransaction } from '@/lib/paystack';
import { REVERSAL_EVENTS, reversalReference } from '@/lib/paystack-charges';
import { recordAffiliateCommission } from '@/lib/affiliate-commission';

// Paystack calls this URL server to server. It carries no login cookie, so it is deliberately outside /dashboard
// (the middleware only guards /dashboard, /portal and /affiliate). Its protection is the HMAC SHA-512 signature below.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const reply = (body: Record<string, unknown>, status = 200) => NextResponse.json(body, { status });

type Db = ReturnType<typeof createAdminClient>;

/** One row per event key. 'duplicate' = this delivery was already processed. A failed or interrupted earlier attempt is retried. */
async function claimEvent(db: Db, eventKey: string, eventType: string, reference: string, payload: unknown): Promise<'new' | 'duplicate' | 'error'> {
  const { error } = await db.from('paystack_webhook_events').insert({ event_key: eventKey, event_type: eventType, reference, status: 'processing', payload });
  if (!error) return 'new';
  if (error.code !== '23505') {
    console.error('[paystack-webhook] could not record event', error.message);
    return 'error';
  }
  const { data: existing } = await db.from('paystack_webhook_events').select('status').eq('event_key', eventKey).maybeSingle();
  return existing?.status === 'processed' ? 'duplicate' : 'new';
}

async function finishEvent(db: Db, eventKey: string, status: string, httpStatus: number, error: string | null = null) {
  await db
    .from('paystack_webhook_events')
    .update({ status, error: error ? error.slice(0, 500) : null, processed_at: new Date().toISOString() })
    .eq('event_key', eventKey);
  return reply({ received: true, status }, httpStatus);
}

/** A processed refund or an opened dispute cancels the affiliate commission for that payment. Safe to repeat. */
async function handleReversal(db: Db, event: { data?: unknown }, eventType: string, raw: Buffer) {
  const txRef = reversalReference(event);
  if (!txRef) {
    await db.from('paystack_webhook_events').insert({
      event_key: chargeEventKey(eventType, createHash('sha256').update(raw).digest('hex')),
      event_type: eventType,
      reference: null,
      status: 'ignored',
      error: 'no transaction reference in this event',
      payload: event,
      processed_at: new Date().toISOString()
    });
    return reply({ received: true, handled: false });
  }
  const eventKey = chargeEventKey(eventType, txRef);
  const claim = await claimEvent(db, eventKey, eventType, txRef, event);
  if (claim === 'error') return reply({ error: 'storage_error' }, 500);
  if (claim === 'duplicate') return reply({ received: true, duplicate: true });

  const { error } = await db.rpc('affiliate_handle_reversal', { p_reference: txRef, p_reason: REVERSAL_EVENTS[eventType] });
  if (error) {
    // Function missing (migration not run yet): nothing a retry can fix. Anything else may be temporary.
    if (error.code === '42883' || error.code === 'PGRST202') return await finishEvent(db, eventKey, 'failed', 200, 'affiliate: run migration 20261109_affiliate_net_commission.sql');
    return await finishEvent(db, eventKey, 'failed', 500, error.message);
  }
  return await finishEvent(db, eventKey, 'processed', 200);
}

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

  let db: Db;
  try {
    db = createAdminClient();
  } catch (err) {
    console.error('[paystack-webhook] database client unavailable', err);
    return reply({ error: 'not_configured' }, 500);
  }

  // 2. Refunds and disputes cancel the affiliate commission for the original payment.
  if (Object.prototype.hasOwnProperty.call(REVERSAL_EVENTS, eventType)) {
    return await handleReversal(db, event, eventType, raw);
  }

  // 3. Only charge.success changes anything else. Other events are logged and acknowledged so Paystack stops retrying.
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

  // 4. Duplicate protection: one row per event key. A delivery that was already processed is acknowledged and stops here.
  const eventKey = chargeEventKey(eventType, reference);
  const claim = await claimEvent(db, eventKey, eventType, reference, event);
  if (claim === 'error') return reply({ error: 'storage_error' }, 500); // Paystack retries
  if (claim === 'duplicate') return reply({ received: true, duplicate: true });
  // Otherwise an earlier attempt failed or was interrupted: continue. paystack_activate is idempotent, so this cannot double-apply.

  const finish = (status: string, httpStatus: number, error: string | null = null) => finishEvent(db, eventKey, status, httpStatus, error);

  try {
    // 5. Ask Paystack whether this reference was really paid. The webhook body alone is never proof of payment.
    const verified = await verifyPaystackTransaction(reference, secret);
    if (!verified.ok) {
      return verified.transient ? await finish('failed', 500, verified.message) : await finish('not_successful', 200, verified.message);
    }
    const d = verified.data;
    if (d.status !== 'success' || d.reference !== reference) {
      return await finish('not_successful', 200, `Paystack status: ${d.status}`);
    }

    // 6. Atomic, idempotent activation. The database compares the paid amount and currency with the amount stored
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

    if (outcome === 'activated' || outcome === 'already_processed') {
      // 7. Affiliate commission. Runs for 'already_processed' too, because the payment page may have activated the plan first.
      //    The database keeps one commission per payment reference, so repeating this never pays twice.
      const commission = await recordAffiliateCommission(db, d);
      if (commission.retry) return await finish('failed', 500, commission.note);
      if (commission.note) return await finish('failed', 200, commission.note); // plan is active; a person must look at the commission
      return await finish('processed', 200);
    }
    // These need a person to look at them. Retrying cannot fix them, so acknowledge.
    if (outcome === 'unknown_reference' || outcome === 'amount_mismatch') return await finish(outcome, 200, `Activation outcome: ${outcome}`);
    return await finish('failed', 500, `Unexpected activation outcome: ${String(outcome)}`);
  } catch (err) {
    console.error('[paystack-webhook] unexpected error', err);
    return await finish('failed', 500, err instanceof Error ? err.message : 'Unexpected error');
  }
}
