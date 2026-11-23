-- Migration: tabel chat antara siswa dan guru BK
-- Jalankan di Supabase > SQL Editor

create table if not exists chat_messages (
  id           uuid primary key default gen_random_uuid(),
  request_id   uuid not null references consult_requests(id) on delete cascade,
  sender_role  text not null check (sender_role in ('student', 'counselor')),
  body         text not null check (char_length(body) between 1 and 2000),
  created_at   timestamptz not null default now()
);

create index if not exists chat_request_idx on chat_messages(request_id, created_at);

-- RLS aktif; seluruh akses via service role di server
alter table chat_messages enable row level security;
