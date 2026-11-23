import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Buat client baru setiap kali — menghindari singleton cache pakai env lama.
export function admin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Variabel lingkungan Supabase belum diisi (lihat .env.example).');
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: 'public' },
    global: {
      headers: { 'x-connection-encrypted': 'true' },
    },
  });
}
