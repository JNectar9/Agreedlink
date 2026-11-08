import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { currentPlanLine, isPlanUpdate, sortNewestFirst, tagPlanUpdates } from '@/lib/plan-status';

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');
const notes = [
  { id: 'a', type: 'subscription', title: 'Subscription approved', created_at: '2026-11-05T11:43:00Z' },
  { id: 'b', type: 'subscription', title: 'Subscription request not approved', created_at: '2026-11-05T11:48:00Z' },
  { id: 'c', type: 'subscription', title: 'Subscription cancelled', created_at: '2026-11-05T00:53:00Z' },
  { id: 'd', type: 'payment', title: 'Payment received', created_at: '2026-11-05T17:46:00Z' },
  { id: 'e', type: 'approval', title: 'Agreement approved', created_at: '2026-11-04T09:00:00Z' }
];

describe('plan updates versus the current plan', () => {
  it('recognises subscription and payment notifications only', () => {
    expect(notes.filter(isPlanUpdate).map((n) => n.id).sort()).toEqual(['a', 'b', 'c', 'd']);
    expect(isPlanUpdate({ id: 'x', type: 'other', title: 'Payment received', created_at: '2026-01-01T00:00:00Z' })).toBe(true);
    expect(isPlanUpdate(notes[4])).toBe(false);
  });
  it('sorts newest first', () => {
    expect(sortNewestFirst(notes).map((n) => n.id)).toEqual(['d', 'b', 'a', 'c', 'e']);
  });
  it('marks only the newest plan update as latest and the rest as history', () => {
    const tags = tagPlanUpdates(notes);
    expect(tags.get('d')).toBe('latest');
    for (const id of ['a', 'b', 'c']) expect(tags.get(id)).toBe('history');
    expect(tags.has('e')).toBe(false);
  });
  it('never deletes anything: every note is still listed', () => {
    expect(sortNewestFirst(notes).length).toBe(notes.length);
  });
});

describe('current plan line', () => {
  it('shows plan and end date for a paid plan', () => {
    expect(currentPlanLine({ effective_plan: 'pro', state: 'active', current: { expires_at: '2026-12-05T12:00:00Z' } }, 'Africa/Lagos')).toBe('Current plan: Pro - Active until Dec 5, 2026');
    expect(currentPlanLine({ effective_plan: 'premium', current: { expires_at: '2027-01-02T12:00:00Z' } }, 'UTC')).toBe('Current plan: Premium - Active until Jan 2, 2027');
  });
  it('handles Free, ended plans, missing dates and unreadable data', () => {
    expect(currentPlanLine({ effective_plan: 'free', state: 'free' }, 'UTC')).toBe('Current plan: Free');
    expect(currentPlanLine({ effective_plan: 'free', state: 'expired', last_expired_at: '2026-10-01T12:00:00Z' }, 'UTC')).toBe('Current plan: Free - your paid plan ended on Oct 1, 2026');
    expect(currentPlanLine({ effective_plan: 'pro', current: null }, 'UTC')).toBe('Current plan: Pro - Active');
    expect(currentPlanLine(null, 'UTC')).toBeNull();
    expect(currentPlanLine({ effective_plan: 'weird' }, 'UTC')).toBeNull();
  });
  it('survives a bad time zone', () => {
    expect(currentPlanLine({ effective_plan: 'pro', current: { expires_at: '2026-12-05T12:00:00Z' } }, 'Not/AZone')).toContain('Dec 5, 2026');
  });
});

describe('pages', () => {
  it('the alerts page keeps newest first, shows the current plan, and tags history without deleting anything', () => {
    const page = read('app/dashboard/notifications/page.tsx');
    expect(page).toContain('<CurrentPlanLine />');
    expect(page).toContain('sortNewestFirst');
    expect(page).toContain('Earlier update (history)');
    expect(page).toContain('Latest plan update');
    expect(page).toContain('markNotificationsReadAction');
    expect(page).not.toMatch(/\.delete\(|delete from/i);
  });
  it('the current plan line reads the database, not notifications', () => {
    const c = read('components/CurrentPlanLine.tsx');
    expect(c).toContain("rpc('my_subscription')");
    expect(c).not.toContain('notifications');
  });
  it('each tab starts at the top, except on the first load', () => {
    const nav = read('components/DashboardNav.tsx');
    expect(nav).toContain('window.scrollTo(0, 0)');
    expect(nav).toContain('firstRun.current');
  });
  it('the sign-in check runs once per page load', () => {
    expect(read('lib/data.ts')).toContain('export const requireSession = cache(');
  });
});
