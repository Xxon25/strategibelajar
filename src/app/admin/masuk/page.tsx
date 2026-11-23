'use client';

import { useActionState } from 'react';
import { loginAdmin } from '@/app/admin-actions';
import Submit from '@/components/Submit';

export default function AdminMasuk() {
  const [state, action] = useActionState(loginAdmin, undefined);
  return (
    <div className="page-auth">
      <nav className="page-auth-nav">
        <b>Ruang Strategi Belajar</b>
        <span style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 600 }}>Panel Admin</span>
      </nav>
      <div className="page-auth-body">
        <div className="page-auth-card">
          <div>
            <div style={{
              width: '48px', height: '48px', borderRadius: '14px',
              background: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
              display: 'grid', placeItems: 'center',
              marginBottom: '16px',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="4"/>
                <path d="M6 20v-2a6 6 0 0 1 12 0v2"/>
                <path d="M19 11l2 2-4 4"/>
              </svg>
            </div>
            <span className="eyebrow">Super Admin</span>
            <h2 style={{ fontSize: '22px', fontWeight: 800, marginTop: 4 }}>Masuk ke Panel Admin</h2>
          </div>
          <p className="lead" style={{ fontSize: '14px' }}>
            Halaman ini khusus admin. Guru BK dan siswa tidak memiliki akses.
          </p>
          {state?.error && <div className="note" role="alert">{state.error}</div>}
          <form action={action} style={{ display: 'grid', gap: 16 }}>
            <div>
              <label className="q" htmlFor="email">Email admin</label>
              <input type="email" id="email" name="email" autoComplete="username" required placeholder="admin@sekolah.sch.id" />
            </div>
            <div>
              <label className="q" htmlFor="password">Kata sandi</label>
              <input type="password" id="password" name="password" autoComplete="current-password" required />
            </div>
            <Submit pendingText="Masuk…">Masuk sebagai Admin</Submit>
          </form>
        </div>
      </div>
    </div>
  );
}
