-- ============================================================
-- RSB — Migration Fix All
-- Jalankan SATU KALI di Supabase > SQL Editor
-- Aman diulang (semua pakai IF NOT EXISTS / DO NOTHING)
-- ============================================================

-- ── 1. consult_slots: tambah kolom mode ──
alter table consult_slots
  add column if not exists mode text not null default 'offline';

-- Set constraint jika belum ada
do $$
begin
  if not exists (
    select 1 from information_schema.check_constraints
    where constraint_name = 'consult_slots_mode_check'
  ) then
    alter table consult_slots
      add constraint consult_slots_mode_check check (mode in ('online', 'offline'));
  end if;
end $$;

-- ── 2. consult_requests: tambah semua kolom yang dibutuhkan ──
alter table consult_requests
  add column if not exists mode text not null default 'offline';

alter table consult_requests
  add column if not exists student_note text not null default '';

alter table consult_requests
  add column if not exists room_info text not null default '';

alter table consult_requests
  add column if not exists reschedule_note text not null default '';

alter table consult_requests
  add column if not exists meet_link text not null default '';

alter table consult_requests
  add column if not exists confirmed_time text not null default '';

-- ── 3. Buat tabel consult_messages jika belum ada ──
create table if not exists consult_messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references consult_requests(id) on delete cascade,
  sender_role text not null check (sender_role in ('siswa','guru')),
  sender_name text not null,
  message text not null check (char_length(message) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index if not exists consult_messages_req_idx
  on consult_messages(request_id, created_at asc);

-- ── 4. Aktifkan RLS pada tabel baru ──
alter table consult_messages enable row level security;

-- ── 5. Pastikan site_content ada (untuk fallback chat) ──
-- Tabel sudah ada tapi pastikan tidak error jika sudah ada
insert into site_content (key, value) values
  ('home_title',    'Ruang Strategi Belajar'),
  ('home_subtitle', 'Kenali kebiasaan belajarmu, susun rencana, dan temukan strategi yang paling cocok bersama Guru BK.'),
  ('home_badge1',   'Strategi Belajar'),
  ('home_badge2',   'Tujuan Mingguan'),
  ('home_badge3',   'Manajemen Waktu'),
  ('home_badge4',   'Refleksi Diri'),
  ('footer_text',   'Ruang Strategi Belajar · Media Layanan Bimbingan Konseling')
on conflict (key) do nothing;
