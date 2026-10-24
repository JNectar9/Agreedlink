import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

// Customer links carry a random 256-bit token. The database stores only its SHA-256 hash for
// lookup, plus an AES-256-GCM encrypted copy so the creator can copy the link again later.
export const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function generateToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function encryptionKey(secret = process.env.SHARE_TOKEN_SECRET): Buffer {
  if (!secret || secret.length < 32) throw new Error('SHARE_TOKEN_SECRET must be at least 32 characters');
  return createHash('sha256').update(secret).digest();
}

export function encryptToken(token: string, secret?: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(secret), iv);
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64url');
}

export function decryptToken(payload: string, secret?: string): string {
  const buffer = Buffer.from(payload, 'base64url');
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(secret), buffer.subarray(0, 12));
  decipher.setAuthTag(buffer.subarray(12, 28));
  return Buffer.concat([decipher.update(buffer.subarray(28)), decipher.final()]).toString('utf8');
}

/** Default customer link lifetime. Creators can regenerate a link at any time. */
export function defaultExpiry(days = 30): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}
