import { afterEach, describe, expect, it } from 'vitest';
import { decryptToken, encryptToken, generateToken, hashToken, TOKEN_PATTERN } from '@/lib/tokens';

const secret = 'a'.repeat(40);

afterEach(() => {
  delete process.env.SHARE_TOKEN_SECRET;
});

describe('share tokens', () => {
  it('generates unpredictable url-safe tokens', () => {
    const a = generateToken();
    const b = generateToken();
    expect(a).toMatch(TOKEN_PATTERN);
    expect(a).not.toBe(b);
  });

  it('hashes deterministically to 64 hex characters', () => {
    const t = generateToken();
    expect(hashToken(t)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken(t)).toBe(hashToken(t));
    expect(hashToken(t)).not.toBe(hashToken(generateToken()));
  });

  it('encrypts and decrypts round trip, with a fresh nonce each time', () => {
    const t = generateToken();
    const one = encryptToken(t, secret);
    const two = encryptToken(t, secret);
    expect(one).not.toBe(two);
    expect(decryptToken(one, secret)).toBe(t);
  });

  it('fails to decrypt with the wrong secret or tampered data', () => {
    const t = generateToken();
    const encrypted = encryptToken(t, secret);
    expect(() => decryptToken(encrypted, 'b'.repeat(40))).toThrow();
    expect(() => decryptToken(encrypted.slice(0, -2) + 'AA', secret)).toThrow();
  });

  it('refuses to run without a long enough secret', () => {
    expect(() => encryptToken('x')).toThrow(/SHARE_TOKEN_SECRET/);
    expect(() => encryptToken('x', 'short')).toThrow(/SHARE_TOKEN_SECRET/);
  });
});
