'use server';

import { revalidatePath } from 'next/cache';
import { admin } from '@/lib/supabase-admin';
import { getStudent, getGuru } from '@/lib/session';

const txt = (f: FormData, k: string, max: number) =>
  String(f.get(k) ?? '').trim().slice(0, max);

/** Siswa mengirim pesan */
export async function sendStudentMessage(f: FormData) {
  const s = await getStudent();
  if (!s) return { error: 'Sesi tidak ditemukan.' };

  const requestId = txt(f, 'request_id', 60);
  const body = txt(f, 'body', 2000);
  if (!body) return { error: 'Pesan tidak boleh kosong.' };

  try {
    const sb = admin();
    // Pastikan request ini milik siswa
    const { data: req } = await sb
      .from('consult_requests')
      .select('id')
      .eq('id', requestId)
      .eq('student_id', s.id)
      .maybeSingle();
    if (!req) return { error: 'Permintaan tidak ditemukan.' };

    const { error } = await sb
      .from('chat_messages')
      .insert({ request_id: requestId, sender_role: 'student', body });
    if (error) return { error: 'Gagal mengirim pesan.' };

    revalidatePath(`/siswa/chat/${requestId}`);
    return { ok: true };
  } catch {
    return { error: 'Terjadi kesalahan.' };
  }
}

/** Guru BK mengirim pesan */
export async function sendGuruMessage(f: FormData) {
  const g = await getGuru();
  if (!g) return { error: 'Sesi guru tidak ditemukan.' };

  const requestId = txt(f, 'request_id', 60);
  const body = txt(f, 'body', 2000);
  if (!body) return { error: 'Pesan tidak boleh kosong.' };

  try {
    const sb = admin();
    // Pastikan request ini milik siswa yang terdaftar di kode guru ini
    const { data: req } = await sb
      .from('consult_requests')
      .select('id, student_id')
      .eq('id', requestId)
      .maybeSingle();
    if (!req) return { error: 'Permintaan tidak ditemukan.' };

    const { data: student } = await sb
      .from('students')
      .select('school_code')
      .eq('id', req.student_id)
      .maybeSingle();
    if (!student) return { error: 'Siswa tidak ditemukan.' };

    const { data: code } = await sb
      .from('school_codes')
      .select('code')
      .eq('code', student.school_code)
      .eq('owner_id', g.user_id)
      .maybeSingle();
    if (!code) return { error: 'Akses ditolak.' };

    const { error } = await sb
      .from('chat_messages')
      .insert({ request_id: requestId, sender_role: 'counselor', body });
    if (error) return { error: 'Gagal mengirim pesan.' };

    revalidatePath(`/guru/chat/${requestId}`);
    return { ok: true };
  } catch {
    return { error: 'Terjadi kesalahan.' };
  }
}

/** Ambil semua pesan untuk satu request (server-side, untuk SSR awal) */
export async function getMessages(requestId: string) {
  try {
    const { data } = await admin()
      .from('chat_messages')
      .select('id, sender_role, body, created_at')
      .eq('request_id', requestId)
      .order('created_at', { ascending: true })
      .limit(200);
    return (data ?? []) as Array<{
      id: string;
      sender_role: 'student' | 'counselor';
      body: string;
      created_at: string;
    }>;
  } catch {
    return [];
  }
}
