import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Singleton — satu koneksi dipakai ulang, tidak buat baru tiap request.
let _client: SupabaseClient | null = null;

export function admin(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Variabel lingkungan Supabase belum diisi (lihat .env.example).');
  _client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: 'public' },
    global: {
      headers: { 'x-connection-encrypted': 'true' },
    },
  });
  return _client;
}
