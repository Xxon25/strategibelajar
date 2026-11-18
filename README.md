# Ruang Strategi Belajar (RSB)

Website bimbingan belajar untuk siswa SMA/MA (Next.js 15 App Router + Supabase), dikembangkan dari Prototipe I dan proposal RSB.

## Fitur

**Siswa** (daftar dengan nama panggilan + kelas + kode sekolah, tanpa kata sandi)
- Beranda + persetujuan data (wajib sebelum mulai)
- Perencanaan: Kenali Kebiasaan Belajar, Tetapkan Tujuan, Atur Waktu (jadwal ulang bertahap + cetak)
- Pelaksanaan: Strategi Belajar (pilihan strategi + kuis mandiri), Fokus Belajar
- Refleksi Mingguan (draf otomatis, kalender hari berlatih, pesan dukungan bila ada kata bernada putus asa)
- Bantuan Guru BK (pilih apa yang dibagikan, ajukan jadwal, hapus data sendiri)

**Guru BK** (email + kata sandi, Supabase Auth)
- Daftar siswa dengan filter kelas/hambatan; hanya data yang siswa izinkan
- Konsultasi (ubah status), kode sekolah, jadwal konsultasi

## Cara menjalankan

1. Buat project di https://supabase.com.
2. SQL Editor: jalankan `supabase/schema.sql`.
3. Authentication > Users: buat satu user guru (email + kata sandi).
4. Jalankan bagian SEED di bawah `schema.sql` (ganti `UUID_USER_GURU` dengan id user tadi).
5. `cp .env.example .env.local`, isi URL, anon key, dan service role key (Project Settings > API).
6. `npm install` lalu `npm run dev`, buka http://localhost:3000.

## Catatan keamanan dan privasi

- Semua tabel memakai RLS tanpa policy. Seluruh akses data lewat server Next.js dengan service role key, yang tidak pernah dikirim ke peramban.
- Sesi siswa: token acak di cookie httpOnly, hanya hash SHA-256 yang disimpan.
- Guru hanya bisa melihat siswa yang memakai kode sekolah miliknya.
- Data yang dikumpulkan minimal: nama panggilan, kelas, rencana, kuis, refleksi, jadwal konsultasi.

## Keterbatasan yang perlu diketahui

- Siswa tanpa kata sandi: data terikat ke peramban di perangkat itu. Ganti perangkat atau hapus cookie = daftar ulang. Solusi lanjutan: kode pemulihan.
- Deteksi kata bernada putus asa hanya aturan kata kunci sederhana (`CRISIS` di `src/lib/constants.ts`); daftar kata sebaiknya ditetapkan bersama guru BK. Aplikasi ini bukan layanan krisis.
- Belum ada pembatasan percobaan login guru selain bawaan Supabase, dan belum ada kebijakan retensi/penghapusan data berkala.
- Belum diuji dengan database Supabase sungguhan di sesi pembuatan ini (hanya typecheck dan build lolos).
- Di sekolah nyata, persetujuan sekolah serta orang tua/wali tetap diperlukan.
