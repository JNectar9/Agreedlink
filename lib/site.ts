import { siteUrl } from './env';

// Company and contact details. Defaults are the verified details supplied by JNectar.
// Every value can be overridden (or cleared) with an environment variable in Vercel.
const phone = process.env.NEXT_PUBLIC_CONTACT_PHONE || '+2348029864569';

export const SITE = {
  company: 'JNectar',
  product: 'AgreedLink',
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'JNectar.tech@gmail.com',
  phone,
  whatsapp: (process.env.NEXT_PUBLIC_CONTACT_WHATSAPP || phone).replace(/\D/g, ''),
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

export function whatsappLink(text?: string): string {
  return `https://wa.me/${SITE.whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}

export function configuredSocials(): { name: string; url: string }[] {
  return Object.entries(SITE.socials)
    .filter(([, url]) => /^https?:\/\//i.test(url))
    .map(([name, url]) => ({ name, url }));
}
