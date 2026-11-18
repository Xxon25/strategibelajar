import 'server-only';
import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { admin } from './supabase-admin';
import { todayJakarta } from './util';

export type Plan = {
  habits_done: string[];
  habit_focus: string;
  goal: string;
  sched_topic: string;
  sched_start: string | null;
  strategies: string[];
  focus_notif: string;
  focus_place: string;
  focus_tools: string;
};

export const EMPTY_PLAN: Plan = {
  habits_done: [],
  habit_focus: '',
  goal: '',
  sched_topic: '',
  sched_start: null,
  strategies: [],
  focus_notif: '',
  focus_place: '',
  focus_tools: '',
};

// Hanya ambil 1 tabel student_plans (untuk /siswa/kebiasaan, /tujuan, /waktu, /fokus) — 5x lebih ringan
export const studentPlan = cache(async (id: string): Promise<Plan> => {
  try {
    const { data } = await admin().from('student_plans').select('*').eq('student_id', id).maybeSingle();
    return { ...EMPTY_PLAN, ...(data ?? {}) } as Plan;
  } catch (err) {
    console.error('[studentPlan] Gagal memuat rencana siswa:', err);
    return { ...EMPTY_PLAN };
  }
});

// Hanya ambil plan + kuis terakhir (untuk /siswa/strategi)
export const studentStrategiData = cache(async (id: string) => {
  try {
    const sb = admin();
    const [plan, quiz] = await Promise.all([
      sb.from('student_plans').select('strategies').eq('student_id', id).maybeSingle(),
      sb.from('quiz_attempts').select('score,total').eq('student_id', id).order('created_at', { ascending: false }).limit(1),
    ]);
    return {
      strategies: ((plan.data?.strategies as string[] | undefined) ?? []),
      quiz: (quiz.data?.[0] ?? null) as { score: number; total: number } | null,
    };
  } catch (err) {
    console.error('[studentStrategiData] Error:', err);
    return { strategies: [] as string[], quiz: null };
  }
});

// Hanya ambil refleksi + hari berlatih (untuk /siswa/refleksi)
export const studentRefleksiData = cache(async (id: string) => {
  try {
    const sb = admin();
    const monthStart = todayJakarta().slice(0, 8) + '01';
    const [refl, days] = await Promise.all([
      sb.from('reflections').select('id,r1,r2,r3,barrier,support_flag,created_at').eq('student_id', id).order('created_at', { ascending: false }).limit(5),
      sb.from('practice_days').select('day').eq('student_id', id).gte('day', monthStart),
    ]);
    return {
      reflections: (refl.data ?? []) as Array<{ id: string; r1: string; r2: string; r3: string; barrier: 'tidak' | 'sedikit' | 'ya'; support_flag: boolean; created_at: string }>,
      days: (days.data ?? []).map((d) => d.day as string),
    };
  } catch (err) {
    console.error('[studentRefleksiData] Error:', err);
    return { reflections: [], days: [] };
  }
});

export const studentData = cache(async (id: string) => {
  try {
    const sb = admin();
    const monthStart = todayJakarta().slice(0, 8) + '01';
    const [plan, quiz, refl, req, days] = await Promise.all([
      sb.from('student_plans').select('*').eq('student_id', id).maybeSingle(),
      sb.from('quiz_attempts').select('score,total').eq('student_id', id).order('created_at', { ascending: false }).limit(1),
      sb.from('reflections').select('id,r1,r2,r3,barrier,support_flag,created_at').eq('student_id', id).order('created_at', { ascending: false }).limit(5),
      sb.from('consult_requests').select('id,slot_label,status,created_at').eq('student_id', id).order('created_at', { ascending: false }),
      sb.from('practice_days').select('day').eq('student_id', id).gte('day', monthStart),
    ]);
    return {
      plan: { ...EMPTY_PLAN, ...(plan.data ?? {}) } as Plan,
      quiz: (quiz.data?.[0] ?? null) as { score: number; total: number } | null,
      reflections: (refl.data ?? []) as Array<{ id: string; r1: string; r2: string; r3: string; barrier: 'tidak' | 'sedikit' | 'ya'; support_flag: boolean; created_at: string }>,
      requests: (req.data ?? []) as Array<{ id: string; slot_label: string; status: string; created_at: string }>,
      days: (days.data ?? []).map((d) => d.day as string),
    };
  } catch (err) {
    console.error('[studentData] Gagal memuat data siswa:', err);
    return {
      plan: { ...EMPTY_PLAN },
      quiz: null,
      reflections: [],
      requests: [],
      days: [],
    };
  }
});

// Cache konten situs 5 menit (di-revalidate otomatis saat Admin klik Simpan Konten)
export const getSiteContent = unstable_cache(
  async (): Promise<Record<string, string>> => {
    try {
      const { data } = await admin().from('site_content').select('key,value');
      return Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
    } catch {
      return {};
    }
  },
  ['site-content'],
  { revalidate: 300, tags: ['site-content'] }
);

// Cache slots 60 detik — tidak sering berubah
export const slotsForCode = unstable_cache(
  async (code: string) => {
    try {
      const sb = admin();
      const { data: c } = await sb.from('school_codes').select('owner_id').eq('code', code).maybeSingle();
      if (!c) return [];
      const { data } = await sb.from('consult_slots').select('id,label').eq('owner_id', c.owner_id).eq('active', true).order('created_at');
      return (data ?? []) as Array<{ id: string; label: string }>;
    } catch (err) {
      console.error('[slotsForCode] Gagal memuat jadwal konsultasi:', err);
      return [];
    }
  },
  ['slots-for-code'],
  { revalidate: 60, tags: ['consult-slots'] }
);
