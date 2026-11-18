import { Suspense } from 'react';
import GuruLoginForm from '@/components/GuruLoginForm';

export default function GuruMasuk() {
  return (
    <div className="page-auth">
      <nav className="page-auth-nav">
        <b>Ruang Strategi Belajar</b>
        <span style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 600 }}>Ruang Guru BK</span>
      </nav>
      <div className="page-auth-body">
        <div className="page-auth-card">
          <Suspense>
            <GuruLoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
