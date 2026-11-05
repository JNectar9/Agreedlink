import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/data';
import { isUuid } from '@/lib/subscriptions';

export const dynamic = 'force-dynamic';

/**
 * Sends the owner to a private download link that expires after one minute. Row Level Security means only the
 * owner can read the record, and the storage policy means only the owner can create the link.
 */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  if (!isUuid(params.id)) return new NextResponse('Not found', { status: 404 });
  const { supabase } = await requireSession();
  const { data: row } = await supabase.from('agreement_attachments').select('storage_path, file_name, status').eq('id', params.id).maybeSingle();
  const file = row as { storage_path: string; file_name: string; status: string } | null;
  if (!file || file.status !== 'ready') return new NextResponse('Not found', { status: 404 });
  const { data, error } = await supabase.storage.from('attachments').createSignedUrl(file.storage_path, 60, { download: file.file_name });
  if (error || !data?.signedUrl) return new NextResponse('Could not prepare the download', { status: 500 });
  return NextResponse.redirect(data.signedUrl, 303);
}
