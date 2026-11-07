import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isServerConfigured } from '@/lib/env';
import { hashToken, TOKEN_PATTERN } from '@/lib/tokens';
import { isUuid } from '@/lib/subscriptions';
import { inlineResponse } from '@/lib/inline-file';

export const dynamic = 'force-dynamic';

type FileRow = { id: string; file_name: string; mime_type: string; size_bytes: number | string; storage_path: string };

// Every failure returns the same plain 404, so a customer cannot tell a private file, another agreement's file,
// a deleted file and a revoked or expired link apart.
const notFound = () => new NextResponse('Not found', { status: 404, headers: { 'Cache-Control': 'no-store' } });

/**
 * Sends a customer to a private, 60-second link for ONE file. Access is decided by the database function
 * customer_files(): the link must be valid and the file must belong to that link's agreement, be finished and be
 * marked visible to the customer. The browser never gets a storage path, and the bucket itself stays owner-only.
 */
export async function GET(request: Request, { params }: { params: { token: string; id: string } }) {
  if (!TOKEN_PATTERN.test(params.token) || !isUuid(params.id) || !isServerConfigured()) return notFound();

  const admin = createAdminClient();
  const { data, error } = await admin.rpc('customer_files', { p_token_hash: hashToken(params.token) });
  if (error || !Array.isArray(data)) return notFound();
  const file = (data as FileRow[]).find((f) => f.id === params.id);
  if (!file) return notFound();

  // ?inline=1 shows images and PDFs in the browser. Every other type is always a download.
  const wantsInline = new URL(request.url).searchParams.get('inline') === '1';
  const inline = wantsInline && (file.mime_type === 'application/pdf' || file.mime_type.startsWith('image/'));
  const signed = await admin.storage.from('attachments').createSignedUrl(file.storage_path, 60, inline ? undefined : { download: file.file_name });
  if (signed.error || !signed.data?.signedUrl) return new NextResponse('Could not prepare the file', { status: 500, headers: { 'Cache-Control': 'no-store' } });

  if (inline) {
    const shown = await inlineResponse(signed.data.signedUrl, file.mime_type, file.file_name, Number(file.size_bytes));
    if (shown) return shown;
  }
  const response = NextResponse.redirect(signed.data.signedUrl, 303);
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}
