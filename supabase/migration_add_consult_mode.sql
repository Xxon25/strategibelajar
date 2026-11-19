-- Migration: tambah kolom mode (online/offline) pada consult_slots dan consult_requests
-- Jalankan di Supabase > SQL Editor

alter table consult_slots
  add column if not exists mode text not null default 'offline'
  check (mode in ('online', 'offline'));

alter table consult_requests
  add column if not exists mode text not null default 'offline'
  check (mode in ('online', 'offline'));
