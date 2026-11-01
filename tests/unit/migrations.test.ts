import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const sql = (name: string) => readFileSync(join(process.cwd(), 'supabase/migrations', name), 'utf8');
const identity = sql('0006_customer_identity_tables.sql');
const changes = sql('0007_change_calculator_and_decisions.sql');

describe('migration safety checks', () => {
  it('keeps customer records private to the owning business', () => {
    expect(identity).toContain('alter table public.customers enable row level security');
    expect(identity).toContain('revoke all on public.customers from anon, authenticated');
    expect(identity).toMatch(/create policy customers_select_owner[\s\S]*owner_id = auth\.uid\(\)/);
    expect(identity).not.toMatch(/on public\.customers[^;]*using \(true\)/);
  });

  it('limits customer-editable columns', () => {
    expect(identity).toContain('grant update (name, email, phone, notes) on public.customers to authenticated');
  });

  it('lets only a confirmed email claim a customer record', () => {
    expect(identity).toContain('email_confirmed_at');
    expect(identity).toContain("raise exception 'email_not_verified'");
  });

  it('does not delete or rewrite existing data', () => {
    for (const text of [identity, changes]) {
      expect(text).not.toMatch(/\bdelete\s+from\b/i);
      expect(text).not.toMatch(/\bdrop\s+table\b/i);
      expect(text).not.toMatch(/\btruncate\b/i);
    }
  });

  it('keeps the decision functions callable by the server only', () => {
    expect(changes).toContain('to service_role');
    expect(changes).not.toMatch(/customer_decide_(agreement|change)[^;]*to (anon|authenticated)/);
  });

  it('calculates the revised total in the database and ignores duplicates', () => {
    expect(changes).toContain('new_amount := a.current_amount_minor + p_delta');
    expect(changes).toContain('idempotency_key');
    expect(changes).toContain("raise exception 'invalid_amount'");
  });

  it('records the identity method with every approval', () => {
    expect(changes).toContain("case when acct then 'account' else 'secure_link' end");
  });
});
