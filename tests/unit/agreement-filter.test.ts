import { describe, expect, it } from 'vitest';
import { matchesFilter, normalizeFilter } from '@/lib/agreement-filter';

describe('normalizeFilter', () => {
  it('ignores capitalisation and spacing', () => {
    expect(normalizeFilter('Approved')).toBe('approved');
    expect(normalizeFilter('  APPROVED ')).toBe('approved');
    expect(normalizeFilter('Changes Pending')).toBe('changes_pending');
    expect(normalizeFilter('awaiting-approval')).toBe('awaiting_approval');
  });

  it('falls back to All for unknown or missing values', () => {
    expect(normalizeFilter('nonsense')).toBe('all');
    expect(normalizeFilter(undefined)).toBe('all');
    expect(normalizeFilter('')).toBe('all');
  });
});

describe('matchesFilter', () => {
  const approved = { status: 'approved', shown: 'approved' };
  const approvedWithChange = { status: 'approved', shown: 'changes_pending' };
  const waiting = { status: 'awaiting_approval', shown: 'awaiting_approval' };

  it('lists every agreement under All', () => {
    for (const a of [approved, approvedWithChange, waiting]) expect(matchesFilter(a, 'all')).toBe(true);
  });

  it('lists approved agreements under Approved, even while a change is pending', () => {
    expect(matchesFilter(approved, 'approved')).toBe(true);
    expect(matchesFilter(approvedWithChange, 'approved')).toBe(true);
    expect(matchesFilter(waiting, 'approved')).toBe(false);
  });

  it('keeps the other filters exact', () => {
    expect(matchesFilter(approvedWithChange, 'changes_pending')).toBe(true);
    expect(matchesFilter(approved, 'changes_pending')).toBe(false);
    expect(matchesFilter(waiting, 'awaiting_approval')).toBe(true);
  });
});
