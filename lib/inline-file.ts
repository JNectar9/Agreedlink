// Serves an image or PDF so the browser SHOWS it instead of downloading it. Used only after the caller has already
// checked who may see the file. Larger files (over 4 MB) return null and the caller falls back to a plain redirect,
// because the hosting platform limits how big a proxied response can be.
const MAX_PROXY_BYTES = 4 * 1024 * 1024;

export async function inlineResponse(signedUrl: string, mime: string, fileName: string, sizeBytes: number): Promise<Response | null> {
  if (!(mime === 'application/pdf' || mime.startsWith('image/'))) return null;
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0 || sizeBytes > MAX_PROXY_BYTES) return null;
  try {
    const upstream = await fetch(signedUrl, { cache: 'no-store' });
    if (!upstream.ok || !upstream.body) return null;
    const ascii = fileName.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
    return new Response(upstream.body, {
      headers: {
        'Content-Type': mime,
        'Content-Disposition': `inline; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer'
      }
    });
  } catch {
    return null;
  }
}
