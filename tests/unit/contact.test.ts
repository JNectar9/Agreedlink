import { describe, expect, it } from 'vitest';
import { checkSpamSignals, parseContactForm } from '@/lib/contact';

const valid = { name: 'Ada', email: 'ada@example.com', subject: '', message: 'Hello, I have a question.' };

describe('parseContactForm', () => {
  it('accepts a valid message', () => {
    expect(parseContactForm(valid).ok).toBe(true);
  });

  it('rejects missing, short, or malformed fields', () => {
    expect(parseContactForm({ ...valid, name: '  ' }).ok).toBe(false);
    expect(parseContactForm({ ...valid, email: 'nope' }).ok).toBe(false);
    expect(parseContactForm({ ...valid, message: 'short' }).ok).toBe(false);
    expect(parseContactForm({ ...valid, message: 'x'.repeat(3001) }).ok).toBe(false);
  });
});

describe('checkSpamSignals', () => {
  const now = 1_000_000_000_000;

  it('accepts a form that was open for a normal time with an empty hidden field', () => {
    expect(checkSpamSignals({ ts: String(now - 10_000), company_site: '' }, now).ok).toBe(true);
  });

  it('rejects a filled hidden field, an instant submit, a stale form, or a bad timestamp', () => {
    expect(checkSpamSignals({ ts: String(now - 10_000), company_site: 'http://spam' }, now).ok).toBe(false);
    expect(checkSpamSignals({ ts: String(now - 500), company_site: '' }, now).ok).toBe(false);
    expect(checkSpamSignals({ ts: String(now - 3 * 24 * 3600 * 1000), company_site: '' }, now).ok).toBe(false);
    expect(checkSpamSignals({ ts: 'abc', company_site: '' }, now).ok).toBe(false);
  });
});
