// Integration tests run against a REAL Supabase project (use a separate test project).
// They are skipped unless TEST_SUPABASE_URL, TEST_SUPABASE_ANON_KEY and TEST_SUPABASE_SERVICE_ROLE_KEY are set.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { generateToken, hashToken } from '@/lib/tokens';

const url = process.env.TEST_SUPABASE_URL;
const anon = process.env.TEST_SUPABASE_ANON_KEY;
const serviceKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
const enabled = Boolean(url && anon && serviceKey);

describe.skipIf(!enabled)('authorization, history, and conflicting customer decisions', () => {
  const service = createClient(url!, serviceKey!, { auth: { persistSession: false } });
  const password = `Pw-${randomUUID()}`;
  const createdUsers: string[] = [];

  async function makeUser(label: string) {
    const email = `${label}-${randomUUID()}@example.test`;
    const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) throw error;
    createdUsers.push(data.user.id);
    const client = createClient(url!, anon!, { auth: { persistSession: false } });
    const signIn = await client.auth.signInWithPassword({ email, password });
    if (signIn.error) throw signIn.error;
    return { id: data.user.id, client };
  }

  const terms = (amount = 100000) => ({
    project_name: 'Test project', client_name: 'Test client', client_email: null, description: 'desc', deliverables: 'files',
    start_date: null, delivery_date: '2026-12-31', currency: 'USD', amount_minor: amount, included_revisions: 2,
    revision_definition: '', excluded_work: '', additional_work_pricing: 'quote_first', additional_work_price_minor: null,
    payment_terms_text: ''
  });

  async function newAgreement(client: SupabaseClient) {
    const token = generateToken();
    const { data, error } = await client.rpc('create_agreement', {
      p_terms: terms(), p_token_hash: hashToken(token), p_token_ciphertext: 'test', p_expires_at: null, p_idempotency_key: randomUUID()
    });
    expect(error).toBeNull();
    return { id: data as string, hash: hashToken(token) };
  }

  const decide = (hash: string, decision: string, version = 1) =>
    service.rpc('customer_decide_agreement', { p_token_hash: hash, p_decision: decision, p_name: 'Tester', p_email: '', p_message: 'because', p_version: version });
  const decideChange = (hash: string, change: string, decision: string) =>
    service.rpc('customer_decide_change', { p_token_hash: hash, p_change: change, p_decision: decision, p_name: 'Tester', p_email: '', p_message: 'because' });

  afterAll(async () => {
    for (const id of createdUsers) {
      try { await service.auth.admin.deleteUser(id); } catch { /* best effort cleanup */ }
    }
  });

  it('keeps one user from reading or changing another user\'s agreement', async () => {
    const a = await makeUser('owner');
    const b = await makeUser('intruder');
    const { id } = await newAgreement(a.client);

    const read = await b.client.from('agreements').select('id').eq('id', id);
    expect(read.data ?? []).toHaveLength(0);
    expect((await b.client.rpc('regenerate_link', { p_agreement: id, p_token_hash: 'x', p_token_ciphertext: 'y', p_expires_at: null })).error).not.toBeNull();
    expect((await b.client.rpc('mark_completed', { p_agreement: id })).error).not.toBeNull();
    expect((await b.client.from('agreements').update({ project_name: 'hacked' }).eq('id', id)).error).not.toBeNull();
    const own = await a.client.from('agreements').select('id').eq('id', id);
    expect(own.data).toHaveLength(1);
  });

  it('does not let browser keys call the customer functions', async () => {
    const a = await makeUser('owner');
    const anonClient = createClient(url!, anon!, { auth: { persistSession: false } });
    expect((await a.client.rpc('customer_get', { p_token_hash: 'x' })).error).not.toBeNull();
    expect((await anonClient.rpc('customer_get', { p_token_hash: 'x' })).error).not.toBeNull();
  });

  it('rejects a second approval of the same agreement', async () => {
    const a = await makeUser('owner');
    const { hash } = await newAgreement(a.client);
    expect((await decide(hash, 'approve')).data).toMatchObject({ ok: true });
    expect((await decide(hash, 'approve')).data).toMatchObject({ ok: false, error: 'not_pending' });
  });

  it('accepts exactly one of simultaneous approve and decline requests', async () => {
    const a = await makeUser('owner');
    const { id, hash } = await newAgreement(a.client);
    const results = await Promise.all([decide(hash, 'approve'), decide(hash, 'decline')]);
    const wins = results.filter((r) => (r.data as { ok: boolean }).ok);
    expect(wins).toHaveLength(1);
    const { data } = await service.from('agreements').select('status').eq('id', id).single();
    const winner = (wins[0].data as { decision: string }).decision;
    expect(data?.status).toBe(winner === 'approve' ? 'approved' : 'declined');
  });

  it('rejects a decision made against an out-of-date version', async () => {
    const a = await makeUser('owner');
    const { hash } = await newAgreement(a.client);
    expect((await decide(hash, 'approve', 99)).data).toMatchObject({ ok: false, error: 'version_mismatch' });
  });

  it('applies a change only once, and only when approved', async () => {
    const a = await makeUser('owner');
    const { id, hash } = await newAgreement(a.client);
    await decide(hash, 'approve');
    const proposed = { ...terms(150000), delivery_date: '2027-01-15' };
    const proposal = await a.client.rpc('propose_change', { p_agreement: id, p_description: 'More work', p_reason: 'Scope grew', p_notes: '', p_proposed: proposed });
    expect(proposal.error).toBeNull();
    const second = await a.client.rpc('propose_change', { p_agreement: id, p_description: 'Again', p_reason: 'x', p_notes: '', p_proposed: proposed });
    expect(second.error?.message).toContain('change_already_pending');

    const changeId = proposal.data as string;
    const results = await Promise.all([decideChange(hash, changeId, 'approve'), decideChange(hash, changeId, 'reject')]);
    const wins = results.filter((r) => (r.data as { ok: boolean }).ok);
    expect(wins).toHaveLength(1);

    const { data: agreement } = await service.from('agreements').select('current_version, current_amount_minor').eq('id', id).single();
    const approved = (wins[0].data as { decision: string }).decision === 'approve';
    expect(agreement?.current_version).toBe(approved ? 2 : 1);
    expect(agreement?.current_amount_minor).toBe(approved ? 150000 : 100000);
    const { data: versions } = await service.from('agreement_versions').select('version_number').eq('agreement_id', id);
    expect(versions).toHaveLength(approved ? 2 : 1);
  });

  it('keeps the history append-only', async () => {
    const a = await makeUser('owner');
    const { id } = await newAgreement(a.client);
    const update = await service.from('agreement_events').update({ message: 'rewritten' }).eq('agreement_id', id);
    expect(update.error?.message).toContain('append_only');
    const remove = await service.from('agreement_events').delete().eq('agreement_id', id);
    expect(remove.error?.message).toContain('append_only');
  });

  it('stops a revoked link from working', async () => {
    const a = await makeUser('owner');
    const { id, hash } = await newAgreement(a.client);
    expect((await a.client.rpc('revoke_link', { p_agreement: id })).error).toBeNull();
    const view = await service.rpc('customer_get', { p_token_hash: hash });
    expect(view.data).toMatchObject({ link_state: 'revoked' });
    expect((await decide(hash, 'approve')).data).toMatchObject({ ok: false });
  });
});
