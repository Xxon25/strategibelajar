-- supabase/migrations/20261122000000_add_consult_messages.sql
-- Deskripsi: Menambahkan tabel consult_messages untuk fitur Live Chat konsultasi Siswa & Guru BK

-- ── UP ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.consult_messages (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id  UUID NOT NULL REFERENCES public.consult_requests(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('siswa', 'guru')),
  sender_name TEXT NOT NULL,
  message     TEXT NOT NULL CHECK (char_length(message) BETWEEN 1 AND 1000),
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS consult_messages_req_idx
  ON public.consult_messages(request_id, created_at ASC);

-- RLS (Row Level Security) — WAJIB aktif untuk semua tabel publik
ALTER TABLE public.consult_messages ENABLE ROW LEVEL SECURITY;
