import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/data';
import { isUuid } from '@/lib/subscriptions';
import { inlineResponse } from '@/lib/inline-file';

export const dynamic = 'force-dynamic';

/**
 * Sends the owner to a private download link that expires after one minute. Row Level Security means only the
 * owner can read the record, and the storage policy means only the owner can create the link.
 */
export async function GET(request: Request, { params }: { params: { id: string } }) {
  if (!isUuid(params.id)) return new NextResponse('Not found', { status: 404 });
  const { supabase } = await requireSession();
  const { data: row } = await supabase.from('agreement_attachments').select('storage_path, file_name, status, mime_type, size_bytes').eq('id', params.id).maybeSingle();
  const file = row as { storage_path: string; file_name: string; status: string; mime_type: string; size_bytes: number } | null;
  if (!file || file.status !== 'ready') return new NextResponse('Not found', { status: 404 });
  // ?inline=1 shows images and PDFs in the browser (preview). Every other file type is always a download.
  const wantsInline = new URL(request.url).searchParams.get('inline') === '1';
  const inline = wantsInline && (file.mime_type === 'application/pdf' || file.mime_type.startsWith('image/'));
  const { data, error } = await supabase.storage.from('attachments').createSignedUrl(file.storage_path, 60, inline ? undefined : { download: file.file_name });
  if (error || !data?.signedUrl) return new NextResponse('Could not prepare the download', { status: 500 });
  if (inline) {
    const shown = await inlineResponse(data.signedUrl, file.mime_type, file.file_name, Number(file.size_bytes));
    if (shown) return shown;
  }
  return NextResponse.redirect(data.signedUrl, 303);
}
