'use client';

import { deleteCounselor, deleteStudent, deleteAllStudents } from '@/app/admin-actions';
import Submit from '@/components/Submit';

export function DeleteCounselorForm({ userId, name }: { userId: string; name: string }) {
  return (
    <form action={deleteCounselor} onSubmit={e => {
      if (!confirm(`Hapus ${name} dan semua datanya? Tidak bisa dibatalkan.`)) e.preventDefault();
    }}>
      <input type="hidden" name="user_id" value={userId} />
      <Submit className="btn danger" pendingText="Menghapus…">Hapus</Submit>
    </form>
  );
}

export function DeleteStudentForm({ id, nickname }: { id: string; nickname: string }) {
  return (
    <form action={deleteStudent} onSubmit={e => {
      if (!confirm(`Hapus siswa ${nickname}?`)) e.preventDefault();
    }}>
      <input type="hidden" name="id" value={id} />
      <Submit className="btn danger" pendingText="…">Hapus</Submit>
    </form>
  );
}

export function DeleteAllStudentsForm({ codes }: { codes: Array<{ code: string; note: string; count: number }> }) {
  return (
    <form action={deleteAllStudents} onSubmit={e => {
      if (!confirm('Hapus SEMUA siswa dari kode ini? Tidak bisa dibatalkan.')) e.preventDefault();
    }} style={{ display: 'grid', gap: 12 }}>
      <select name="code" required>
        <option value="">Pilih kode sekolah</option>
        {codes.map(c => (
          <option key={c.code} value={c.code}>
            {c.code} — {c.note} ({c.count} siswa)
          </option>
        ))}
      </select>
      <Submit className="btn danger" pendingText="Menghapus…">Hapus Semua Siswa dari Kode Ini</Submit>
    </form>
  );
}
