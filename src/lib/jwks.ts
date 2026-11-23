import type { SupabaseClient } from '@supabase/supabase-js';

type GetClaimsOpts = NonNullable<Parameters<SupabaseClient['auth']['getClaims']>[1]>;
type JwksResponse = NonNullable<GetClaimsOpts['jwks']>;

const JWKS_CACHE_MS = 10 * 60 * 1000;
const _jwksCache = new Map<string, { jwks: JwksResponse; expiresAt: number }>();
const _inflight = new Map<string, Promise<JwksResponse | undefined>>();

export async function getCachedJwks(supabaseUrl: string): Promise<JwksResponse | undefined> {
  const now = Date.now();
  const cached = _jwksCache.get(supabaseUrl);
  if (cached && cached.expiresAt > now) {
    return cached.jwks;
  }

  const pending = _inflight.get(supabaseUrl);
  if (pending) return pending;

  const task = (async () => {
    try {
      const res = await fetch(`${supabaseUrl}/auth/v1/.well-known/jwks.json`, {
        next: { revalidate: 600 },
      });
      if (!res.ok) return cached?.jwks;
      const data = (await res.json()) as JwksResponse;
      if (data && Array.isArray(data.keys) && data.keys.length > 0) {
        _jwksCache.set(supabaseUrl, { jwks: data, expiresAt: Date.now() + JWKS_CACHE_MS });
        return data;
      }
    } catch {
      /* fallback ke cache lama atau fetch internal getClaims */
    } finally {
      _inflight.delete(supabaseUrl);
    }
    return cached?.jwks;
  })();

  _inflight.set(supabaseUrl, task);
  return task;
}

/**
 * Verifikasi JWT Supabase Auth secara lokal (ES256 JWKS, < 1ms) agar tidak
 * memblokir setiap perpindahan tab dengan round-trip HTTPS ke /auth/v1/user.
 */
export async function getVerifiedUserId(sb: SupabaseClient, supabaseUrl?: string): Promise<string | null> {
  const url = supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const jwks = url ? await getCachedJwks(url) : undefined;
  const { data, error } = await sb.auth.getClaims(undefined, jwks ? { jwks } : undefined);
  if (!error && typeof data?.claims?.sub === 'string' && data.claims.sub) {
    return data.claims.sub;
  }
  const { data: userData } = await sb.auth.getUser();
  return userData.user?.id ?? null;
}
