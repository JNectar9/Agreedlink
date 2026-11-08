import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');
const sql = read('supabase/migrations/20261107_bank_transfer_references.sql');
const billing = read('app/dashboard/billing/page.tsx');
const admin = read('app/dashboard/admin/subscriptions/page.tsx');

describe('bank transfer payment references (database)', () => {
  it('uses the AGL-YYYYMMDD-XXXXX format and enforces it', () => {
    expect(sql).toContain("'AGL-' || to_char(now() at time zone 'UTC', 'YYYYMMDD') || '-'");
    expect(sql).toContain("'^AGL-[0-9]{8}-[A-Z0-9]{5}$'");
  });
  it('never reuses a reference: primary key, unique index on requests, no deletes, claimed once', () => {
    expect(sql).toContain('reference text primary key');
    expect(sql).toContain('subscription_requests_transfer_reference_once');
    expect(sql).not.toMatch(/delete from public\.bank_transfer_references/i);
    expect(sql).not.toMatch(/grant (insert|update|delete)/i);
    expect(sql).toContain('used_at is null');
    expect(sql).toContain("raise exception 'history_protected'");
  });
  it('leaves Paystack, existing payments and admin approval alone', () => {
    expect(sql).not.toMatch(/paystack/i);
    expect(sql).not.toMatch(/update public\.manual_subscriptions/i);
    expect(sql).not.toMatch(/admin_approve_request|admin_list_requests/);
    expect(sql).not.toMatch(/update public\.subscription_requests/i);
  });
  it('only an admin can look up references for the admin page', () => {
    expect(sql).toContain('perform public._require_admin();');
  });
});

describe('bank transfer payment references (pages)', () => {
  it('billing shows the reference with a copy button and asks for the transaction ID separately', () => {
    expect(billing).toContain("rpc('get_my_transfer_reference')");
    expect(billing).toContain('<CopyReference value={transferRef} />');
    expect(billing).toContain('Bank transfer transaction ID');
    expect(billing).toContain('Your payment reference');
  });
  it('the admin dashboard shows the generated reference', () => {
    expect(admin).toContain("rpc('admin_request_references'");
    expect(admin).toContain('Payment reference (AgreedLink)');
  });
});
