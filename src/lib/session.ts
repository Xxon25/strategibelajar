import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createHash } from 'crypto';
import { admin } from './supabase-admin';
import { supabaseAuth } from './supabase-server';

export const STUDENT_COOKIE = 'rsb_student';
export const hash = (t: string) => createHash('sha256').update(t).digest('hex');

export type Student = {
  id: string;
  nickname: string;
  class: string;
  school_code: string;
  consent_at: string | null;
  share_summary: boolean;
  include_reflection: boolean;
};

export async function getStudent(): Promise<Student | null> {
  const token = (await cookies()).get(STUDENT_COOKIE)?.value;
  if (!token) return null;
  const { data } = await admin()
    .from('students')
    .select('id,nickname,class,school_code,consent_at,share_summary,include_reflection')
    .eq('token_hash', hash(token))
    .maybeSingle();
  return (data as Student | null) ?? null;
}

export async function requireStudent(opts?: { consent?: boolean }): Promise<Student> {
  const s = await getStudent();
  if (!s) redirect('/');
  if (opts?.consent !== false && !s.consent_at) redirect('/siswa');
  return s;
}

export type Guru = { user_id: string; name: string; school_name: string };

export async function getGuru(): Promise<Guru | null> {
  const sb = await supabaseAuth();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;
  const { data } = await admin().from('counselors').select('user_id,name,school_name').eq('user_id', user.id).maybeSingle();
  return (data as Guru | null) ?? null;
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
