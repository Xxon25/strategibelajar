'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { randomBytes } from 'crypto';
import { admin } from '@/lib/supabase-admin';
import { STUDENT_COOKIE, hash, getStudent, type Student } from '@/lib/session';
import { CLASSES, CRISIS, HABIT_IDS, STRATEGY_IDS, QUIZ, isBarrier } from '@/lib/constants';
import { fmtDate, todayJakarta } from '@/lib/util';

export type FormState = { error?: string } | undefined;

const txt = (f: FormData, k: string, max: number) => String(f.get(k) ?? '').trim().slice(0, max);

async function me(opts?: { consent?: boolean }): Promise<Student> {
  const s = await getStudent();
  if (!s) redirect('/');
  if (opts?.consent !== false && !s.consent_at) redirect('/siswa');
  return s;
}

async function markDay(id: string) {
  try {
    await admin().from('practice_days').upsert({ student_id: id, day: todayJakarta() });
  } catch (err) {
    console.error('[markDay] Gagal mencatat hari berlatih:', err);
  }
}

async function upsertPlan(id: string, patch: Record<string, unknown>) {
  const { error } = await admin()
    .from('student_plans')
    .upsert({ student_id: id, ...patch, updated_at: new Date().toISOString() });
  if (error) {
    console.error('[upsertPlan] Supabase error:', error.message);
    throw error;
  }
}

export async function registerStudent(_: FormState, f: FormData): Promise<FormState> {
  const nick = txt(f, 'nick', 20);
  const cls = txt(f, 'cls', 3);
  const code = txt(f, 'code', 12).toUpperCase();
  if (!nick) return { error: 'Isi nama panggilanmu dulu.' };
  if (!(CLASSES as readonly string[]).includes(cls)) return { error: 'Pilih kelasmu dulu.' };
  try {
    const sb = admin();
    const { data: c, error: codeErr } = await sb.from('school_codes').select('code').eq('code', code).eq('active', true).maybeSingle();
    if (codeErr) {
      console.error('[registerStudent] Gagal memeriksa kode sekolah:', codeErr.message);
      return { error: 'Gagal memeriksa kode sekolah. Coba lagi.' };
    }
    if (!c) return { error: 'Kode sekolah tidak ditemukan atau sudah nonaktif. Minta kode ke guru BK.' };
    const token = randomBytes(32).toString('hex');
    const { data: s, error } = await sb
      .from('students')
      .insert({ token_hash: hash(token), nickname: nick, class: cls, school_code: code })
      .select('id')
      .single();
    if (error || !s) {
      console.error('[registerStudent] Gagal mendaftarkan siswa:', error?.message);
      return { error: 'Gagal mendaftar. Coba lagi.' };
    }
    await sb.from('student_plans').insert({ student_id: s.id });
    (await cookies()).set(STUDENT_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 180,
    });
  } catch (err) {
    console.error('[registerStudent] Unexpected error:', err);
    return { error: 'Terjadi kesalahan saat mendaftar. Coba lagi.' };
  }
  redirect('/siswa');
}

export async function giveConsent(f: FormData) {
  const s = await me({ consent: false });
  if (f.get('agree') !== 'on') redirect('/siswa?err=agree');
  try {
    const { error } = await admin().from('students').update({ consent_at: new Date().toISOString() }).eq('id', s.id);
    if (error) {
      console.error('[giveConsent] Supabase error:', error.message);
      redirect('/siswa?err=umum');
    }
  } catch (err) {
    console.error('[giveConsent] Unexpected error:', err);
  }
  redirect('/siswa/kebiasaan');
}

export async function saveHabits(f: FormData) {
  const s = await me();
  const done = f.getAll('done').map(String).filter((x) => HABIT_IDS.includes(x));
  const focus = String(f.get('focus') ?? '');
  try {
    await upsertPlan(s.id, { habits_done: done, habit_focus: HABIT_IDS.includes(focus) ? focus : '' });
    await markDay(s.id);
  } catch (err) {
    console.error('[saveHabits] Gagal menyimpan kebiasaan:', err);
    redirect('/siswa/kebiasaan?err=umum');
  }
  redirect('/siswa/kebiasaan?ok=kebiasaan');
}

export async function saveGoal(f: FormData) {
  const s = await me();
  const goal = txt(f, 'goal', 500);
  if (!goal) redirect('/siswa/tujuan?err=tujuan');
  try {
    await upsertPlan(s.id, { goal });
    await markDay(s.id);
  } catch (err) {
    console.error('[saveGoal] Gagal menyimpan tujuan:', err);
    redirect('/siswa/tujuan?err=umum');
  }
  redirect('/siswa/tujuan?ok=tujuan');
}

export async function saveSchedule(f: FormData) {
  const s = await me();
  const start = txt(f, 'start', 10);
  if (!fmtDate(start)) redirect('/siswa/waktu?err=tanggal');
  try {
    await upsertPlan(s.id, { sched_start: start, sched_topic: txt(f, 'topic', 60) });
    await markDay(s.id);
  } catch (err) {
    console.error('[saveSchedule] Gagal menyimpan jadwal:', err);
    redirect('/siswa/waktu?err=umum');
  }
  redirect('/siswa/waktu?ok=jadwal');
}

export async function saveStrategies(f: FormData) {
  const s = await me();
  const picks = f.getAll('s').map(String).filter((x) => STRATEGY_IDS.includes(x));
  try {
    await upsertPlan(s.id, { strategies: picks });
  } catch (err) {
    console.error('[saveStrategies] Gagal menyimpan strategi:', err);
    redirect('/siswa/strategi?err=umum');
  }
  redirect('/siswa/strategi?ok=strategi');
}

export async function saveQuiz(score: number, total: number) {
  const s = await me();
  if (!Number.isInteger(score) || total !== QUIZ.length || score < 0 || score > total) return;
  try {
    await admin().from('quiz_attempts').insert({ student_id: s.id, score, total });
    await markDay(s.id);
    revalidatePath('/siswa/strategi');
    revalidatePath('/siswa');
  } catch (err) {
    console.error('[saveQuiz] Gagal menyimpan skor kuis:', err);
  }
}

export async function saveFocus(f: FormData) {
  const s = await me();
  try {
    await upsertPlan(s.id, {
      focus_notif: txt(f, 'notif', 300),
      focus_place: txt(f, 'place', 300),
      focus_tools: txt(f, 'tools', 300),
    });
    await markDay(s.id);
  } catch (err) {
    console.error('[saveFocus] Gagal menyimpan rencana fokus:', err);
    redirect('/siswa/fokus?err=umum');
  }
  redirect('/siswa/fokus?ok=fokus');
}

export async function saveReflection(f: FormData) {
  const s = await me();
  const r1 = txt(f, 'r1', 1000);
  const r2 = txt(f, 'r2', 1000);
  const r3 = txt(f, 'r3', 1000);
  if (!(r1 + r2 + r3).trim()) redirect('/siswa/refleksi?err=kosong');
  const barrier = String(f.get('barrier') ?? '');
  if (!isBarrier(barrier)) redirect('/siswa/refleksi?err=barrier');
  let flag = false;
  try {
    const { data: plan } = await admin().from('student_plans').select('goal').eq('student_id', s.id).maybeSingle();
    flag = CRISIS.test(`${r1} ${r2} ${r3} ${plan?.goal ?? ''}`);
    const { error } = await admin().from('reflections').insert({ student_id: s.id, r1, r2, r3, barrier, support_flag: flag });
    if (error) {
      console.error('[saveReflection] Supabase error:', error.message);
      redirect('/siswa/refleksi?err=umum');
    }
    await markDay(s.id);
  } catch (err) {
    console.error('[saveReflection] Unexpected error:', err);
    redirect('/siswa/refleksi?err=umum');
  }
  redirect(`/siswa/refleksi?ok=${flag ? 'support' : 'refleksi'}`);
}

export async function saveShare(f: FormData) {
  const s = await me();
  const share = f.get('share') === '1';
  const include = share && f.get('include') === 'on';
  try {
    const { error } = await admin().from('students').update({ share_summary: share, include_reflection: include }).eq('id', s.id);
    if (error) {
      console.error('[saveShare] Supabase error:', error.message);
      redirect('/siswa/bantuan?err=umum');
    }
  } catch (err) {
    console.error('[saveShare] Unexpected error:', err);
    redirect('/siswa/bantuan?err=umum');
  }
  redirect('/siswa/bantuan?ok=share');
}

export async function requestConsult(f: FormData) {
  const s = await me();
  const slotId = txt(f, 'slot', 60);
  if (!slotId) redirect('/siswa/bantuan?err=slot');
  let errKey: string | null = null;
  try {
    const sb = admin();
    const { data: code } = await sb.from('school_codes').select('owner_id').eq('code', s.school_code).maybeSingle();
    const { data: slot } = code
      ? await sb.from('consult_slots').select('label').eq('id', slotId).eq('owner_id', code.owner_id).eq('active', true).maybeSingle()
      : { data: null };
    if (!slot) {
      errKey = 'slot';
    } else {
      const { data: open } = await sb.from('consult_requests').select('id').eq('student_id', s.id).neq('status', 'Selesai').limit(1);
      if (open && open.length) {
        errKey = 'ada';
      } else {
        const { error } = await sb.from('consult_requests').insert({ student_id: s.id, slot_label: slot.label });
        if (error) {
          console.error('[requestConsult] Supabase error:', error.message);
          errKey = 'umum';
        }
      }
    }
  } catch (err) {
    console.error('[requestConsult] Unexpected error:', err);
    errKey = 'umum';
  }
  if (errKey) redirect(`/siswa/bantuan?err=${errKey}`);
  redirect('/siswa/bantuan?ok=konsul');
}

export async function logoutStudent() {
  (await cookies()).delete(STUDENT_COOKIE);
  redirect('/?ok=keluar');
}

export async function deleteMyData() {
  const s = await me({ consent: false });
  try {
    await admin().from('students').delete().eq('id', s.id);
  } catch (err) {
    console.error('[deleteMyData] Gagal menghapus data siswa:', err);
  }
  (await cookies()).delete(STUDENT_COOKIE);
  redirect('/?ok=hapus');
}
