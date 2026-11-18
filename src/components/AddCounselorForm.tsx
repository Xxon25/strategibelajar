'use client';

import { useActionState } from 'react';
import { addCounselor } from '@/app/admin-actions';
import Submit from '@/components/Submit';

export default function AddCounselorForm() {
  const [state, action] = useActionState(addCounselor, undefined);
  return (
    <form action={action} className="card" style={{ maxWidth: 480 }}>
      <h3>Tambah Guru BK Baru</h3>
      {state?.error && <div className="note" role="alert">{state.error}</div>}
      <div>
        <label className="q" htmlFor="ac-name">Nama guru</label>
        <input type="text" id="ac-name" name="name" maxLength={80} required placeholder="Contoh: Ibu Sari" />
      </div>
      <div>
        <label className="q" htmlFor="ac-school">Nama sekolah</label>
        <input type="text" id="ac-school" name="school" maxLength={100} required placeholder="Contoh: SMA Negeri 1 Jakarta" />
      </div>
      <div>
        <label className="q" htmlFor="ac-email">Email login</label>
        <input type="email" id="ac-email" name="email" required placeholder="guru@sekolah.sch.id" />
      </div>
      <div>
        <label className="q" htmlFor="ac-password">Kata sandi awal</label>
        <input type="password" id="ac-password" name="password" minLength={6} required placeholder="Min. 6 karakter" />
      </div>
      <Submit pendingText="Menambahkan…">Tambah Guru BK</Submit>
      <p className="small">Kode sekolah awal akan dibuat otomatis. Guru bisa menambah kode baru dari dashboard-nya.</p>
    </form>
  );
}
