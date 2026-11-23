import 'server-only';
import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { admin } from './supabase-admin';
import { todayJakarta } from './util';
import { CACHE_TAGS, dbScope } from './cache';
import type { BARRIER } from './constants';

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

// Hanya ambil 1 tabel student_plans (untuk /siswa/kebiasaan, /tujuan, /waktu, /fokus) — di-cache per siswa
export const studentPlan = cache(async (id: string): Promise<Plan> => {
  try {
    const scope = dbScope();
    return await unstable_cache(
      async () => {
        const { data, error } = await admin().from('student_plans').select('*').eq('student_id', id).maybeSingle();
        if (error) throw error;
        return { ...EMPTY_PLAN, ...(data ?? {}) } as Plan;
      },
      ['student-plan', scope, id],
      { revalidate: 60, tags: [CACHE_TAGS.student(id), CACHE_TAGS.students] }
    )();
  } catch (err) {
    console.error('[studentPlan] Gagal memuat rencana siswa:', err);
    return { ...EMPTY_PLAN };
  }
});

// Hanya ambil plan + kuis terakhir (untuk /siswa/strategi)
export const studentStrategiData = cache(async (id: string) => {
  try {
    const scope = dbScope();
    return await unstable_cache(
      async () => {
        const sb = admin();
        const [plan, quiz] = await Promise.all([
          sb.from('student_plans').select('strategies').eq('student_id', id).maybeSingle(),
          sb.from('quiz_attempts').select('score,total').eq('student_id', id).order('created_at', { ascending: false }).limit(1),
        ]);
        if (plan.error) throw plan.error;
        if (quiz.error) throw quiz.error;
        return {
          strategies: ((plan.data?.strategies as string[] | undefined) ?? []),
          quiz: (quiz.data?.[0] ?? null) as { score: number; total: number } | null,
        };
      },
      ['student-strategi', scope, id],
      { revalidate: 60, tags: [CACHE_TAGS.student(id), CACHE_TAGS.students] }
    )();
  } catch (err) {
    console.error('[studentStrategiData] Error:', err);
    return { strategies: [] as string[], quiz: null };
  }
});

// Hanya ambil refleksi + hari berlatih (untuk /siswa/refleksi)
export const studentRefleksiData = cache(async (id: string) => {
  try {
    const scope = dbScope();
    const monthStart = todayJakarta().slice(0, 8) + '01';
    return await unstable_cache(
      async () => {
        const sb = admin();
        const [refl, days] = await Promise.all([
          sb.from('reflections').select('id,r1,r2,r3,barrier,support_flag,created_at').eq('student_id', id).order('created_at', { ascending: false }).limit(5),
          sb.from('practice_days').select('day').eq('student_id', id).gte('day', monthStart),
        ]);
        if (refl.error) throw refl.error;
        if (days.error) throw days.error;
        return {
          reflections: (refl.data ?? []) as Array<{ id: string; r1: string; r2: string; r3: string; barrier: 'tidak' | 'sedikit' | 'ya'; support_flag: boolean; created_at: string }>,
          days: (days.data ?? []).map((d) => d.day as string),
        };
      },
      ['student-refleksi', scope, id, monthStart],
      { revalidate: 60, tags: [CACHE_TAGS.student(id), CACHE_TAGS.students] }
    )();
  } catch (err) {
    console.error('[studentRefleksiData] Error:', err);
    return { reflections: [], days: [] };
  }
});

export const studentData = cache(async (id: string) => {
  try {
    const scope = dbScope();
    const monthStart = todayJakarta().slice(0, 8) + '01';
    return await unstable_cache(
      async () => {
        const sb = admin();
        const [plan, quiz, refl, req, days] = await Promise.all([
          sb.from('student_plans').select('*').eq('student_id', id).maybeSingle(),
          sb.from('quiz_attempts').select('score,total').eq('student_id', id).order('created_at', { ascending: false }).limit(1),
          sb.from('reflections').select('id,r1,r2,r3,barrier,support_flag,created_at').eq('student_id', id).order('created_at', { ascending: false }).limit(5),
          sb.from('consult_requests').select('id,slot_label,status,mode,room_info,reschedule_note,meet_link,confirmed_time,student_note,created_at').eq('student_id', id).order('created_at', { ascending: false }),
          sb.from('practice_days').select('day').eq('student_id', id).gte('day', monthStart),
        ]);
        if (plan.error) throw plan.error;
        return {
          plan: { ...EMPTY_PLAN, ...(plan.data ?? {}) } as Plan,
          quiz: (quiz.data?.[0] ?? null) as { score: number; total: number } | null,
          reflections: (refl.data ?? []) as Array<{ id: string; r1: string; r2: string; r3: string; barrier: 'tidak' | 'sedikit' | 'ya'; support_flag: boolean; created_at: string }>,
          requests: (req.data ?? []) as Array<{ id: string; slot_label: string; status: string; mode: string; room_info: string; reschedule_note: string; meet_link: string; confirmed_time: string; created_at: string }>,
          days: (days.data ?? []).map((d) => d.day as string),
        };
      },
      ['student-data', scope, id, monthStart],
      { revalidate: 60, tags: [CACHE_TAGS.student(id), CACHE_TAGS.students] }
    )();
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
export const getSiteContent = async (): Promise<Record<string, string>> => {
  const scope = dbScope();
  return unstable_cache(
    async () => {
      try {
        const { data } = await admin().from('site_content').select('key,value').not('key', 'like', 'chat:%');
        return Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
      } catch {
        return {};
      }
    },
    ['site-content', scope],
    { revalidate: 300, tags: [CACHE_TAGS.siteContent] }
  )();
};

// Cache slots 60 detik — tidak sering berubah
export const slotsForCode = async (code: string) => {
  const scope = dbScope();
  return unstable_cache(
    async () => {
      try {
        const sb = admin();
        const { data: c } = await sb.from('school_codes').select('owner_id').eq('code', code).maybeSingle();
        if (!c) return [];
        const { data } = await sb
          .from('consult_slots')
          .select('id,label,mode')
          .eq('owner_id', c.owner_id)
          .eq('active', true)
          .order('mode')
          .order('created_at');
        return (data ?? []) as Array<{ id: string; label: string; mode: 'online' | 'offline' }>;
      } catch (err) {
        console.error('[slotsForCode] Gagal memuat jadwal konsultasi:', err);
        return [];
      }
    },
    ['slots-for-code', scope, code],
    { revalidate: 60, tags: [CACHE_TAGS.consultSlots] }
  )();
};

/* ── Guru Dashboard Cached Per-Tab ── */
export type GuruTab = 'siswa' | 'konsul' | 'kode' | 'jadwal';
type GuruRefl = { student_id: string; r1: string; r2: string; r3: string; barrier: keyof typeof BARRIER; support_flag: boolean; created_at: string };
type GuruReq = { id: string; student_id: string; slot_label: string; status: string; mode: string; room_info: string; reschedule_note: string; meet_link: string; confirmed_time: string };

export async function guruDashboardData(ownerId: string, tab: GuruTab) {
  const scope = dbScope();
  const monthStart = todayJakarta().slice(0, 8) + '01';
  try {
    return await unstable_cache(
      async () => {
        const sb = admin();
        // Jalankan school_codes dan (jika tab === 'jadwal') consult_slots secara paralel
        const [codesRes, slotRes] = await Promise.all([
          sb.from('school_codes').select('code,active,note').eq('owner_id', ownerId).order('created_at', { ascending: false }),
          tab === 'jadwal'
            ? sb.from('consult_slots').select('id,label,active,mode').eq('owner_id', ownerId).order('created_at')
            : Promise.resolve({ data: [] as Array<{ id: string; label: string; active: boolean; mode: string }> }),
        ]);

        const codes = (codesRes.data ?? []) as Array<{ code: string; active: boolean; note: string }>;
        const codeList = codes.map((c) => c.code);
        const slotsData = (slotRes.data ?? []) as Array<{ id: string; label: string; active: boolean; mode: string }>;

        const { data: studs } = codeList.length
          ? await sb
              .from('students')
              .select('id,nickname,class,share_summary,include_reflection,consent_at')
              .in('school_code', codeList)
              .order('created_at', { ascending: false })
          : { data: [] as Array<{ id: string; nickname: string; class: string; share_summary: boolean; include_reflection: boolean; consent_at: string | null }> };

        const students = studs ?? [];
        const ids = students.map((s) => s.id);

        if (ids.length === 0) {
          return {
            codes,
            students,
            reflData: [] as GuruRefl[],
            quizData: [] as Array<{ student_id: string; score: number; total: number }>,
            daysData: [] as Array<{ student_id: string }>,
            requests: [] as GuruReq[],
            slotsData,
            baruCount: 0,
            reflectedCount: 0,
          };
        }

        // Ambil hanya tabel yang dibutuhkan tab aktif + jumlah badge/stat ringan
        const [reflRes, quizRes, daysRes, reqRes] = await Promise.all([
          tab === 'siswa'
            ? sb.from('reflections').select('student_id,r1,r2,r3,barrier,support_flag,created_at').in('student_id', ids).order('created_at', { ascending: false })
            : sb.from('reflections').select('student_id,support_flag,created_at').in('student_id', ids).order('created_at', { ascending: false }),
          tab === 'siswa'
            ? sb.from('quiz_attempts').select('student_id,score,total,created_at').in('student_id', ids).order('created_at', { ascending: false })
            : Promise.resolve({ data: [] }),
          tab === 'siswa'
            ? sb.from('practice_days').select('student_id').in('student_id', ids).gte('day', monthStart)
            : Promise.resolve({ data: [] }),
          tab === 'konsul'
            ? sb.from('consult_requests').select('id,student_id,slot_label,status,mode,room_info,reschedule_note,meet_link,confirmed_time,created_at').in('student_id', ids).order('created_at', { ascending: false })
            : sb.from('consult_requests').select('id,status').in('student_id', ids),
        ]);

        const reflData = (reflRes.data ?? []) as GuruRefl[];
        const quizData = (quizRes.data ?? []) as Array<{ student_id: string; score: number; total: number }>;
        const daysData = (daysRes.data ?? []) as Array<{ student_id: string }>;
        const reqRows = (reqRes.data ?? []) as GuruReq[];
        const baruCount = reqRows.filter((r) => r.status === 'Baru').length;
        const reflectedSet = new Set(reflData.map((r) => r.student_id));

        return {
          codes,
          students,
          reflData,
          quizData,
          daysData,
          requests: tab === 'konsul' ? reqRows : ([] as GuruReq[]),
          slotsData,
          baruCount,
          reflectedCount: reflectedSet.size,
        };
      },
      ['guru-dash', scope, ownerId, tab, monthStart],
      { revalidate: 30, tags: [CACHE_TAGS.guruDash, CACHE_TAGS.guru(ownerId), CACHE_TAGS.students, CACHE_TAGS.consultSlots] }
    )();
  } catch (err) {
    console.error('[guruDashboardData] Gagal memuat data dashboard guru:', err);
    return {
      codes: [] as Array<{ code: string; active: boolean; note: string }>,
      students: [] as Array<{ id: string; nickname: string; class: string; share_summary: boolean; include_reflection: boolean; consent_at: string | null }>,
      reflData: [] as GuruRefl[],
      quizData: [] as Array<{ student_id: string; score: number; total: number }>,
      daysData: [] as Array<{ student_id: string }>,
      requests: [] as GuruReq[],
      slotsData: [] as Array<{ id: string; label: string; active: boolean; mode: string }>,
      baruCount: 0,
      reflectedCount: 0,
    };
  }
}

/* ── Admin Dashboard Cached Per-Tab ── */
export type AdminTab = 'overview' | 'view' | 'guru' | 'siswa' | 'konsul' | 'konten';
export type AdminCounselor = { user_id: string; name: string; school_name: string; created_at: string };
export type AdminStudentRow = {
  id: string; nickname: string; class: string; school_code: string; consent_at: string | null;
  share_summary: boolean; include_reflection: boolean; created_at: string;
};
export type AdminCode = { code: string; owner_id: string; note: string; active: boolean; created_at: string };
export type AdminSlot = { id: string; owner_id: string; label: string; active: boolean; mode?: string; created_at: string };
export type AdminPlanRow = {
  student_id: string; habits_done: string[]; habit_focus: string; goal: string; sched_topic: string;
  sched_start: string | null; strategies: string[]; focus_notif: string; focus_place: string; focus_tools: string;
};
export type AdminQuizRow = { id: string; student_id: string; score: number; total: number; created_at: string };
export type AdminReflRow = {
  id: string; student_id: string; r1: string; r2: string; r3: string;
  barrier: keyof typeof BARRIER; support_flag: boolean; created_at: string;
};
export type AdminReqRow = { id: string; student_id: string; slot_label: string; status: string; created_at: string };

export async function adminTabData(tab: AdminTab) {
  const scope = dbScope();
  try {
    return await unstable_cache(
      async () => {
        const sb = admin();
        let counselors: AdminCounselor[] = [];
        let students: AdminStudentRow[] = [];
        let codes: AdminCode[] = [];
        let slots: AdminSlot[] = [];
        let plans: AdminPlanRow[] = [];
        let quizzes: AdminQuizRow[] = [];
        let reflections: AdminReflRow[] = [];
        let requests: AdminReqRow[] = [];
        let practiceDays: Array<{ student_id: string; day: string }> = [];
        let contents: Record<string, string> = {};
        let dbError: string | null = null;

        if (tab === 'konten') {
          const contentRes = await sb.from('site_content').select('key,value').not('key', 'like', 'chat:%').order('key');
          contents = Object.fromEntries((contentRes.data ?? []).map((r) => [r.key, r.value]));
        } else if (tab === 'view') {
          const [cRes, sRes, codeRes] = await Promise.all([
            sb.from('counselors').select('user_id,name,school_name,created_at').order('created_at', { ascending: false }),
            sb.from('students').select('id,nickname,class,school_code,consent_at,share_summary,include_reflection,created_at').order('created_at', { ascending: false }),
            sb.from('school_codes').select('code,owner_id,note,active,created_at'),
          ]);
          counselors = (cRes.data ?? []) as AdminCounselor[];
          students = (sRes.data ?? []) as AdminStudentRow[];
          codes = (codeRes.data ?? []) as AdminCode[];
        } else if (tab === 'guru') {
          const [cRes, sRes, codeRes, slotRes] = await Promise.all([
            sb.from('counselors').select('user_id,name,school_name,created_at').order('created_at', { ascending: false }),
            sb.from('students').select('id,school_code'),
            sb.from('school_codes').select('code,owner_id,note,active,created_at').order('created_at', { ascending: false }),
            sb.from('consult_slots').select('id,owner_id,label,active,mode,created_at').order('created_at'),
          ]);
          counselors = (cRes.data ?? []) as AdminCounselor[];
          students = (sRes.data ?? []) as AdminStudentRow[];
          codes = (codeRes.data ?? []) as AdminCode[];
          slots = (slotRes.data ?? []) as AdminSlot[];
        } else if (tab === 'konsul') {
          const [sRes, reflRes, reqRes] = await Promise.all([
            sb.from('students').select('id,nickname,class,school_code'),
            sb.from('reflections').select('id,student_id,r1,r2,r3,barrier,support_flag,created_at').order('created_at', { ascending: false }).limit(30),
            sb.from('consult_requests').select('id,student_id,slot_label,status,created_at').order('created_at', { ascending: false }),
          ]);
          students = (sRes.data ?? []) as AdminStudentRow[];
          reflections = (reflRes.data ?? []) as AdminReflRow[];
          requests = (reqRes.data ?? []) as AdminReqRow[];
        } else if (tab === 'overview') {
          const [cRes, sRes, codeRes, slotRes, reflRes, reqRes] = await Promise.all([
            sb.from('counselors').select('user_id,name,school_name,created_at').order('created_at', { ascending: false }),
            sb.from('students').select('id,nickname,class,school_code,consent_at').order('created_at', { ascending: false }),
            sb.from('school_codes').select('code,owner_id,note,active,created_at'),
            sb.from('consult_slots').select('id,owner_id'),
            sb.from('reflections').select('id,student_id,r1,r2,r3,barrier,support_flag,created_at').order('created_at', { ascending: false }),
            sb.from('consult_requests').select('id,status'),
          ]);
          counselors = (cRes.data ?? []) as AdminCounselor[];
          students = (sRes.data ?? []) as AdminStudentRow[];
          codes = (codeRes.data ?? []) as AdminCode[];
          slots = (slotRes.data ?? []) as AdminSlot[];
          reflections = (reflRes.data ?? []) as AdminReflRow[];
          requests = (reqRes.data ?? []) as AdminReqRow[];
          if (cRes.error) dbError = `DB Error: ${cRes.error.message}`;
        } else {
          // tab === 'siswa'
          const [cRes, sRes, codeRes, planRes, quizRes, reflRes, dayRes] = await Promise.all([
            sb.from('counselors').select('user_id,name,school_name,created_at'),
            sb.from('students').select('id,nickname,class,school_code,consent_at,share_summary,include_reflection,created_at').order('created_at', { ascending: false }),
            sb.from('school_codes').select('code,owner_id,note,active,created_at'),
            sb.from('student_plans').select('*'),
            sb.from('quiz_attempts').select('id,student_id,score,total,created_at').order('created_at', { ascending: false }),
            sb.from('reflections').select('id,student_id,r1,r2,r3,barrier,support_flag,created_at').order('created_at', { ascending: false }),
            sb.from('practice_days').select('student_id,day'),
          ]);
          counselors = (cRes.data ?? []) as AdminCounselor[];
          students = (sRes.data ?? []) as AdminStudentRow[];
          codes = (codeRes.data ?? []) as AdminCode[];
          plans = (planRes.data ?? []) as AdminPlanRow[];
          quizzes = (quizRes.data ?? []) as AdminQuizRow[];
          reflections = (reflRes.data ?? []) as AdminReflRow[];
          practiceDays = (dayRes.data ?? []) as Array<{ student_id: string; day: string }>;
        }

        return {
          counselors,
          students,
          codes,
          slots,
          plans,
          quizzes,
          reflections,
          requests,
          practiceDays,
          contents,
          dbError,
        };
      },
      ['admin-tab', scope, tab],
      {
        revalidate: 30,
        tags: [
          CACHE_TAGS.adminDash,
          CACHE_TAGS.counselors,
          CACHE_TAGS.students,
          CACHE_TAGS.consultSlots,
          CACHE_TAGS.siteContent,
        ],
      }
    )();
  } catch (e) {
    console.error('[adminTabData] Gagal memuat data:', e);
    return {
      counselors: [] as AdminCounselor[],
      students: [] as AdminStudentRow[],
      codes: [] as AdminCode[],
      slots: [] as AdminSlot[],
      plans: [] as AdminPlanRow[],
      quizzes: [] as AdminQuizRow[],
      reflections: [] as AdminReflRow[],
      requests: [] as AdminReqRow[],
      practiceDays: [] as Array<{ student_id: string; day: string }>,
      contents: {} as Record<string, string>,
      dbError: `Gagal memuat data dari Supabase. (${e})`,
    };
  }
}
