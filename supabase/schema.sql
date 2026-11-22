-- Ruang Strategi Belajar (RSB) - skema lengkap
-- Jalankan di Supabase > SQL Editor (bisa diulang, sudah pakai IF NOT EXISTS).

create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────
-- ADMIN (super user, login via Supabase Auth)
-- ─────────────────────────────────────────────
create table if not exists admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null default 'Admin',
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- KONTEN SITE (teks yang bisa diedit admin)
-- ─────────────────────────────────────────────
create table if not exists site_content (
  key text primary key,
  value text not null default '',
  updated_at timestamptz not null default now()
);

-- Seed konten default
insert into site_content (key, value) values
  ('home_title',       'Ruang Strategi Belajar'),
  ('home_subtitle',    'Kenali kebiasaan belajarmu, susun rencana, dan temukan strategi yang paling cocok bersama Guru BK.'),
  ('home_badge1',      'Strategi Belajar'),
  ('home_badge2',      'Tujuan Mingguan'),
  ('home_badge3',      'Manajemen Waktu'),
  ('home_badge4',      'Refleksi Diri'),
  ('strategi_intro',   'Tutup catatan, lalu coba jawab atau jelaskan materi dengan kata-katamu sendiri. Setelah itu, periksa catatan dan perbaiki bagian yang belum tepat.'),
  ('footer_text',      'Ruang Strategi Belajar · Media Layanan Bimbingan Konseling')
on conflict (key) do nothing;

-- ─────────────────────────────────────────────
-- GURU BK (terhubung ke akun Supabase Auth)
-- ─────────────────────────────────────────────
create table if not exists counselors (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  school_name text not null default 'SMA Contoh',
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- KODE SEKOLAH
-- ─────────────────────────────────────────────
create table if not exists school_codes (
  code text primary key,
  owner_id uuid not null references counselors(user_id) on delete cascade,
  note text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- JADWAL KONSULTASI
-- ─────────────────────────────────────────────
create table if not exists consult_slots (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references counselors(user_id) on delete cascade,
  label text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- SISWA
-- ─────────────────────────────────────────────
create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  nickname text not null check (char_length(nickname) between 1 and 20),
  class text not null check (class in ('X','XI','XII')),
  school_code text not null references school_codes(code) on delete cascade,
  consent_at timestamptz,
  share_summary boolean not null default false,
  include_reflection boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists students_school_code_idx on students(school_code);

-- ─────────────────────────────────────────────
-- RENCANA BELAJAR
-- ─────────────────────────────────────────────
create table if not exists student_plans (
  student_id uuid primary key references students(id) on delete cascade,
  habits_done text[] not null default '{}',
  habit_focus text not null default '',
  goal text not null default '',
  sched_topic text not null default '',
  sched_start date,
  strategies text[] not null default '{}',
  focus_notif text not null default '',
  focus_place text not null default '',
  focus_tools text not null default '',
  updated_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- KUIS
-- ─────────────────────────────────────────────
create table if not exists quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  score int not null check (score >= 0),
  total int not null check (total > 0),
  created_at timestamptz not null default now()
);
create index if not exists quiz_student_idx on quiz_attempts(student_id, created_at desc);

-- ─────────────────────────────────────────────
-- REFLEKSI
-- ─────────────────────────────────────────────
create table if not exists reflections (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  r1 text not null default '',
  r2 text not null default '',
  r3 text not null default '',
  barrier text not null check (barrier in ('tidak','sedikit','ya')),
  support_flag boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists refl_student_idx on reflections(student_id, created_at desc);

-- ─────────────────────────────────────────────
-- PERMINTAAN KONSULTASI
-- ─────────────────────────────────────────────
create table if not exists consult_requests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  slot_label text not null,
  status text not null default 'Baru' check (status in ('Baru','Dijadwalkan','Selesai')),
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- PESAN LIVE CHAT KONSULTASI
-- ─────────────────────────────────────────────
create table if not exists consult_messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references consult_requests(id) on delete cascade,
  sender_role text not null check (sender_role in ('siswa','guru')),
  sender_name text not null,
  message text not null check (char_length(message) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists consult_messages_req_idx on consult_messages(request_id, created_at asc);

-- ─────────────────────────────────────────────
-- HARI BERLATIH
-- ─────────────────────────────────────────────
create table if not exists practice_days (
  student_id uuid not null references students(id) on delete cascade,
  day date not null,
  primary key (student_id, day)
);

-- ─────────────────────────────────────────────
-- RLS (semua akses via service role di server)
-- ─────────────────────────────────────────────
alter table admins enable row level security;
alter table site_content enable row level security;
alter table counselors enable row level security;
alter table school_codes enable row level security;
alter table consult_slots enable row level security;
alter table students enable row level security;
alter table student_plans enable row level security;
alter table quiz_attempts enable row level security;
alter table reflections enable row level security;
alter table consult_requests enable row level security;
alter table consult_messages enable row level security;
alter table practice_days enable row level security;

-- ─────────────────────────────────────────────
-- SEED — jalankan setelah buat user di Auth
-- ─────────────────────────────────────────────
-- 1. Buat user admin di Supabase > Authentication > Users
-- 2. Ganti UUID_ADMIN dengan id-nya
-- 3. Buat user guru BK, ganti UUID_GURU
--
-- insert into admins (user_id, name) values ('UUID_ADMIN', 'Super Admin');
--
-- insert into counselors (user_id, name, school_name)
--   values ('UUID_GURU', 'Ibu Sari', 'SMA Contoh');
-- insert into school_codes (code, owner_id, note)
--   values ('RSB-01', 'UUID_GURU', 'Kelas X-XII');
-- insert into consult_slots (owner_id, label) values
--   ('UUID_GURU', 'Senin, 10.00'),
--   ('UUID_GURU', 'Rabu, 13.00'),
--   ('UUID_GURU', 'Jumat, 09.00');
