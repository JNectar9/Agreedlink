import type { createClient } from '@/lib/supabase/server';

/** Short-lived signed link to a private avatar. Returns null when there is no photo or it cannot be read. */
export async function signedAvatarUrl(supabase: ReturnType<typeof createClient>, path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage.from('avatars').createSignedUrl(path, 60 * 60);
  return error ? null : data.signedUrl;
}

export const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
/** What storage accepts after compression. The same limit is set on the Supabase bucket (migration 0005). */
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
/** Largest photo the browser will try to open and compress before upload. */
export const AVATAR_SOURCE_MAX_BYTES = 20 * 1024 * 1024;
export const AVATAR_EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
