import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ALLOWED_TYPES, attachmentErrorCopy, checkFileChoice, cleanFileName, formatBytes, parseLimits, toAttachment, typeLabel, type AttachmentLimits } from '@/lib/attachments';

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');
const sql = read('supabase/migrations/20261105_agreement_attachments.sql');
const MB = 1024 * 1024;
const pro: AttachmentLimits = { plan: 'pro', maxFileBytes: 10 * MB, totalBytes: 100 * MB, usedBytes: 0 };
const pdf = { name: 'brief.pdf', type: 'application/pdf', size: 2 * MB };

describe('choosing a file', () => {
  it('accepts a normal file within the limits', () => {
    expect(checkFileChoice(pdf, pro)).toBeNull();
  });
  it('blocks Free accounts (no attachment allowance)', () => {
    expect(checkFileChoice(pdf, { ...pro, plan: 'free', maxFileBytes: 0, totalBytes: 0 })).toContain('Pro and Premium');
  });
  it('blocks files over the per-file limit with the real numbers', () => {
    const msg = checkFileChoice({ ...pdf, size: 11 * MB }, pro);
    expect(msg).toContain('11 MB');
    expect(msg).toContain('10 MB');
    expect(checkFileChoice({ ...pdf, size: 50 * MB }, { ...pro, maxFileBytes: 50 * MB })).toBeNull();
  });
  it('blocks files that do not fit in the remaining storage', () => {
    expect(checkFileChoice({ ...pdf, size: 5 * MB }, { ...pro, usedBytes: 98 * MB })).toContain('Not enough storage');
  });
  it('blocks dangerous or unknown types and empty files', () => {
    for (const type of ['', 'image/svg+xml', 'text/html', 'application/x-msdownload', 'application/zip', 'application/javascript']) {
      expect(checkFileChoice({ name: 'x.bin', type, size: 100 }, pro), type).toContain('not allowed');
    }
    expect(checkFileChoice({ ...pdf, size: 0 }, pro)).toContain('empty');
  });
  it('only allows the documented file types', () => {
    expect(Object.keys(ALLOWED_TYPES).length).toBe(9);
    expect(typeLabel('application/pdf')).toBe('PDF');
    expect(typeLabel('nope')).toBe('File');
  });
});

describe('names and sizes', () => {
  it('removes slashes and control characters and limits the length', () => {
    expect(cleanFileName('../../etc/passwd')).toBe('.._.._etc_passwd');
    expect(cleanFileName('a\\b\u0000c')).toBe('a_b_c');
    expect(cleanFileName('x'.repeat(300)).length).toBe(150);
    expect(cleanFileName('   ')).toBe('');
  });
  it('formats sizes in plain units', () => {
    expect(formatBytes(0)).toBe('0 KB');
    expect(formatBytes(500)).toBe('1 KB');
    expect(formatBytes(1536 * 1024)).toBe('1.5 MB');
    expect(formatBytes(50 * MB)).toBe('50 MB');
    expect(formatBytes(250 * MB)).toBe('250 MB');
  });
  it('reads limits and rows defensively', () => {
    expect(parseLimits(null)).toBeNull();
    expect(parseLimits({ plan: 'pro', max_file_bytes: 'x', total_bytes: -5, used_bytes: 3 })).toEqual({ plan: 'pro', maxFileBytes: 0, totalBytes: 0, usedBytes: 3 });
    expect(toAttachment({ file_name: 'a' })).toBeNull();
    expect(toAttachment({ id: '1', file_name: 'a.pdf', size_bytes: 5 })?.sizeBytes).toBe(5);
  });
  it('explains errors in plain words and hides database details', () => {
    expect(attachmentErrorCopy({ message: 'attachment_quota_exceeded' })).toContain('storage');
    expect(attachmentErrorCopy({ message: 'attachments_not_in_plan' })).toContain('Pro and Premium');
    expect(attachmentErrorCopy({ code: 'PGRST202' })).toContain('20261105_agreement_attachments.sql');
    expect(attachmentErrorCopy({ message: 'secret_table exploded' })).toBe('Something went wrong. Please try again.');
  });
});

describe('migration safety', () => {
  it('sets the agreed limits: Free none, Pro 10 MB / 100 MB, Premium 50 MB / 250 MB', () => {
    expect(sql).toContain("attachment_max_bytes = 0, attachment_total_bytes = 0 where id = 'free'");
    expect(sql).toContain("attachment_max_bytes = 10485760, attachment_total_bytes = 104857600 where id = 'pro'");
    expect(sql).toContain("attachment_max_bytes = 52428800, attachment_total_bytes = 262144000 where id = 'premium'");
    expect(10485760).toBe(10 * MB);
    expect(52428800).toBe(50 * MB);
    expect(104857600).toBe(100 * MB);
    expect(262144000).toBe(250 * MB);
  });
  it('uses a private bucket capped at 50 MB with a fixed list of types', () => {
    expect(sql).toContain("values ('attachments', 'attachments', false, 52428800");
    expect(sql).toContain('set public = false');
    expect(sql).not.toContain('image/svg');
    expect(sql).not.toContain('text/html');
  });
  it('lets the browser read only its own rows and write nothing directly', () => {
    expect(sql).toContain('revoke all on public.agreement_attachments from anon, authenticated');
    expect(sql).toContain('grant select on public.agreement_attachments to authenticated');
    expect(sql).not.toMatch(/on public\.agreement_attachments for (insert|update|delete)/i);
    expect(sql).toContain('using (owner_id = auth.uid())');
  });
  it('allows uploads only to a pending row of the same user, and no overwrite', () => {
    expect(sql).toContain("aa.storage_path = name and aa.owner_id = auth.uid() and aa.status = 'pending'");
    expect(sql).toContain('(storage.foldername(name))[1] = auth.uid()::text');
    expect(sql).not.toMatch(/create policy \w+ on storage\.objects for update/i);
  });
  it('checks the plan, quota and file count in the database and re-checks the real stored size', () => {
    expect(sql).toContain("raise exception 'attachments_not_in_plan'");
    expect(sql).toContain("raise exception 'attachment_quota_exceeded'");
    expect(sql).toContain("raise exception 'attachment_limit_per_agreement'");
    expect(sql).toContain("raise exception 'attachment_too_large'");
    expect(sql).toContain("o.metadata ->> 'size'");
    expect(sql).toContain("raise exception 'attachment_size_mismatch'");
    expect(sql).toContain('pg_advisory_xact_lock');
  });
  it('grants every function to signed-in users only and is otherwise additive', () => {
    for (const fn of ['my_attachment_limits()', 'begin_attachment(uuid, text, text, bigint)', 'finish_attachment(uuid)', 'delete_attachment(uuid)']) {
      expect(sql).toContain(`grant execute on function public.${fn} to authenticated`);
      expect(sql).toContain(`revoke execute on function public.${fn} from public, anon, authenticated`);
    }
    expect(sql).not.toMatch(/drop table|truncate|alter table public\.(agreements|profiles|subscriptions)/i);
    expect(sql.match(/create table/gi)?.length).toBe(1);
  });
});

describe('app code', () => {
  const actions = read('app/dashboard/attachments/actions.ts');
  const download = read('app/dashboard/attachments/[id]/download/route.ts');
  it('never uses the admin client, so row-level security always applies', () => {
    for (const code of [actions, download, read('components/AttachmentUploader.tsx')]) expect(code).not.toContain('createAdminClient');
  });
  it('uploads from the browser with a one-time link, not through the server', () => {
    expect(actions).toContain('createSignedUploadUrl');
    expect(read('components/AttachmentUploader.tsx')).toContain('uploadToSignedUrl');
  });
  it('downloads use a one-minute private link and the owner-only record', () => {
    expect(download).toContain('createSignedUrl(file.storage_path, 60');
    expect(download).toContain("file.status !== 'ready'");
  });
  it('the agreement tools card links to both PDF and attachments for paid plans', () => {
    const tools = read('components/AgreementTools.tsx');
    expect(tools).toContain('/pdf');
    expect(tools).toContain('/attachments');
    expect(tools).toContain("plan === 'pro' || plan === 'premium'");
  });
});
