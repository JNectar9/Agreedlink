import { describe, expect, it } from 'vitest';
import { SITE, buildWhatsAppLink, isValidWhatsAppNumber, toWhatsAppDigits, whatsappLink } from '@/lib/site';

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

describe('WhatsApp links', () => {
  it('strips everything except digits', () => {
    expect(toWhatsAppDigits('+234 802 986 4569')).toBe('2348029864569');
    expect(toWhatsAppDigits('(0802) 986-4569')).toBe('08029864569');
  });

  it('accepts only plausible international numbers', () => {
    expect(isValidWhatsAppNumber('2348029864569')).toBe(true);
    expect(isValidWhatsAppNumber('08029864569')).toBe(false);
    expect(isValidWhatsAppNumber('123')).toBe(false);
    expect(isValidWhatsAppNumber('')).toBe(false);
  });

  it('builds links that open WhatsApp directly', () => {
    expect(buildWhatsAppLink('2348029864569')).toBe('https://wa.me/2348029864569');
    expect(buildWhatsAppLink('2348029864569', 'Hi there')).toBe('https://wa.me/2348029864569?text=Hi%20there');
    expect(whatsappLink()).toMatch(/^https:\/\/wa\.me\/\d{8,15}$/);
  });
});
