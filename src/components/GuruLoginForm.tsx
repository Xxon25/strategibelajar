'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { loginGuru } from '@/app/guru-actions';
import Submit from '@/components/Submit';

export default function GuruLoginForm() {
  const [state, action] = useActionState(loginGuru, undefined);
  const denied = useSearchParams().get('ditolak');
  return (
    <>
      <div>
        <span className="eyebrow">Ruang Guru BK</span>
        <h2>Masuk sebagai guru</h2>
      </div>
      <p className="lead">Halaman ini khusus guru BK. Siswa tidak memiliki akses.</p>
      {denied && !state?.error && (
        <div className="note" role="alert">Akses ditolak: halaman ini khusus guru BK.</div>
      )}
      {state?.error && (
        <div className="note" role="alert">{state.error}</div>
      )}
      <form action={action} style={{ display: 'grid', gap: 16 }}>
        <div>
          <label className="q" htmlFor="email">Email</label>
          <input type="email" id="email" name="email" autoComplete="username" placeholder="nama@sekolah.sch.id" required />
        </div>
        <div>
          <label className="q" htmlFor="password">Kata sandi</label>
          <input type="password" id="password" name="password" autoComplete="current-password" required />
        </div>
        <Submit pendingText="Masuk…">Masuk</Submit>
      </form>
      <Link className="btn link" href="/">Kembali</Link>
    </>
  );
}
