import type { Result } from './validation';

/** Returns '' when empty, the cleaned +E.164-style number when valid, or null when invalid. */
export function normalizePhone(input: string): string | null {
  const raw = input.trim();
  if (!raw) return '';
  const cleaned = raw.replace(/[\s\-().]/g, '');
  return /^\+[1-9]\d{6,14}$/.test(cleaned) ? cleaned : null;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type SignUpData = { full_name: string; email: string; phone: string; password: string };

export function parseSignUpForm(input: Record<string, unknown>): Result<{ data: SignUpData }> {
  const text = (k: string) => (typeof input[k] === 'string' ? (input[k] as string) : '');
  const full_name = text('full_name').trim();
  const email = text('email').trim();
  const password = text('password');
  if (!full_name) return { ok: false, error: 'Enter your full name.' };
  if (full_name.length > 120) return { ok: false, error: 'Your name must be 120 characters or fewer.' };
  if (!EMAIL.test(email) || email.length > 254) return { ok: false, error: 'Enter a valid email address.' };
  const phone = normalizePhone(text('phone'));
  if (phone === null) return { ok: false, error: 'Enter the phone number with its country code, for example +234...' };
  if (password.length < 8) return { ok: false, error: 'Use a password of at least 8 characters.' };
  if (password.length > 72) return { ok: false, error: 'Use a password of 72 characters or fewer.' };
  if (text('agree') !== 'on') return { ok: false, error: 'Please agree to the Terms of Service and Privacy Policy to continue.' };
  return { ok: true, data: { full_name, email, phone, password } };
}
