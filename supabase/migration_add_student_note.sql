-- Migration: tambah kolom catatan dari siswa pada consult_requests
-- Jalankan di Supabase > SQL Editor

alter table consult_requests
  add column if not exists student_note text not null default '';
