import { siteUrl } from './env';

// Company and contact details. Defaults are the verified details supplied by JNectar.
// Every value can be overridden (or cleared) with an environment variable in Vercel.
/** Digits only, as WhatsApp links require (no plus sign, spaces or dashes). */
export function toWhatsAppDigits(phone: string): string {
  return phone.replace(/\D/g, '');
}

/** A usable international number has 8 to 15 digits. */
export function isValidWhatsAppNumber(digits: string): boolean {
  return /^[1-9]\d{7,14}$/.test(digits);
}

/** Builds a WhatsApp chat link for any number, optionally with a prefilled message. */
export function buildWhatsAppLink(digits: string, text?: string): string {
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}

const phone = process.env.NEXT_PUBLIC_CONTACT_PHONE || '+2348029864569';

export const SITE = {
  company: 'JNectar',
  product: 'AgreedLink',
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'JNectar.tech@gmail.com',
  phone,
  whatsapp: toWhatsAppDigits(process.env.NEXT_PUBLIC_CONTACT_WHATSAPP || phone),
  website: process.env.NEXT_PUBLIC_COMPANY_WEBSITE || 'https://jnectar.tech',
  address: process.env.NEXT_PUBLIC_COMPANY_ADDRESS || '',
  socials: {
    X: process.env.NEXT_PUBLIC_SOCIAL_X || '',
    Instagram: process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM || '',
    LinkedIn: process.env.NEXT_PUBLIC_SOCIAL_LINKEDIN || '',
    Facebook: process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK || ''
  } as Record<string, string>
};

export function websiteUrl(): string {
  return siteUrl();
}

export const whatsappAvailable = isValidWhatsAppNumber(SITE.whatsapp);

export function whatsappLink(text?: string): string {
  return buildWhatsAppLink(SITE.whatsapp, text);
}

export function configuredSocials(): { name: string; url: string }[] {
  return Object.entries(SITE.socials)
    .filter(([, url]) => /^https?:\/\//i.test(url))
    .map(([name, url]) => ({ name, url }));
}
