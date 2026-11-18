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
  try {
    const sb = await supabaseAuth();
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error || !data.user) return { error: 'Email atau kata sandi salah.' };
    const { data: a, error: dbErr } = await admin().from('admins').select('user_id').eq('user_id', data.user.id).maybeSingle();
    if (dbErr) {
      console.error('[loginAdmin] Supabase error:', dbErr.message);
      return { error: 'Gagal memverifikasi akun admin.' };
    }
    if (!a) {
      await sb.auth.signOut();
      return { error: 'Akun ini bukan akun admin.' };
    }
  } catch (err) {
    console.error('[loginAdmin] Unexpected error:', err);
    return { error: 'Terjadi kesalahan saat masuk. Coba lagi.' };
  }
  redirect('/admin');
}

export async function logoutAdmin() {
  try {
    const sb = await supabaseAuth();
    await sb.auth.signOut();
  } catch (err) {
    console.error('[logoutAdmin] Gagal keluar:', err);
  }
  redirect('/admin/masuk');
}

/* ── Site content ── */
export async function saveContent(f: FormData) {
  await requireAdmin();
  try {
    const sb = admin();
    const entries = Array.from(f.entries()).filter(([k]) => k.startsWith('content_'));
    for (const [k, v] of entries) {
      const key = k.replace('content_', '');
      await sb.from('site_content').upsert({ key, value: String(v).trim(), updated_at: new Date().toISOString() });
    }
    revalidatePath('/');
    revalidatePath('/siswa/strategi');
    revalidatePath('/admin');
  } catch (err) {
    console.error('[saveContent] Gagal menyimpan konten:', err);
  }
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

  try {
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
    for (let i = 0; i < 6; i++) {
      const bytes = randomBytes(4);
      const code = 'RSB-' + Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
      const { error: codeErr } = await sb.from('school_codes').insert({ code, owner_id: authData.user.id, note: `Kode awal — ${school}` });
      if (!codeErr) break;
    }

    revalidatePath('/admin');
  } catch (err) {
    console.error('[addCounselor] Unexpected error:', err);
    return { error: 'Terjadi kesalahan saat menambahkan guru BK.' };
  }
  redirect('/admin?tab=guru&ok=1');
}

export async function deleteCounselor(f: FormData) {
  await requireAdmin();
  const userId = txt(f, 'user_id', 60);
  if (!userId) return;
  try {
    const sb = admin();
    // Hapus siswa yang terhubung ke kode sekolah milik guru ini terlebih dahulu (mencegah FK error)
    const { data: codes } = await sb.from('school_codes').select('code').eq('owner_id', userId);
    const codeList = (codes ?? []).map((c) => c.code as string);
    if (codeList.length > 0) {
      await sb.from('students').delete().in('school_code', codeList);
      await sb.from('school_codes').delete().in('code', codeList);
    }
    // Hapus auth user (cascade ke counselors)
    await sb.auth.admin.deleteUser(userId);
    revalidatePath('/admin');
  } catch (err) {
    console.error('[deleteCounselor] Gagal menghapus guru BK:', err);
  }
}

export async function deleteStudent(f: FormData) {
  await requireAdmin();
  const id = txt(f, 'id', 60);
  if (!id) return;
  try {
    await admin().from('students').delete().eq('id', id);
    revalidatePath('/admin');
  } catch (err) {
    console.error('[deleteStudent] Gagal menghapus siswa:', err);
  }
}

export async function deleteAllStudents(f: FormData) {
  await requireAdmin();
  const code = txt(f, 'code', 20);
  if (!code) return;
  try {
    // Hapus semua siswa dari kode sekolah tertentu
    await admin().from('students').delete().eq('school_code', code);
    revalidatePath('/admin');
  } catch (err) {
    console.error('[deleteAllStudents] Gagal menghapus siswa per kode:', err);
  }
}
