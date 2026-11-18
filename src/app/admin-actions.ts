'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath, revalidateTag } from 'next/cache';
import { randomBytes } from 'crypto';
import { admin } from '@/lib/supabase-admin';
import { supabaseAuth } from '@/lib/supabase-server';
import { requireAdmin, PREVIEW_GURU_COOKIE, PREVIEW_STUDENT_COOKIE, signPreviewId, hash } from '@/lib/session';
import { STATUSES } from '@/lib/constants';
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
    const store = await cookies();
    store.delete(PREVIEW_GURU_COOKIE);
    store.delete(PREVIEW_STUDENT_COOKIE);
    const sb = await supabaseAuth();
    await sb.auth.signOut();
  } catch (err) {
    console.error('[logoutAdmin] Gagal keluar:', err);
  }
  redirect('/admin/masuk');
}

/* ── Admin Preview Mode (Lihat View Guru & View Siswa) ── */
export async function previewGuru(f: FormData) {
  await requireAdmin();
  const userId = txt(f, 'user_id', 60);
  if (!userId) redirect('/admin?tab=view');
  const store = await cookies();
  store.set(PREVIEW_GURU_COOKIE, signPreviewId(userId), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 12,
  });
  redirect('/guru');
}

export async function previewStudent(f: FormData) {
  await requireAdmin();
  const studentId = txt(f, 'student_id', 60);
  if (!studentId) redirect('/admin?tab=view');
  const store = await cookies();
  store.set(PREVIEW_STUDENT_COOKIE, signPreviewId(studentId), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 12,
  });
  redirect('/siswa');
}

export async function createDemoStudent() {
  await requireAdmin();
  let demoId: string | null = null;
  try {
    const sb = admin();
    // Cari kode sekolah aktif pertama
    const { data: activeCode } = await sb.from('school_codes').select('code').eq('active', true).limit(1).maybeSingle();
    const { data: anyCode } = !activeCode
      ? await sb.from('school_codes').select('code').limit(1).maybeSingle()
      : { data: activeCode };
    if (!anyCode) redirect('/admin?tab=guru');

    // Cek apakah sudah ada siswa demo
    const { data: existing } = await sb
      .from('students')
      .select('id')
      .eq('nickname', 'Siswa Demo')
      .eq('school_code', anyCode.code)
      .maybeSingle();

    if (existing) {
      demoId = existing.id;
    } else {
      const token = randomBytes(32).toString('hex');
      const { data: created, error } = await sb
        .from('students')
        .insert({
          token_hash: hash(token),
          nickname: 'Siswa Demo',
          class: 'XI',
          school_code: anyCode.code,
          consent_at: new Date().toISOString(),
          share_summary: true,
          include_reflection: true,
        })
        .select('id')
        .single();
      if (!error && created) {
        demoId = created.id;
        await sb.from('student_plans').insert({
          student_id: created.id,
          habits_done: ['h1', 'h3'],
          habit_focus: 'h4',
          goal: 'Minggu ini aku berlatih menjawab 5 soal tanpa melihat catatan setiap Selasa dan Kamis pukul 19.00.',
          sched_topic: 'Biologi — Sel & Jaringan',
          sched_start: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }),
          strategies: ['recall', 'spaced'],
          focus_notif: 'Mode senyap selama 30 menit belajar',
          focus_place: 'Meja belajar di kamar',
          focus_tools: 'Buku catatan, latihan soal, air minum',
        });
      }
    }
  } catch (err) {
    console.error('[createDemoStudent] Gagal menyiapkan siswa demo:', err);
  }
  if (!demoId) redirect('/admin?tab=view');
  const store = await cookies();
  store.set(PREVIEW_STUDENT_COOKIE, signPreviewId(demoId), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 12,
  });
  redirect('/siswa');
}

export async function exitPreview(f: FormData) {
  const to = txt(f, 'to', 60) || '/admin';
  try {
    const store = await cookies();
    store.delete(PREVIEW_GURU_COOKIE);
    store.delete(PREVIEW_STUDENT_COOKIE);
  } catch (err) {
    console.error('[exitPreview] Error:', err);
  }
  redirect(to.startsWith('/') ? to : '/admin');
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
    revalidateTag('site-content');
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
    const { data: authData, error: authErr } = await sb.auth.admin.createUser({
      email, password, email_confirm: true,
    });
    if (authErr || !authData.user) return { error: `Gagal membuat akun: ${authErr?.message}` };

    const { error: dbErr } = await sb.from('counselors').insert({
      user_id: authData.user.id, name, school_name: school,
    });
    if (dbErr) {
      await sb.auth.admin.deleteUser(authData.user.id);
      return { error: 'Gagal menyimpan data guru BK.' };
    }

    const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
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
    const { data: codes } = await sb.from('school_codes').select('code').eq('owner_id', userId);
    const codeList = (codes ?? []).map((c) => c.code as string);
    if (codeList.length > 0) {
      await sb.from('students').delete().in('school_code', codeList);
      await sb.from('school_codes').delete().in('code', codeList);
    }
    await sb.auth.admin.deleteUser(userId);
    revalidatePath('/admin');
  } catch (err) {
    console.error('[deleteCounselor] Gagal menghapus guru BK:', err);
  }
}

/* ── Admin: Kelola Kode Sekolah & Jadwal & Konsultasi ── */
export async function adminNewCode(f: FormData) {
  await requireAdmin();
  const ownerId = txt(f, 'owner_id', 60);
  const note = txt(f, 'note', 80) || 'Dibuat oleh Admin';
  if (!ownerId) return;
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  try {
    for (let i = 0; i < 6; i++) {
      const bytes = randomBytes(4);
      const code = 'RSB-' + Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
      const { error } = await admin().from('school_codes').insert({ code, owner_id: ownerId, note });
      if (!error) break;
    }
    revalidatePath('/admin');
    revalidatePath('/guru');
  } catch (err) {
    console.error('[adminNewCode] Error:', err);
  }
}

export async function adminToggleCode(f: FormData) {
  await requireAdmin();
  const code = txt(f, 'code', 12);
  if (!code) return;
  try {
    const sb = admin();
    const { data: c } = await sb.from('school_codes').select('active').eq('code', code).maybeSingle();
    if (!c) return;
    await sb.from('school_codes').update({ active: !c.active }).eq('code', code);
    revalidatePath('/admin');
    revalidatePath('/guru');
  } catch (err) {
    console.error('[adminToggleCode] Error:', err);
  }
}

export async function adminAddSlot(f: FormData) {
  await requireAdmin();
  const ownerId = txt(f, 'owner_id', 60);
  const label = txt(f, 'label', 80);
  if (!ownerId || !label) return;
  try {
    await admin().from('consult_slots').insert({ owner_id: ownerId, label });
    revalidateTag('consult-slots');
    revalidatePath('/admin');
    revalidatePath('/guru');
    revalidatePath('/siswa/bantuan');
  } catch (err) {
    console.error('[adminAddSlot] Error:', err);
  }
}

export async function adminToggleSlot(f: FormData) {
  await requireAdmin();
  const id = txt(f, 'id', 60);
  if (!id) return;
  try {
    const sb = admin();
    const { data: s } = await sb.from('consult_slots').select('active').eq('id', id).maybeSingle();
    if (!s) return;
    await sb.from('consult_slots').update({ active: !s.active }).eq('id', id);
    revalidateTag('consult-slots');
    revalidatePath('/admin');
    revalidatePath('/guru');
    revalidatePath('/siswa/bantuan');
  } catch (err) {
    console.error('[adminToggleSlot] Error:', err);
  }
}

export async function adminSetRequestStatus(f: FormData) {
  await requireAdmin();
  const id = txt(f, 'id', 60);
  const status = txt(f, 'status', 20);
  if (!id || !(STATUSES as readonly string[]).includes(status)) return;
  try {
    await admin().from('consult_requests').update({ status }).eq('id', id);
    revalidatePath('/admin');
    revalidatePath('/guru');
    revalidatePath('/siswa/bantuan');
  } catch (err) {
    console.error('[adminSetRequestStatus] Error:', err);
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
    await admin().from('students').delete().eq('school_code', code);
    revalidatePath('/admin');
  } catch (err) {
    console.error('[deleteAllStudents] Gagal menghapus siswa per kode:', err);
  }
}
