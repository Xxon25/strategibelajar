'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { registerStudent } from '@/app/actions';
import Submit from '@/components/Submit';
import { CLASSES } from '@/lib/constants';

export default function RegisterForm() {
  const [state, action] = useActionState(registerStudent, undefined);
  return (
    <div className="page-auth">
      <nav className="page-auth-nav">
        <b>Ruang Strategi Belajar</b>
        <span style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 600 }}>Media Layanan BK</span>
      </nav>
      <div className="page-auth-body">
        <div className="page-auth-card">
          <div>
            <span className="eyebrow">Kenalan dulu</span>
            <h2 style={{ fontSize: '24px', fontWeight: 800, marginTop: 4 }}>Siapa nama panggilanmu?</h2>
          </div>
          <p className="lead">
            Cukup nama panggilan, tidak perlu nama lengkap atau NPM, supaya datamu tetap seminimal mungkin.
          </p>
          {state?.error && (
            <div className="note" role="alert">{state.error}</div>
          )}
          <form action={action} style={{ display: 'grid', gap: 16 }}>
            <div>
              <label className="q" htmlFor="nick">Nama panggilan</label>
              <input type="text" id="nick" name="nick" maxLength={20} autoComplete="off" placeholder="Contoh: Dinda" required />
            </div>
            <div>
              <label className="q" htmlFor="cls">Kelas</label>
              <select id="cls" name="cls" required defaultValue="">
                <option value="" disabled>Pilih kelas</option>
                {CLASSES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="q" htmlFor="code">Kode sekolah</label>
              <input type="text" id="code" name="code" maxLength={12} autoComplete="off" placeholder="Dari guru BK sekolahmu" required />
            </div>
            <Submit pendingText="Mendaftar…">Lanjut</Submit>
          </form>
          <p className="small">
            Tidak ada kata sandi untuk siswa. Datamu terhubung ke peramban di perangkat ini — pakai perangkat yang sama untuk melanjutkan.
          </p>
          <Link className="btn link" href="/">← Kembali</Link>
        </div>
      </div>
    </div>
  );
}
