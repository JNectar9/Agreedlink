import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { chartGeometry, monthLabel, niceTop, parseDashboard, parseRange } from '@/lib/admin-dashboard';

const sql = readFileSync(join(process.cwd(), 'supabase/migrations/20261102_admin_subscription_dashboard.sql'), 'utf8');

describe('dashboard result parsing', () => {
  it('rejects anything that is not an object', () => {
    for (const v of [null, undefined, 'x', 5, []]) expect(parseDashboard(v), String(v)).toBeNull();
  });
  it('fills safe zeros when fields are missing or invalid', () => {
    const s = parseDashboard({ users_total: 'abc', revenue_lifetime_minor: -5, trend: 'nope' });
    expect(s?.usersTotal).toBe(0);
    expect(s?.revenueLifetimeMinor).toBe(0);
    expect(s?.trend).toEqual([]);
    expect(s?.recentPayments).toEqual([]);
  });
  it('reads real values', () => {
    const s = parseDashboard({
      users_total: 1248, subscribers_pro: 180, subscribers_premium: 162, revenue_month_minor: 72400, requests_pending: 12, expiring_7d: 8,
      trend: [{ month: '2026-10-01', revenue_minor: 88000 }],
      recent_payments: [{ id: 'a', email: 'x@y.com', plan: 'premium', amount_minor: 2400, months: 1, status: 'cancelled' }]
    });
    expect(s?.usersTotal).toBe(1248);
    expect(s?.subscribersPremium).toBe(162);
    expect(s?.trend[0]).toEqual({ month: '2026-10-01', revenueMinor: 88000 });
    expect(s?.recentPayments[0].plan).toBe('premium');
    expect(s?.recentPayments[0].status).toBe('cancelled');
  });
});

describe('range and labels', () => {
  it('only allows 6 or 12 months', () => {
    expect(parseRange('12')).toBe(12);
    for (const v of ['6', '24', 'x', undefined, '']) expect(parseRange(v), String(v)).toBe(6);
  });
  it('names months without timezone drift', () => {
    expect(monthLabel('2026-11-01')).toBe('Nov');
    expect(monthLabel('2026-01-01')).toBe('Jan');
    expect(monthLabel('garbage')).toBe('');
  });
});

describe('chart scale and geometry', () => {
  it('uses a tidy top split into four equal steps', () => {
    expect(niceTop(0)).toEqual({ top: 10000, step: 2500 });
    expect(niceTop(72400)).toEqual({ top: 80000, step: 20000 });
    expect(niceTop(88000)).toEqual({ top: 100000, step: 25000 });
    expect(niceTop(88000).top).toBeGreaterThanOrEqual(88000);
    expect(niceTop(500000).top).toBeGreaterThanOrEqual(500000);
  });
  it('keeps every point inside the drawing box', () => {
    const trend = [0, 25000, 61000, 76000, 88000, 72400].map((r, i) => ({ month: `2026-0${i + 6 > 9 ? 9 : i + 6}-01`, revenueMinor: r }));
    const pad = { left: 44, right: 14, top: 22, bottom: 26 };
    const g = chartGeometry(trend, 360, 220, pad);
    expect(g.points.length).toBe(6);
    for (const p of g.points) {
      expect(p.x >= pad.left && p.x <= 360 - pad.right).toBe(true);
      expect(p.y >= pad.top && p.y <= 220 - pad.bottom).toBe(true);
    }
    expect(g.ticks.length).toBe(5);
    expect(g.line.startsWith('M')).toBe(true);
    expect(g.area.endsWith('Z')).toBe(true);
  });
  it('handles no data and a single month', () => {
    expect(chartGeometry([], 360, 220, { left: 44, right: 14, top: 22, bottom: 26 }).line).toBe('');
    expect(chartGeometry([{ month: '2026-11-01', revenueMinor: 900 }], 360, 220, { left: 44, right: 14, top: 22, bottom: 26 }).points.length).toBe(1);
  });
});

describe('migration safety', () => {
  it('is admin-only, read-only and adds no tables', () => {
    expect(sql).toContain('public._require_admin()');
    expect(sql).toContain('security definer set search_path = public, pg_temp');
    expect(sql).toMatch(/revoke execute on function public\.admin_subscription_dashboard\(integer\) from public, anon, authenticated/);
    expect(sql).toMatch(/grant execute on function public\.admin_subscription_dashboard\(integer\) to authenticated/);
    expect(sql).not.toMatch(/create table|alter table|drop |delete from|insert into|update public/i);
  });
  it('never counts complimentary grants as revenue', () => {
    expect(sql).toContain("kind = 'payment'");
  });
});
