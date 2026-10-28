import { Github } from 'lucide-react';
import { oauthAction } from '@/app/auth/actions';

/**
 * Google and GitHub buttons. They appear only when the provider is switched on in Supabase AND listed in
 * NEXT_PUBLIC_OAUTH_PROVIDERS (for example "google,github"), so a button never leads to a dead end.
 */
export function OAuthButtons({ label }: { label: string }) {
  const enabled = (process.env.NEXT_PUBLIC_OAUTH_PROVIDERS ?? '').split(',').map((p) => p.trim().toLowerCase());
  const google = enabled.includes('google');
  const github = enabled.includes('github');
  if (!google && !github) return null;
  const btn = 'flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-2xl border border-brand/50 bg-[#061a45]/70 px-4 text-sm font-medium text-white hover:bg-[#071f52]';
  return (
    <div className="pt-2">
      <p className="flex items-center gap-3 text-xs text-blue-300"><span className="h-px flex-1 bg-brand/40" />{label}<span className="h-px flex-1 bg-brand/40" /></p>
      <div className="mt-3 flex gap-3">
        {google ? (<form action={oauthAction.bind(null, 'google')} className="flex flex-1"><button className={btn}><span aria-hidden="true" className="font-bold text-[#4285F4]">G</span> Google</button></form>) : null}
        {github ? (<form action={oauthAction.bind(null, 'github')} className="flex flex-1"><button className={btn}><Github size={18} aria-hidden="true" /> GitHub</button></form>) : null}
      </div>
    </div>
  );
}
