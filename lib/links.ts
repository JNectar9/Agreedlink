import { siteUrl } from './env';
import { decryptToken } from './tokens';

/** Builds the customer URL from the encrypted token. Not a server action: never callable from the browser. */
export function customerUrl(ciphertext: string): { token: string; url: string } | null {
  try {
    const token = decryptToken(ciphertext);
    return { token, url: `${siteUrl()}/a/${token}` };
  } catch {
    return null;
  }
}
