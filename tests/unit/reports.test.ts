import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { barPercent, formatHours, parseReport, parseReportRange, prettyEvent, reportErrorCopy, signedMoney } from '@/lib/reports';

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');
const sql = read('supabase/migrations/20261104_advanced_reporting.sql');

describe('report parsing', () => {
  it('rejects anything that is not an object', () => {
    for (const v of [null, undefined, 'x', 5, []]) expect(parseReport(v), String(v)).toBeNull();
  });
  it('fills safe zeros and empty lists when fields are missing', () => {
    const r = parseReport({ agreements_total: 'abc', monthly: 'nope', by_status: [1] });
    expect(r?.agreementsTotal).toBe(0);
    expect(r?.monthly).toEqual([]);
    expect(r?.byStatus).toEqual({});
    expect(r?.avgApprovalHours).toBeNull();
    expect(r?.activity).toEqual([]);
  });
  it('reads real values and keeps currencies separate', () => {
    const r = parseReport({
      agreements_total: 12, by_status: { approved: 5, draft: 2 }, avg_approval_hours: 30.5, overdue: 1,
      value_by_currency: [{ currency: 'NGN', agreed_minor: 500000, pipeline_minor: 100 }, { currency: 'USD', agreed_minor: 900, pipeline_minor: 0 }],
      change_value_by_currency: [{ currency: 'USD', delta_minor: -300 }],
      monthly: [{ month: '2026-11-01', created: 3, approved: 2 }],
      upcoming: [{ id: 'a', project_name: 'Logo', client_name: 'Ada', delivery_date: '2026-11-10' }],
      recent_activity: [{ agreement_id: 'a', project_name: 'Logo', event_type: 'change_requested', actor_name: null, message: null, created_at: '2026-11-04T10:00:00Z' }]
    });
    expect(r?.agreementsTotal).toBe(12);
    expect(r?.byStatus.approved).toBe(5);
    expect(r?.avgApprovalHours).toBe(30.5);
    expect(r?.value.length).toBe(2);
    expect(r?.value[0].currency).toBe('NGN');
    expect(r?.changeValue[0].deltaMinor).toBe(-300);
    expect(r?.upcoming[0].projectName).toBe('Logo');
    expect(r?.activity[0].actorName).toBe('');
  });
});

describe('display helpers', () => {
  it('only allows 6 or 12 months', () => {
    expect(parseReportRange('12')).toBe(12);
    for (const v of ['6', '24', 'x', undefined]) expect(parseReportRange(v), String(v)).toBe(6);
  });
  it('bar widths: zero stays zero, small values stay visible, the largest is 100', () => {
    expect(barPercent(0, 10)).toBe(0);
    expect(barPercent(1, 1000)).toBe(4);
    expect(barPercent(10, 10)).toBe(100);
    expect(barPercent(5, 0)).toBe(0);
  });
  it('formats hours in plain words', () => {
    expect(formatHours(null)).toBe('Not enough data yet');
    expect(formatHours(0.4)).toBe('Under 1 hour');
    expect(formatHours(30)).toBe('30 hours');
    expect(formatHours(72)).toBe('3 days');
  });
  it('prettifies event names and signs price changes', () => {
    expect(prettyEvent('change_requested')).toBe('Change requested');
    expect(prettyEvent('')).toBe('Activity');
    expect(signedMoney(0, 'USD')).toBe('$0.00');
    expect(signedMoney(-300, 'USD').startsWith('-')).toBe(true);
    expect(signedMoney(300, 'USD').startsWith('+')).toBe(true);
  });
  it('explains Premium-only and a missing migration without leaking details', () => {
    expect(reportErrorCopy({ message: 'premium_required' })).toContain('Premium');
    expect(reportErrorCopy({ code: 'PGRST202' })).toContain('20261104_advanced_reporting.sql');
    expect(reportErrorCopy({ message: 'relation secret blew up' })).toBe('Something went wrong. Please try again.');
  });
});

describe('migration safety', () => {
  it('is read-only: one function, no tables, columns or policies', () => {
    expect(sql.match(/create or replace function/g)?.length).toBe(1);
    expect(sql).not.toMatch(/create table|alter table|create policy|drop |delete from|insert into|update public|truncate/i);
  });
  it('checks Premium and the signed-in user inside the database', () => {
    expect(sql).toContain("if public._effective_plan(uid) <> 'premium' then raise exception 'premium_required'");
    expect(sql).toContain("if uid is null then raise exception 'not_authenticated'");
  });
  it('only ever reads the caller\'s own agreements', () => {
    expect(sql).not.toContain('auth.users');
    expect((sql.match(/owner_id = uid/g) ?? []).length).toBeGreaterThan(8);
  });
  it('grants the function to signed-in users only', () => {
    expect(sql).toMatch(/revoke execute on function public\.report_overview\(integer\) from public, anon, authenticated/);
    expect(sql).toMatch(/grant execute on function public\.report_overview\(integer\) to authenticated/);
  });
  it('the page asks the database for the plan and never shows data to non-Premium', () => {
    const page = read('app/dashboard/reports/page.tsx');
    expect(page).toContain("rpc('my_subscription')");
    expect(page).toContain("rpc('report_overview'");
    expect(page).toContain('if (!premium)');
  });
});
