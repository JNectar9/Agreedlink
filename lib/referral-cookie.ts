// The referral cookie is signed, so nobody can edit the code or the date inside it.
// Uses only Web Crypto, so it works in middleware (Edge) and in tests.
export const REF_COOKIE = 'al_ref';
export const REF_DAYS = 30;
export const REF_MAX_AGE = REF_DAYS * 24 * 60 * 60;
export const REF_PATTERN = /^[A-Z0-9]{6,12}$/;

const enc = new TextEncoder();

async function hmacHex(secret: string, text: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(text));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** "CODE.1700000000000.signature" */
export async function signRef(code: string, clickedAtMs: number, secret: string): Promise<string> {
  const body = `${code}.${clickedAtMs}`;
  return `${body}.${(await hmacHex(secret, body)).slice(0, 32)}`;
}

/** Returns the code and click time only if the signature is genuine and the click is inside the 30-day window. */
export async function verifyRef(value: string | undefined, secret: string, nowMs: number = Date.now()): Promise<{ code: string; clickedAtMs: number } | null> {
  if (!value || value.length > 100) return null;
  const [code, ts, sig] = value.split('.');
  if (!code || !ts || !sig || !REF_PATTERN.test(code) || !/^\d{10,15}$/.test(ts)) return null;
  const clickedAtMs = Number(ts);
  if (clickedAtMs > nowMs + 60_000 || clickedAtMs < nowMs - REF_MAX_AGE * 1000) return null;
  const expected = (await hmacHex(secret, `${code}.${ts}`)).slice(0, 32);
  if (expected.length !== sig.length) return null;
  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0 ? { code, clickedAtMs } : null;
}

const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|discord|curl|wget|headless|python-requests/i;

/** Link-preview and crawler visits must not count as clicks. */
export function isBotAgent(userAgent: string | null | undefined): boolean {
  return !userAgent || BOT.test(userAgent);
}
