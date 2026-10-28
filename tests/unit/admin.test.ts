import { describe, expect, it } from 'vitest';
import { adminEmails, isOwnerEmail } from '@/lib/admin';

describe('platform owner check', () => {
  it('parses a comma separated list, ignoring case and spaces', () => {
    expect(adminEmails(' Owner@Example.com , second@example.com ,, ')).toEqual(['owner@example.com', 'second@example.com']);
  });

  it('recognises listed owners only', () => {
    expect(isOwnerEmail('OWNER@example.com', 'owner@example.com')).toBe(true);
    expect(isOwnerEmail('someone@example.com', 'owner@example.com')).toBe(false);
  });

  it('treats everyone as a normal user when no owners are configured', () => {
    expect(isOwnerEmail('owner@example.com', '')).toBe(false);
    expect(isOwnerEmail(null, 'owner@example.com')).toBe(false);
  });
});
