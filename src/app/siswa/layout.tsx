import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getStudent } from '@/lib/session';
import { exitPreview } from '@/app/admin-actions';
import { BottomNav, SubTabs } from '@/components/Nav';

export default async function SiswaLayout({ children }: { children: React.ReactNode }) {
  const s = await getStudent();
  if (!s) redirect('/');
  const initial = (s.nickname || 'S').charAt(0).toUpperCase();

  return (
    <div className="app">
      {/* Banner Preview Admin */}
      {s.is_admin_preview && (
        <div className="no-print" style={{
          background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
          color: '#fff',
          padding: '10px max(24px, calc((100% - 980px) / 2))',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10,
          fontSize: 13, fontWeight: 600,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span><b>Mode Preview Admin</b> — Sedang melihat View Siswa: <b>{s.nickname}</b> (Kelas {s.class} · {s.school_code})</span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Link href="/admin?tab=view" style={{ padding: '5px 12px', borderRadius: 8, background: 'rgba(255,255,255,.18)', color: '#fff', fontWeight: 700, fontSize: 12, textDecoration: 'none' }}>
              Ganti View
            </Link>
            <form action={exitPreview}>
              <input type="hidden" name="to" value="/admin" />
              <button type="submit" style={{ padding: '5px 12px', borderRadius: 8, background: '#fff', color: '#4f46e5', fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>
                ← Kembali ke Panel Admin
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Topbar — coral on white */}
      <div className="no-print" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 12, height: 64, flexShrink: 0,
        padding: '0 max(24px, calc((100% - 980px) / 2))',
        background: 'rgba(255, 255, 255, 0.94)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--line)',
        position: 'sticky', top: 0, zIndex: 10,
        boxShadow: '0 2px 12px rgba(45,26,14,.05)',
      }}>
        <Link href="/siswa" style={{ display: 'flex', alignItems: 'center', gap: 11, textDecoration: 'none' }}>
          <div style={{
            width: 36, height: 36, borderRadius: 11, flexShrink: 0,
            background: 'var(--grad)', display: 'grid', placeItems: 'center',
            fontSize: 18, boxShadow: '0 4px 10px rgba(232,82,74,.28)',
          }}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--fd)', fontWeight: 800, fontSize: 15, color: 'var(--ink2)', lineHeight: 1.1 }}>
              Ruang Strategi Belajar
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>
              Ruang Siswa · kode {s.school_code}
            </div>
          </div>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link href="/siswa/bantuan" style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'var(--tint)', color: 'var(--accent)',
            padding: '5px 12px 5px 6px', borderRadius: 99,
            border: '1.5px solid var(--tint2)',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}>
            <span style={{
              width: 26, height: 26, borderRadius: '50%',
              background: 'var(--grad)', color: '#fff',
              display: 'grid', placeItems: 'center',
              fontSize: 12, fontWeight: 800,
            }}>
              {initial}
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink2)' }}>{s.nickname}</span>
            <span style={{
              fontSize: 11, fontWeight: 800,
              background: '#fff', color: 'var(--accent)',
              padding: '2px 8px', borderRadius: 99,
              border: '1px solid var(--tint2)',
            }}>
              {s.class}
            </span>
          </Link>
        </div>
      </div>

      {s.consent_at && <SubTabs />}
      <main className="screen">{children}</main>
      {s.consent_at && <BottomNav />}
    </div>
  );
}
