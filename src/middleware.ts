import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getCachedJwks } from '@/lib/jwks';

export async function middleware(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let res = NextResponse.next({ request: req });
  if (!url || !anon) return res;

  // Fast-path: lewati jika tidak ada cookie sesi Auth (sb-*)
  const allCookies = req.cookies.getAll();
  const hasAuthCookie = allCookies.some((c) => c.name.startsWith('sb-'));
  if (!hasAuthCookie) return res;

  try {
    const sb = createServerClient(url, anon, {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll(list: Array<{ name: string; value: string; options: CookieOptions }>) {
          list.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({ request: req });
          list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
        },
      },
    });
    // Verifikasi lokal (< 1ms) dengan JWKS cache; auto-refresh hanya jika token kedaluwarsa.
    const jwks = await getCachedJwks(url);
    const { error } = await sb.auth.getClaims(undefined, jwks ? { jwks } : undefined);
    if (error) {
      await sb.auth.getUser();
    }
  } catch (err) {
    console.error('[middleware] Gagal menyegarkan sesi Supabase:', err);
  }
  return res;
}

export const config = { matcher: ['/guru/:path*', '/admin/:path*'] };
