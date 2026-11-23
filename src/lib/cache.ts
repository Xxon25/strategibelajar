import 'server-only';
import { revalidateTag } from 'next/cache';

export const CACHE_TAGS = {
  siteContent: 'site-content',
  consultSlots: 'consult-slots',
  roles: 'roles',
  counselors: 'counselors',
  guruDash: 'guru-dash',
  adminDash: 'admin-dash',
  students: 'students',
  student: (id: string) => `student:${id}`,
  studentToken: (tokenHash: string) => `student-token:${tokenHash}`,
  guru: (id: string) => `guru:${id}`,
} as const;

export const dbScope = () => process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'default';

export function invalidateTags(...tags: string[]) {
  for (const tag of tags) {
    if (tag) {
      try {
        revalidateTag(tag);
      } catch {
        /* abaikan di luar konteks request/action */
      }
    }
  }
}
