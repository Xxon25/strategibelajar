'use server';

import { revalidatePath } from 'next/cache';
import { admin } from '@/lib/supabase-admin';
import { getStudent, getGuru } from '@/lib/session';
import { appendChatMessage, getChatMessages } from '@/lib/chat';

const txt = (f: FormData, k: string, max: number) =>
  String(f.get(k) ?? '').trim().slice(0, max);

export type ChatActionResult = {
  ok?: boolean;
  error?: string;
  message?: {
    id: string;
    sender_role: 'student' | 'counselor';
    body: string;
    created_at: string;
  };
};

/** Siswa mengirim pesan (disimpan ke consult_messages agar sinkron dengan live chat Guru BK) */
export async function sendStudentMessage(f: FormData): Promise<ChatActionResult> {
  const s = await getStudent();
  if (!s) return { error: 'Sesi tidak ditemukan.' };

  const requestId = txt(f, 'request_id', 60);
  const body = txt(f, 'body', 1000);
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

    const saved = await appendChatMessage({
      requestId,
      senderRole: 'siswa',
      senderName: s.nickname,
      message: body,
    });
    if (!saved) return { error: 'Gagal mengirim pesan.' };

    revalidatePath(`/siswa/chat/${requestId}`);
    return {
      ok: true,
      message: {
        id: saved.id,
        sender_role: 'student',
        body: saved.message,
        created_at: saved.created_at,
      },
    };
  } catch (err) {
    console.error('[sendStudentMessage] Error:', err);
    return { error: 'Terjadi kesalahan.' };
  }
}

/** Guru BK mengirim pesan (disimpan ke consult_messages agar sinkron dengan live chat Siswa) */
export async function sendGuruMessage(f: FormData): Promise<ChatActionResult> {
  const g = await getGuru();
  if (!g) return { error: 'Sesi guru tidak ditemukan.' };

  const requestId = txt(f, 'request_id', 60);
  const body = txt(f, 'body', 1000);
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

    const saved = await appendChatMessage({
      requestId,
      senderRole: 'guru',
      senderName: g.name,
      message: body,
    });
    if (!saved) return { error: 'Gagal mengirim pesan.' };

    revalidatePath(`/guru/chat/${requestId}`);
    return {
      ok: true,
      message: {
        id: saved.id,
        sender_role: 'counselor',
        body: saved.message,
        created_at: saved.created_at,
      },
    };
  } catch (err) {
    console.error('[sendGuruMessage] Error:', err);
    return { error: 'Terjadi kesalahan.' };
  }
}

/** Ambil semua pesan untuk satu request dari consult_messages (server-side, untuk SSR awal) */
export async function getMessages(requestId: string) {
  try {
    const msgs = await getChatMessages(requestId);
    return msgs.map((m) => ({
      id: m.id,
      sender_role: (m.sender_role === 'guru' ? 'counselor' : 'student') as 'student' | 'counselor',
      body: m.message,
      created_at: m.created_at,
    }));
  } catch {
    return [];
  }
}
