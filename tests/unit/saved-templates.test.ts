import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { TEMPLATE_LIMITS, parseTemplateForm, templateErrorCopy, toSavedTemplate, toTemplateValues } from '@/lib/saved-templates';
import { TEMPLATES } from '@/lib/templates';

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');
const sql = read('supabase/migrations/20261103_saved_templates.sql');
const base = { name: 'Logo job', summary: 'My usual logo terms', description: 'A logo.', deliverables: 'PNG and SVG', included_revisions: '2', additional_work_pricing: 'hourly' };

describe('template form', () => {
  it('accepts a valid template and keeps only filled fields', () => {
    const r = parseTemplateForm({ ...base, excluded_work: '  ' });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.name).toBe('Logo job');
      expect(r.value.fields).toEqual({ description: 'A logo.', deliverables: 'PNG and SVG', included_revisions: 2, additional_work_pricing: 'hourly' });
    }
  });
  it('needs a name of 2 to 80 characters', () => {
    expect(parseTemplateForm({ ...base, name: 'x' }).ok).toBe(false);
    expect(parseTemplateForm({ ...base, name: 'x'.repeat(81) }).ok).toBe(false);
  });
  it('needs at least one text field so there is something to reuse', () => {
    expect(parseTemplateForm({ name: 'Empty one', included_revisions: '2' }).ok).toBe(false);
  });
  it('rejects bad revisions, pricing and over-long text', () => {
    for (const v of ['-1', '51', '1.5', 'abc']) expect(parseTemplateForm({ ...base, included_revisions: v }).ok, v).toBe(false);
    expect(parseTemplateForm({ ...base, additional_work_pricing: 'free' }).ok).toBe(false);
    expect(parseTemplateForm({ ...base, description: 'x'.repeat(4001) }).ok).toBe(false);
    expect(parseTemplateForm({ ...base, summary: 'x'.repeat(201) }).ok).toBe(false);
  });
  it('lets revisions and pricing be left empty', () => {
    const r = parseTemplateForm({ name: 'Text only', description: 'Hello', included_revisions: '', additional_work_pricing: '' });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.fields).toEqual({ description: 'Hello' });
  });
});

describe('reading stored templates safely', () => {
  it('drops unknown keys, wrong types and out-of-range values', () => {
    const v = toTemplateValues({ description: 'ok', evil: '<script>', included_revisions: 99, additional_work_pricing: 'nope', deliverables: 5 });
    expect(v).toEqual({ description: 'ok' });
    expect(toTemplateValues(null)).toEqual({});
    expect(toTemplateValues([1])).toEqual({});
  });
  it('rejects rows without an id and name', () => {
    expect(toSavedTemplate({ name: 'x' })).toBeNull();
    expect(toSavedTemplate({ id: 'a', name: 'b', fields: { description: 'd' } })?.fields).toEqual({ description: 'd' });
  });
  it('every ready-made starter fits the same limits a saved template must fit', () => {
    for (const t of TEMPLATES) {
      const r = parseTemplateForm({ name: t.name, ...t.values });
      expect(r.ok, t.id).toBe(true);
    }
  });
});

describe('error copy', () => {
  it('explains the plan limit, a taken name and a missing migration', () => {
    expect(templateErrorCopy({ message: 'template_limit' })).toContain('limit');
    expect(templateErrorCopy({ message: 'template_name_taken' })).toContain('already have');
    expect(templateErrorCopy({ code: 'PGRST205' })).toContain('20261103_saved_templates.sql');
  });
  it('never shows database details', () => {
    expect(templateErrorCopy({ message: 'relation "secret" exploded' })).toBe('Something went wrong. Please try again.');
  });
});

describe('migration safety', () => {
  it('is additive: one table, RLS on, no destructive statements on existing tables', () => {
    expect(sql).toContain('alter table public.saved_templates enable row level security');
    expect(sql).not.toMatch(/drop table|alter table public\.(agreements|profiles|plans|subscriptions)|truncate/i);
    expect(sql.match(/create table/gi)?.length).toBe(1);
  });
  it('gives the browser read-only access to its own rows; writes only through the functions', () => {
    expect(sql).toContain('revoke all on public.saved_templates from anon, authenticated');
    expect(sql).toContain('grant select on public.saved_templates to authenticated');
    expect(sql).toContain('using (owner_id = auth.uid())');
    expect(sql).not.toMatch(/for (insert|update|delete)/i);
    expect(sql).toMatch(/grant execute on function public\.save_template\(text, text, jsonb\) to authenticated/);
    expect(sql).toMatch(/grant execute on function public\.delete_template\(uuid\) to authenticated/);
    expect(sql).toMatch(/revoke execute on function public\._template_fields_ok\(jsonb\) from public, anon, authenticated/);
  });
  it('enforces the plan limit from plans.saved_templates_limit and locks per user', () => {
    expect(sql).toContain('saved_templates_limit');
    expect(sql).toContain('public._effective_plan(uid)');
    expect(sql).toContain('pg_advisory_xact_lock');
    expect(sql).toContain("raise exception 'template_limit'");
  });
  it('uses the same text limits as the form', () => {
    expect(TEMPLATE_LIMITS.description).toBe(4000);
    expect(sql).toContain("char_length(f ->> 'description') > 4000");
    expect(sql).toContain("char_length(f ->> 'revision_definition') > 1000");
    expect(sql).toContain("char_length(f ->> 'excluded_work') > 2000");
    expect(sql).toContain("char_length(f ->> 'payment_terms_text') > 2000");
  });
});

describe('pages', () => {
  it('the new-agreement page still reads built-in starters and now saved templates', () => {
    const page = read('app/dashboard/agreements/new/page.tsx');
    expect(page).toContain('getTemplate(searchParams.template)');
    expect(page).toContain("from('saved_templates')");
    expect(page).toContain('createAgreementAction');
  });
  it('keeps every built-in starter on the templates page', () => {
    expect(read('app/dashboard/templates/page.tsx')).toContain('TEMPLATES.map');
  });
  it('does not mark the template feature live in the plan config (flip it only after you have tested it)', () => {
    expect(read('lib/plans.ts')).toMatch(/saved template/i);
  });
});
