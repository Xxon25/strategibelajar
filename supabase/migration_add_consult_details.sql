-- Migration: tambah detail balasan guru pada consult_requests
-- Jalankan di Supabase > SQL Editor setelah migration_add_consult_mode.sql

alter table consult_requests
  add column if not exists room_info       text not null default '',
  add column if not exists reschedule_note text not null default '',
  add column if not exists meet_link       text not null default '',
  add column if not exists confirmed_time  text not null default '';
