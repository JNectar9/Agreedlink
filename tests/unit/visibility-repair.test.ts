import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');
const sql = read('supabase/migrations/20261107_file_visibility_repair.sql');
const route = read('app/a/[token]/files/[id]/route.ts');

describe('visibility repair migration', () => {
  it('only touches the visibility column and the two functions, and deletes no data', () => {
    expect(sql).not.toMatch(/delete from|truncate|drop table|update public\.agreement_attachments set (?!customer_visible)/i);
    expect(sql.match(/create table/gi)).toBeNull();
    expect(sql).not.toMatch(/manual_subscriptions|subscription_requests|subscription_config|paystack|bank_/i);
  });
  it('removes odd copies of the functions, then creates the right ones', () => {
    expect(sql).toContain("p.proname in ('set_attachment_visibility', 'customer_files')");
    expect(sql).toContain("execute 'drop function ' || r.sig");
    expect(sql.indexOf("execute 'drop function '")).toBeLessThan(sql.indexOf('create or replace function public.set_attachment_visibility'));
  });
  it('rolls back with a clear error if the value was not stored', () => {
    expect(sql).toContain('if stored is distinct from wanted then raise exception');
    expect(sql).toContain("'visibility_not_saved'");
  });
  it('customers only ever get ready AND visible files from a valid link', () => {
    expect(sql).toContain("aa.status = 'ready' and aa.customer_visible");
    expect(sql).toContain('l.revoked_at is not null or public._link_expired(l.expires_at)');
    expect(sql).toContain('grant execute on function public.customer_files(text) to service_role');
    expect(sql).not.toMatch(/grant execute on function public\.customer_files\(text\) to (anon|authenticated|public)/);
  });
  it('the owner can change visibility, nobody else can', () => {
    expect(sql).toContain('where id = p_id and owner_id = uid');
    expect(sql).toContain('grant execute on function public.set_attachment_visibility(uuid, boolean) to authenticated');
    expect(sql).toContain("notify pgrst, 'reload schema'");
  });
});

describe('customer download route', () => {
  it('serves a file only if the database function returned it', () => {
    expect(route).toContain("admin.rpc('customer_files'");
    expect(route).toContain('find((f) => f.id === params.id)');
    expect(route).not.toContain("from('agreement_attachments')");
  });
  it('every failure is the same plain 404', () => {
    expect(route.match(/return notFound\(\)/g)?.length).toBeGreaterThanOrEqual(3);
  });
});
