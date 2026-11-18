import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createHash } from 'crypto';
import { admin } from './supabase-admin';
import { supabaseAuth } from './supabase-server';

export const STUDENT_COOKIE = 'rsb_student';
export const PREVIEW_STUDENT_COOKIE = 'rsb_preview_student';
export const PREVIEW_GURU_COOKIE = 'rsb_preview_guru';
export const hash = (t: string) => createHash('sha256').update(t).digest('hex');

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

export async function getStudent(): Promise<Student | null> {
  try {
    const store = await cookies();
    const previewId = store.get(PREVIEW_STUDENT_COOKIE)?.value;
    if (previewId) {
      const a = await getAdmin();
      if (a) {
        const { data } = await admin()
          .from('students')
          .select('id,nickname,class,school_code,consent_at,share_summary,include_reflection')
          .eq('id', previewId)
          .maybeSingle();
        if (data) return { ...(data as Student), is_admin_preview: true };
      }
    }

    const token = store.get(STUDENT_COOKIE)?.value;
    if (!token) return null;
    const { data, error } = await admin()
      .from('students')
      .select('id,nickname,class,school_code,consent_at,share_summary,include_reflection')
      .eq('token_hash', hash(token))
      .maybeSingle();
    if (error) {
      console.error('[getStudent] Supabase error:', error.message);
      return null;
    }
    return (data as Student | null) ?? null;
  } catch (err) {
    console.error('[getStudent] Unexpected error:', err);
    return null;
  }
}

export async function requireStudent(opts?: { consent?: boolean }): Promise<Student> {
  const s = await getStudent();
  if (!s) redirect('/');
  if (opts?.consent !== false && !s.consent_at) redirect('/siswa');
  return s;
}

export type Guru = { user_id: string; name: string; school_name: string; is_admin_preview?: boolean };

export async function getGuru(): Promise<Guru | null> {
  try {
    const sb = await supabaseAuth();
    const {
      data: { user },
      error: authErr,
    } = await sb.auth.getUser();
    if (authErr || !user) return null;
    const { data, error } = await admin().from('counselors').select('user_id,name,school_name').eq('user_id', user.id).maybeSingle();
    if (error) {
      console.error('[getGuru] Supabase error:', error.message);
      return null;
    }
    if (data) return data as Guru;

    // Jika yang login adalah Admin, izinkan melihat View Guru BK (berdasarkan cookie preview atau guru pertama)
    const { data: adm } = await admin().from('admins').select('user_id').eq('user_id', user.id).maybeSingle();
    if (adm) {
      const store = await cookies();
      const previewGuruId = store.get(PREVIEW_GURU_COOKIE)?.value;
      if (previewGuruId) {
        const { data: cg } = await admin().from('counselors').select('user_id,name,school_name').eq('user_id', previewGuruId).maybeSingle();
        if (cg) return { ...(cg as Guru), is_admin_preview: true };
      }
      const { data: firstGuru } = await admin().from('counselors').select('user_id,name,school_name').order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (firstGuru) return { ...(firstGuru as Guru), is_admin_preview: true };
    }

    return null;
  } catch (err) {
    console.error('[getGuru] Unexpected error:', err);
    return null;
  }
}

export async function requireGuru(): Promise<Guru> {
  const g = await getGuru();
  if (!g) {
    const isStudent = !!(await cookies()).get(STUDENT_COOKIE)?.value;
    redirect(isStudent ? '/guru/masuk?ditolak=1' : '/guru/masuk');
  }
  return g;
}

export type Admin = { user_id: string; name: string };

export async function getAdmin(): Promise<Admin | null> {
  try {
    const sb = await supabaseAuth();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return null;
    const { data } = await admin().from('admins').select('user_id,name').eq('user_id', user.id).maybeSingle();
    return (data as Admin | null) ?? null;
  } catch {
    return null;
  }
}

export async function requireAdmin(): Promise<Admin> {
  const a = await getAdmin();
  if (!a) redirect('/admin/masuk');
  return a;
}
