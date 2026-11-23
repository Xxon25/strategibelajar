import 'server-only';
import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { admin } from './supabase-admin';
import { supabaseAuth } from './supabase-server';
import { getVerifiedUserId } from './jwks';
import { CACHE_TAGS, dbScope } from './cache';

export const STUDENT_COOKIE = 'rsb_student';
export const PREVIEW_STUDENT_COOKIE = 'rsb_preview_student';
export const PREVIEW_GURU_COOKIE = 'rsb_preview_guru';
export const hash = (t: string) => createHash('sha256').update(t).digest('hex');

const secret = () => process.env.SUPABASE_SERVICE_ROLE_KEY || 'rsb-fallback-secret';

export function signPreviewId(id: string): string {
  const sig = createHmac('sha256', secret()).update(id).digest('hex').slice(0, 24);
  return `${id}.${sig}`;
}

export function verifyPreviewId(raw: string | undefined): string | null {
  if (!raw) return null;
  const dot = raw.lastIndexOf('.');
  if (dot <= 0) return null;
  const id = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  const expected = createHmac('sha256', secret()).update(id).digest('hex').slice(0, 24);
  if (sig.length !== expected.length) return null;
  try {
    return timingSafeEqual(Buffer.from(sig), Buffer.from(expected)) ? id : null;
  } catch {
    return null;
  }
}

export type Student = {
  id: string;
  nickname: string;
  class: string;
  school_code: string;
  consent_at: string | null;
  share_summary: boolean;
  include_reflection: boolean;
  is_admin_preview?: boolean;
};

function cachedStudentByHash(scope: string, tokenHash: string) {
  return unstable_cache(
    async () => {
      const { data, error } = await admin()
        .from('students')
        .select('id,nickname,class,school_code,consent_at,share_summary,include_reflection')
        .eq('token_hash', tokenHash)
        .maybeSingle();
      if (error) throw error;
      return (data as Student | null) ?? null;
    },
    ['student-by-hash', scope, tokenHash],
    { revalidate: 60, tags: [CACHE_TAGS.students, CACHE_TAGS.studentToken(tokenHash)] }
  )();
}

function cachedStudentById(scope: string, id: string) {
  return unstable_cache(
    async () => {
      const { data, error } = await admin()
        .from('students')
        .select('id,nickname,class,school_code,consent_at,share_summary,include_reflection')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return (data as Student | null) ?? null;
    },
    ['student-by-id', scope, id],
    { revalidate: 60, tags: [CACHE_TAGS.students, CACHE_TAGS.student(id)] }
  )();
}

function cachedCounselorById(scope: string, userId: string) {
  return unstable_cache(
    async () => {
      const { data, error } = await admin()
        .from('counselors')
        .select('user_id,name,school_name')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      return (data as Guru | null) ?? null;
    },
    ['counselor-role', scope, userId],
    { revalidate: 60, tags: [CACHE_TAGS.roles, CACHE_TAGS.counselors] }
  )();
}

function cachedFirstCounselor(scope: string) {
  return unstable_cache(
    async () => {
      const { data, error } = await admin()
        .from('counselors')
        .select('user_id,name,school_name')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as Guru | null) ?? null;
    },
    ['counselor-first', scope],
    { revalidate: 60, tags: [CACHE_TAGS.roles, CACHE_TAGS.counselors] }
  )();
}

function cachedAdminById(scope: string, userId: string) {
  return unstable_cache(
    async () => {
      const { data, error } = await admin()
        .from('admins')
        .select('user_id,name')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      return (data as Admin | null) ?? null;
    },
    ['admin-role', scope, userId],
    { revalidate: 60, tags: [CACHE_TAGS.roles] }
  )();
}

// Dide-duplikasi otomatis per request dengan React cache() + Next Data Cache
export const getStudent = cache(async (): Promise<Student | null> => {
  try {
    const store = await cookies();
    const scope = dbScope();
    const previewId = verifyPreviewId(store.get(PREVIEW_STUDENT_COOKIE)?.value);
    if (previewId) {
      const data = await cachedStudentById(scope, previewId);
      if (data) return { ...data, is_admin_preview: true };
    }

    const token = store.get(STUDENT_COOKIE)?.value;
    if (!token) return null;
    return await cachedStudentByHash(scope, hash(token));
  } catch (err) {
    console.error('[getStudent] Unexpected error:', err);
    return null;
  }
});

export async function requireStudent(opts?: { consent?: boolean }): Promise<Student> {
  const s = await getStudent();
  if (!s) redirect('/');
  if (opts?.consent !== false && !s.consent_at) redirect('/siswa');
  return s;
}

export type Guru = { user_id: string; name: string; school_name: string; is_admin_preview?: boolean };

export const getGuru = cache(async (): Promise<Guru | null> => {
  try {
    const store = await cookies();
    const scope = dbScope();
    // Fast-path: jika Admin sedang mode preview Guru (terverifikasi HMAC, 0 round-trip ke Auth)
    const previewGuruId = verifyPreviewId(store.get(PREVIEW_GURU_COOKIE)?.value);
    if (previewGuruId) {
      const cg = await cachedCounselorById(scope, previewGuruId);
      if (cg) return { ...cg, is_admin_preview: true };
    }

    const sb = await supabaseAuth();
    const userId = await getVerifiedUserId(sb, scope);
    if (!userId) return null;

    const guru = await cachedCounselorById(scope, userId);
    if (guru) return guru;

    // Fallback jika Admin langsung membuka /guru tanpa memilih guru tertentu
    const adm = await cachedAdminById(scope, userId);
    if (adm) {
      const firstGuru = await cachedFirstCounselor(scope);
      if (firstGuru) return { ...firstGuru, is_admin_preview: true };
    }

    return null;
  } catch (err) {
    console.error('[getGuru] Unexpected error:', err);
    return null;
  }
});

export async function requireGuru(): Promise<Guru> {
  const g = await getGuru();
  if (!g) {
    const isStudent = !!(await cookies()).get(STUDENT_COOKIE)?.value;
    redirect(isStudent ? '/guru/masuk?ditolak=1' : '/guru/masuk');
  }
  return g;
}

export type Admin = { user_id: string; name: string };

export const getAdmin = cache(async (): Promise<Admin | null> => {
  try {
    const sb = await supabaseAuth();
    const scope = dbScope();
    const userId = await getVerifiedUserId(sb, scope);
    if (!userId) return null;
    return await cachedAdminById(scope, userId);
  } catch {
    return null;
  }
});

export async function requireAdmin(): Promise<Admin> {
  const a = await getAdmin();
  if (!a) redirect('/admin/masuk');
  return a;
}
