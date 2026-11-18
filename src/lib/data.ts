import 'server-only';
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

const EMPTY_PLAN: Plan = {
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

export async function studentData(id: string) {
  try {
    const sb = admin();
    const monthStart = todayJakarta().slice(0, 8) + '01';
    const [plan, quiz, refl, req, days] = await Promise.all([
      sb.from('student_plans').select('*').eq('student_id', id).maybeSingle(),
      sb.from('quiz_attempts').select('*').eq('student_id', id).order('created_at', { ascending: false }).limit(1),
      sb.from('reflections').select('*').eq('student_id', id).order('created_at', { ascending: false }).limit(5),
      sb.from('consult_requests').select('*').eq('student_id', id).order('created_at', { ascending: false }),
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
}

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
  { revalidate: 60 }
);
