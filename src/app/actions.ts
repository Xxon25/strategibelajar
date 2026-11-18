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
  await admin().from('practice_days').upsert({ student_id: id, day: todayJakarta() });
}

async function upsertPlan(id: string, patch: Record<string, unknown>) {
  await admin()
    .from('student_plans')
    .upsert({ student_id: id, ...patch, updated_at: new Date().toISOString() });
}

export async function registerStudent(_: FormState, f: FormData): Promise<FormState> {
  const nick = txt(f, 'nick', 20);
  const cls = txt(f, 'cls', 3);
  const code = txt(f, 'code', 12).toUpperCase();
  if (!nick) return { error: 'Isi nama panggilanmu dulu.' };
  if (!(CLASSES as readonly string[]).includes(cls)) return { error: 'Pilih kelasmu dulu.' };
  const sb = admin();
  const { data: c } = await sb.from('school_codes').select('code').eq('code', code).eq('active', true).maybeSingle();
  if (!c) return { error: 'Kode sekolah tidak ditemukan atau sudah nonaktif. Minta kode ke guru BK.' };
  const token = randomBytes(32).toString('hex');
  const { data: s, error } = await sb
    .from('students')
    .insert({ token_hash: hash(token), nickname: nick, class: cls, school_code: code })
    .select('id')
    .single();
  if (error || !s) return { error: 'Gagal mendaftar. Coba lagi.' };
  await sb.from('student_plans').insert({ student_id: s.id });
  (await cookies()).set(STUDENT_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 180,
  });
  redirect('/siswa');
}

export async function giveConsent(f: FormData) {
  const s = await me({ consent: false });
  if (f.get('agree') !== 'on') redirect('/siswa?err=agree');
  await admin().from('students').update({ consent_at: new Date().toISOString() }).eq('id', s.id);
  redirect('/siswa/kebiasaan');
}

export async function saveHabits(f: FormData) {
  const s = await me();
  const done = f.getAll('done').map(String).filter((x) => HABIT_IDS.includes(x));
  const focus = String(f.get('focus') ?? '');
  await upsertPlan(s.id, { habits_done: done, habit_focus: HABIT_IDS.includes(focus) ? focus : '' });
  await markDay(s.id);
  redirect('/siswa/kebiasaan?ok=kebiasaan');
}

export async function saveGoal(f: FormData) {
  const s = await me();
  const goal = txt(f, 'goal', 500);
  if (!goal) redirect('/siswa/tujuan?err=tujuan');
  await upsertPlan(s.id, { goal });
  await markDay(s.id);
  redirect('/siswa/tujuan?ok=tujuan');
}

export async function saveSchedule(f: FormData) {
  const s = await me();
  const start = txt(f, 'start', 10);
  if (!fmtDate(start)) redirect('/siswa/waktu?err=tanggal');
  await upsertPlan(s.id, { sched_start: start, sched_topic: txt(f, 'topic', 60) });
  await markDay(s.id);
  redirect('/siswa/waktu?ok=jadwal');
}

export async function saveStrategies(f: FormData) {
  const s = await me();
  const picks = f.getAll('s').map(String).filter((x) => STRATEGY_IDS.includes(x));
  await upsertPlan(s.id, { strategies: picks });
  redirect('/siswa/strategi?ok=strategi');
}

export async function saveQuiz(score: number, total: number) {
  const s = await me();
  if (!Number.isInteger(score) || total !== QUIZ.length || score < 0 || score > total) return;
  await admin().from('quiz_attempts').insert({ student_id: s.id, score, total });
  await markDay(s.id);
  revalidatePath('/siswa/strategi');
  revalidatePath('/siswa');
}

export async function saveFocus(f: FormData) {
  const s = await me();
  await upsertPlan(s.id, {
    focus_notif: txt(f, 'notif', 300),
    focus_place: txt(f, 'place', 300),
    focus_tools: txt(f, 'tools', 300),
  });
  await markDay(s.id);
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
  const { data: plan } = await admin().from('student_plans').select('goal').eq('student_id', s.id).maybeSingle();
  const flag = CRISIS.test(`${r1} ${r2} ${r3} ${plan?.goal ?? ''}`);
  const { error } = await admin().from('reflections').insert({ student_id: s.id, r1, r2, r3, barrier, support_flag: flag });
  if (error) redirect('/siswa/refleksi?err=umum');
  await markDay(s.id);
  redirect(`/siswa/refleksi?ok=${flag ? 'support' : 'refleksi'}`);
}

export async function saveShare(f: FormData) {
  const s = await me();
  const share = f.get('share') === '1';
  const include = share && f.get('include') === 'on';
  await admin().from('students').update({ share_summary: share, include_reflection: include }).eq('id', s.id);
  redirect('/siswa/bantuan?ok=share');
}

export async function requestConsult(f: FormData) {
  const s = await me();
  const slotId = txt(f, 'slot', 60);
  if (!slotId) redirect('/siswa/bantuan?err=slot');
  const sb = admin();
  const { data: code } = await sb.from('school_codes').select('owner_id').eq('code', s.school_code).maybeSingle();
  const { data: slot } = code
    ? await sb.from('consult_slots').select('label').eq('id', slotId).eq('owner_id', code.owner_id).eq('active', true).maybeSingle()
    : { data: null };
  if (!slot) redirect('/siswa/bantuan?err=slot');
  const { data: open } = await sb.from('consult_requests').select('id').eq('student_id', s.id).neq('status', 'Selesai').limit(1);
  if (open && open.length) redirect('/siswa/bantuan?err=ada');
  await sb.from('consult_requests').insert({ student_id: s.id, slot_label: slot.label });
  redirect('/siswa/bantuan?ok=konsul');
}

export async function logoutStudent() {
  (await cookies()).delete(STUDENT_COOKIE);
  redirect('/?ok=keluar');
}

export async function deleteMyData() {
  const s = await me({ consent: false });
  await admin().from('students').delete().eq('id', s.id);
  (await cookies()).delete(STUDENT_COOKIE);
  redirect('/?ok=hapus');
}
