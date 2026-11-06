import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { VISIBILITY_NOTE, compareWithApproval, fileKind, visibilityBadge } from '@/lib/attachment-visibility';
import { toAttachment } from '@/lib/attachments';

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');
const sql = read('supabase/migrations/20261106_attachment_visibility.sql');

describe('visibility rules', () => {
  it('files are visible unless explicitly private', () => {
    expect(toAttachment({ id: '1', file_name: 'a.png' })?.customerVisible).toBe(true);
    expect(toAttachment({ id: '1', file_name: 'a.png', customer_visible: true })?.customerVisible).toBe(true);
    expect(toAttachment({ id: '1', file_name: 'a.png', customer_visible: false })?.customerVisible).toBe(false);
  });
  it('labels and message use the agreed wording', () => {
    expect(visibilityBadge(true).text).toBe('Visible to customer');
    expect(visibilityBadge(false).text).toContain('Private');
    expect(VISIBILITY_NOTE).toBe('Files are visible to your customer unless you mark them private. Private files are never shown to your customer.');
  });
  it('chooses the right preview kind', () => {
    expect(fileKind('image/png')).toBe('image');
    expect(fileKind('application/pdf')).toBe('pdf');
    expect(fileKind('text/csv')).toBe('other');
  });
});

describe('approval comparison', () => {
  const a = [{ id: '1', fileName: 'logo.png' }, { id: '2', fileName: 'brief.pdf' }];
  it('is the same when nothing changed', () => expect(compareWithApproval(a, a).same).toBe(true));
  it('reports added, removed (deleted or made private) and renamed files', () => {
    const now = [{ id: '1', fileName: 'logo-final.png' }, { id: '3', fileName: 'new.pdf' }];
    const r = compareWithApproval(now, a);
    expect(r.same).toBe(false);
    expect(r.added).toEqual(['new.pdf']);
    expect(r.removed).toEqual(['brief.pdf']);
    expect(r.renamed[0]).toContain('logo.png is now logo-final.png');
  });
});

describe('migration safety', () => {
  it('defaults to customer-visible and keeps old files visible', () => {
    expect(sql).toContain('customer_visible boolean not null default true');
  });
  it('never opens storage to anyone but the owner', () => {
    expect(sql).not.toMatch(/on storage\.objects/i);
    expect(sql).not.toMatch(/to anon/i);
  });
  it('defines customer-visible as a valid link AND ready AND visible, for the server only', () => {
    expect(sql).toContain("aa.status = 'ready' and aa.customer_visible");
    expect(sql).toContain('public._link_expired(l.expires_at)');
    expect(sql).toContain('aa.agreement_id = l.agreement_id');
    expect(sql).toContain('grant execute on function public.customer_files(text) to service_role');
    expect(sql).toMatch(/revoke execute on function public\.customer_files\(text\) from public, anon, authenticated/);
  });
  it('keeps approval history safe: no grants to write, no foreign key to the file, snapshot on approval', () => {
    expect(sql).not.toMatch(/grant (insert|update|delete)/i);
    expect(sql).toContain('attachment_id uuid not null,');
    expect(sql).not.toMatch(/attachment_id uuid not null references/);
    expect(sql).toContain('after insert on public.version_approvals');
    expect(sql).toContain("exception when others then");
  });
  it('does not touch plans, prices or billing', () => {
    expect(sql).not.toMatch(/public\.plans|subscriptions|attachment_max_bytes|attachment_total_bytes/i);
  });
});

describe('private files stay out of customer and PDF output', () => {
  it('the PDF route only reads customer-visible files', () => {
    expect(read('app/dashboard/agreements/[id]/pdf/route.ts')).toContain(".eq('customer_visible', true)");
  });
  it('the customer component never fetches and the share gate requires the confirmation text', () => {
    expect(read('components/CustomerFiles.tsx')).not.toContain('createClient');
    expect(read('components/ShareReviewGate.tsx')).toContain('I have reviewed the files my customer will be able to see.');
  });
  it('the uploader marks private files before uploading them', () => {
    const up = read('components/AttachmentUploader.tsx');
    expect(up).toContain('Keep this file private (only me)');
    expect(up.indexOf('setVisibilityAction(begin.id, false)')).toBeLessThan(up.indexOf('uploadToSignedUrl'));
  });
});

describe('customer pages', () => {
  const route = read('app/a/[token]/files/[id]/route.ts');
  const page = read('app/a/[token]/page.tsx');
  it('the file route checks the link and visibility in the database, and answers every failure with the same 404', () => {
    expect(route).toContain("rpc('customer_files'");
    expect(route).toContain('TOKEN_PATTERN.test(params.token)');
    expect(route).toContain('isUuid(params.id)');
    expect(route).toContain('.find((f) => f.id === params.id)');
    expect(route).toContain('createSignedUrl(file.storage_path, 60');
    expect(route).toContain('private, no-store');
  });
  it('the customer page shows files before the decision form and never selects from the table directly', () => {
    expect(page).toContain("rpc('customer_files'");
    expect(page).not.toContain("from('agreement_attachments')");
    expect(page.indexOf('<CustomerFiles')).toBeGreaterThan(-1);
    expect(page.indexOf('<CustomerFiles')).toBeLessThan(page.indexOf('<form action={decideAgreementAction'));
  });
  it('the agreement page wraps the share buttons in the review step', () => {
    const agreement = read('app/dashboard/agreements/[id]/page.tsx');
    expect(agreement).toMatch(/<ShareReview agreementId=\{a\.id\}>\s*<ShareButtons/);
  });
});
