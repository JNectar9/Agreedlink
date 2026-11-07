// Is a visitor signed in? Used by public pages so the header and buttons match the visitor's session.
// It only reads the session. It never signs anyone out and never throws.
import { isSupabaseConfigured } from './env';
import { createClient } from './supabase/server';

export async function isSignedIn(): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const {
      data: { user }
    } = await createClient().auth.getUser();
    return Boolean(user);
  } catch {
    return false;
  }
}
