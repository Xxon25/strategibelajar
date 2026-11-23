import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Cache client per kombinasi url+key agar tetap pakai env terbaru tapi tidak alokasi ulang tiap query.
const _clients = new Map<string, SupabaseClient>();

export function admin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Variabel lingkungan Supabase belum diisi (lihat .env.example).');
  const cacheKey = `${url}|${key}`;
  const existing = _clients.get(cacheKey);
  if (existing) return existing;
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: 'public' },
    global: {
      headers: { 'x-connection-encrypted': 'true' },
    },
  });
  _clients.set(cacheKey, client);
  return client;
}
