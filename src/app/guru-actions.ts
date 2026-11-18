'use server';

import { redirect } from 'next/navigation';
import { revalidatePath, revalidateTag } from 'next/cache';
import { randomBytes } from 'crypto';
import { admin } from '@/lib/supabase-admin';
import { supabaseAuth } from '@/lib/supabase-server';
import { requireGuru } from '@/lib/session';
import { STATUSES } from '@/lib/constants';
import type { FormState } from './actions';

const txt = (f: FormData, k: string, max: number) => String(f.get(k) ?? '').trim().slice(0, max);

export async function loginGuru(_: FormState, f: FormData): Promise<FormState> {
  const email = txt(f, 'email', 200).toLowerCase();
  const password = String(f.get('password') ?? '');
  if (!email || !password) return { error: 'Isi email dan kata sandi.' };
  try {
    const sb = await supabaseAuth();
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error || !data.user) return { error: 'Email atau kata sandi salah.' };
    const { data: c, error: dbErr } = await admin().from('counselors').select('user_id').eq('user_id', data.user.id).maybeSingle();
    if (dbErr) {
      console.error('[loginGuru] Supabase error:', dbErr.message);
      return { error: 'Gagal memverifikasi akun guru BK.' };
    }
    if (!c) {
      await sb.auth.signOut();
      return { error: 'Akun ini bukan akun guru BK.' };
    }
  } catch (err) {
    console.error('[loginGuru] Unexpected error:', err);
    return { error: 'Terjadi kesalahan saat masuk. Coba lagi.' };
  }
  redirect('/guru');
}

export async function logoutGuru() {
  try {
    const sb = await supabaseAuth();
    await sb.auth.signOut();
  } catch (err) {
    console.error('[logoutGuru] Gagal keluar:', err);
  }
  redirect('/');
}

// Pastikan siswa tersebut memakai salah satu kode milik guru yang sedang login.
async function ownsStudent(ownerId: string, studentId: string) {
  try {
    const sb = admin();
    const { data: s } = await sb.from('students').select('school_code').eq('id', studentId).maybeSingle();
    if (!s) return false;
    const { data: c } = await sb.from('school_codes').select('code').eq('code', s.school_code).eq('owner_id', ownerId).maybeSingle();
    return !!c;
  } catch (err) {
    console.error('[ownsStudent] Error:', err);
    return false;
  }
}

export async function setRequestStatus(f: FormData) {
  const g = await requireGuru();
  const id = txt(f, 'id', 60);
  const status = txt(f, 'status', 20);
  if (!(STATUSES as readonly string[]).includes(status)) return;
  try {
    const sb = admin();
    const { data: r } = await sb.from('consult_requests').select('student_id').eq('id', id).maybeSingle();
    if (!r || !(await ownsStudent(g.user_id, r.student_id))) return;
    await sb.from('consult_requests').update({ status }).eq('id', id);
    revalidatePath('/guru');
    revalidatePath('/siswa/bantuan');
  } catch (err) {
    console.error('[setRequestStatus] Error:', err);
  }
}

export async function newCode(f: FormData) {
  const g = await requireGuru();
  const note = txt(f, 'note', 80) || 'Dibuat hari ini';
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  try {
    for (let i = 0; i < 6; i++) {
      const bytes = randomBytes(4);
      const code = 'RSB-' + Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
      const { error } = await admin().from('school_codes').insert({ code, owner_id: g.user_id, note });
      if (!error) break;
    }
    revalidatePath('/guru');
  } catch (err) {
    console.error('[newCode] Error:', err);
  }
}

export async function toggleCode(f: FormData) {
  const g = await requireGuru();
  const code = txt(f, 'code', 12);
  try {
    const sb = admin();
    const { data: c } = await sb.from('school_codes').select('active').eq('code', code).eq('owner_id', g.user_id).maybeSingle();
    if (!c) return;
    await sb.from('school_codes').update({ active: !c.active }).eq('code', code).eq('owner_id', g.user_id);
    revalidatePath('/guru');
  } catch (err) {
    console.error('[toggleCode] Error:', err);
  }
}

export async function addSlot(f: FormData) {
  const g = await requireGuru();
  const label = txt(f, 'label', 80);
  if (!label) return;
  try {
    await admin().from('consult_slots').insert({ owner_id: g.user_id, label });
    revalidateTag('consult-slots');
    revalidatePath('/guru');
    revalidatePath('/siswa/bantuan');
  } catch (err) {
    console.error('[addSlot] Error:', err);
  }
}

export async function toggleSlot(f: FormData) {
  const g = await requireGuru();
  const id = txt(f, 'id', 60);
  try {
    const sb = admin();
    const { data: s } = await sb.from('consult_slots').select('active').eq('id', id).eq('owner_id', g.user_id).maybeSingle();
    if (!s) return;
    await sb.from('consult_slots').update({ active: !s.active }).eq('id', id).eq('owner_id', g.user_id);
    revalidateTag('consult-slots');
    revalidatePath('/guru');
    revalidatePath('/siswa/bantuan');
  } catch (err) {
    console.error('[toggleSlot] Error:', err);
  }
}
