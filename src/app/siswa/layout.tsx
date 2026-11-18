import { redirect } from 'next/navigation';
import { getStudent } from '@/lib/session';
import { BottomNav, SubTabs } from '@/components/Nav';

export default async function SiswaLayout({ children }: { children: React.ReactNode }) {
  const s = await getStudent();
  if (!s) redirect('/');
  return (
    <div className="app">
      {/* Topbar — coral on white */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 12, height: 60, flexShrink: 0,
        padding: '0 max(40px, calc((100% - 980px) / 2))',
        background: '#ffffff',
        borderBottom: '1px solid var(--line)',
        position: 'sticky', top: 0, zIndex: 10,
        boxShadow: '0 2px 8px rgba(45,26,14,.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10, flexShrink: 0,
            background: 'var(--grad)', display: 'grid', placeItems: 'center',
            fontSize: 16, boxShadow: '0 2px 8px rgba(232,82,74,.3)',
          }}>📗</div>
          <span style={{ fontFamily: 'var(--fd)', fontWeight: 800, fontSize: 15, color: 'var(--accent)' }}>
            Ruang Strategi Belajar
          </span>
        </div>
        <span style={{
          fontSize: 12, fontWeight: 700,
          background: 'var(--tint)', color: 'var(--accent)',
          padding: '4px 14px', borderRadius: 99,
          border: '1px solid var(--tint2)',
          whiteSpace: 'nowrap',
        }}>
          {s.nickname} · {s.class}
        </span>
      </div>

      {s.consent_at && <SubTabs />}
      <main className="screen">{children}</main>
      {s.consent_at && <BottomNav />}
    </div>
  );
}
