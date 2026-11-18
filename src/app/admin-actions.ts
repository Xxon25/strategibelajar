'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { admin } from '@/lib/supabase-admin';
import { supabaseAuth } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/session';
import type { FormState } from './actions';

const txt = (f: FormData, k: string, max: number) => String(f.get(k) ?? '').trim().slice(0, max);

/* ── Auth ── */
export async function loginAdmin(_: FormState, f: FormData): Promise<FormState> {
  const email = txt(f, 'email', 200).toLowerCase();
  const password = String(f.get('password') ?? '');
  if (!email || !password) return { error: 'Isi email dan kata sandi.' };
  const sb = await supabaseAuth();
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error || !data.user) return { error: 'Email atau kata sandi salah.' };
  const { data: a } = await admin().from('admins').select('user_id').eq('user_id', data.user.id).maybeSingle();
  if (!a) {
    await sb.auth.signOut();
    return { error: 'Akun ini bukan akun admin.' };
  }
  redirect('/admin');
}

export async function logoutAdmin() {
  const sb = await supabaseAuth();
  await sb.auth.signOut();
  redirect('/admin/masuk');
}

/* ── Site content ── */
export async function saveContent(f: FormData) {
  await requireAdmin();
  const sb = admin();
  const entries = Array.from(f.entries()).filter(([k]) => k.startsWith('content_'));
  for (const [k, v] of entries) {
    const key = k.replace('content_', '');
    await sb.from('site_content').upsert({ key, value: String(v).trim(), updated_at: new Date().toISOString() });
  }
  revalidatePath('/');
  revalidatePath('/admin');
  redirect('/admin?tab=konten&ok=1');
}

/* ── Guru BK management ── */
export async function addCounselor(_: FormState, f: FormData): Promise<FormState> {
  await requireAdmin();
  const email = txt(f, 'email', 200).toLowerCase();
  const password = txt(f, 'password', 100);
  const name = txt(f, 'name', 80);
  const school = txt(f, 'school', 100);
  if (!email || !password || !name || !school) return { error: 'Semua kolom wajib diisi.' };
  if (password.length < 6) return { error: 'Kata sandi minimal 6 karakter.' };

  const sb = admin();
  // Buat user Supabase Auth
  const { data: authData, error: authErr } = await sb.auth.admin.createUser({
    email, password, email_confirm: true,
  });
  if (authErr || !authData.user) return { error: `Gagal membuat akun: ${authErr?.message}` };

  // Insert ke counselors
  const { error: dbErr } = await sb.from('counselors').insert({
    user_id: authData.user.id, name, school_name: school,
  });
  if (dbErr) {
    await sb.auth.admin.deleteUser(authData.user.id);
    return { error: 'Gagal menyimpan data guru BK.' };
  }

  // Buat kode sekolah awal otomatis
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const { randomBytes } = await import('crypto');
  const bytes = randomBytes(4);
  const code = 'RSB-' + Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
  await sb.from('school_codes').insert({ code, owner_id: authData.user.id, note: `Kode awal — ${school}` });

  revalidatePath('/admin');
  redirect('/admin?tab=guru&ok=1');
}

export async function deleteCounselor(f: FormData) {
  await requireAdmin();
  const userId = txt(f, 'user_id', 60);
  if (!userId) return;
  // Hapus auth user (cascade ke counselors)
  await admin().auth.admin.deleteUser(userId);
  revalidatePath('/admin');
}

export async function deleteStudent(f: FormData) {
  await requireAdmin();
  const id = txt(f, 'id', 60);
  if (!id) return;
  await admin().from('students').delete().eq('id', id);
  revalidatePath('/admin');
}

export async function deleteAllStudents(f: FormData) {
  await requireAdmin();
  const code = txt(f, 'code', 20);
  if (!code) return;
  // Hapus semua siswa dari kode sekolah tertentu
  await admin().from('students').delete().eq('school_code', code);
  revalidatePath('/admin');
}
