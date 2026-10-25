import { describe, expect, it } from 'vitest';
import { SITE, whatsappLink } from '@/lib/site';

describe('company contact details', () => {
  it('uses the verified JNectar details by default', () => {
    expect(SITE.email).toBe('JNectar.tech@gmail.com');
    expect(SITE.phone).toBe('+2348029864569');
    expect(SITE.whatsapp).toBe('2348029864569');
  });

  it('builds a WhatsApp link with digits only and an encoded message', () => {
    expect(whatsappLink()).toBe('https://wa.me/2348029864569');
    expect(whatsappLink('Hello & welcome')).toBe('https://wa.me/2348029864569?text=Hello%20%26%20welcome');
  });
});
