'use client';
import { useRef, useState, useTransition } from 'react';
import { Camera, Loader2, Trash2 } from 'lucide-react';
import { Avatar } from './Avatar';
import { createBrowserSupabase } from '@/lib/supabase/browser';
import { AVATAR_EXT, AVATAR_MAX_BYTES, AVATAR_SOURCE_MAX_BYTES, AVATAR_TYPES } from '@/lib/avatar';
import { compressImage } from '@/lib/image-compress';
import { removeAvatarAction, saveAvatarAction } from '@/app/dashboard/actions';

/**
 * Choose a photo from the phone gallery or files, preview it, then upload it to the private avatars bucket.
 * Storage rules only allow a user to write inside their own folder, and the bucket enforces the type and size limits.
 */
export function AvatarUploader({ userId, currentUrl, initials, hasPhoto }: { userId: string; currentUrl: string | null; initials: string; hasPhoto: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<{ blob: Blob; type: string; kb: number } | null>(null);
  const [optimizing, setOptimizing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();
  const busy = uploading || pending || optimizing;

  async function choose(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    const reset = () => { e.target.value = ''; };
    setError('');
    if (!picked) return;
    if (!(AVATAR_TYPES as readonly string[]).includes(picked.type)) {
      setError('Choose a JPEG, PNG or WebP image.');
      reset();
      return;
    }
    if (picked.size > AVATAR_SOURCE_MAX_BYTES) {
      setError(`That photo is ${(picked.size / 1024 / 1024).toFixed(0)} MB. Choose one under ${AVATAR_SOURCE_MAX_BYTES / 1024 / 1024} MB.`);
      reset();
      return;
    }
    setOptimizing(true);
    try {
      const out = await compressImage(picked);
      if (out.blob.size > AVATAR_MAX_BYTES) {
        setError('That photo is still over 5 MB after compression. Choose a smaller one.');
        reset();
        return;
      }
      if (preview) URL.revokeObjectURL(preview);
      setFile({ blob: out.blob, type: out.type, kb: Math.max(1, Math.round(out.blob.size / 1024)) });
      setPreview(URL.createObjectURL(out.blob));
    } catch {
      setError('That photo could not be read. Try a different one.');
      reset();
    } finally {
      setOptimizing(false);
    }
  }

  async function save() {
    if (!file) return;
    setUploading(true);
    setError('');
    const path = `${userId}/avatar-${Date.now()}.${AVATAR_EXT[file.type]}`;
    const { error: uploadError } = await createBrowserSupabase().storage.from('avatars').upload(path, file.blob, { contentType: file.type, upsert: false });
    if (uploadError) {
      setUploading(false);
      setError('The upload failed. Check your connection and try again.');
      return;
    }
    startTransition(async () => {
      await saveAvatarAction(path);
      setUploading(false);
    });
  }

  return (
    <section className="card" aria-labelledby="photo-h">
      <h2 id="photo-h" className="text-lg">Profile photo</h2>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <Avatar url={preview ?? currentUrl} initials={initials} size={80} />
        <div className="min-w-0 space-y-2">
          <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" id="avatar-file" onChange={choose} disabled={busy} />
          <div className="flex flex-wrap gap-2">
            <label htmlFor="avatar-file" className={`btn-secondary cursor-pointer ${busy ? 'pointer-events-none opacity-60' : ''}`}><Camera size={16} aria-hidden="true" /> {currentUrl || preview ? 'Change photo' : 'Upload photo'}</label>
            {file ? (
              <button type="button" onClick={save} disabled={busy} className="btn-primary">
                {busy ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : null}
                {uploading || pending ? 'Uploading…' : `Save photo (${file.kb} KB)`}
              </button>
            ) : null}
            {hasPhoto && !file ? (
              <button type="button" disabled={busy} className="btn-danger" onClick={() => startTransition(async () => { await removeAvatarAction(); })}>
                <Trash2 size={16} aria-hidden="true" /> Remove
              </button>
            ) : null}
          </div>
          <p className="text-xs text-muted">{optimizing ? 'Optimizing your photo…' : 'JPEG, PNG or WebP. Photos are resized and compressed automatically before upload. Maximum 5 MB after compression. Pick from your gallery or files.'}</p>
        </div>
      </div>
      {error ? <p role="alert" className="mt-3 text-sm text-bad">{error}</p> : null}
    </section>
  );
}
