export const dynamic = 'force-dynamic'
import Link from 'next/link';
import { getStudent } from '@/lib/session';
import { getSiteContent } from '@/lib/data';
import Flash from '@/components/Flash';

const DEFAULT: Record<string, string> = {
  home_title:    'Ruang Strategi Belajar',
  home_subtitle: 'Kenali kebiasaan belajarmu, susun rencana, dan temukan strategi yang paling cocok bersama Guru BK.',
  home_badge1:   'Strategi Belajar',
  home_badge2:   'Tujuan Mingguan',
  home_badge3:   'Manajemen Waktu',
  home_badge4:   'Refleksi Diri',
  footer_text:   'Ruang Strategi Belajar · Media Layanan Bimbingan Konseling',
};

export default async function Masuk({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const sp = await searchParams;
  const [s, content] = await Promise.all([getStudent(), getSiteContent()]);
  const c = { ...DEFAULT, ...content };

  const badges = [
    [c.home_badge1],
    [c.home_badge2],
    [c.home_badge3],
    [c.home_badge4],
  ];

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>

      {/* ── NAVBAR ── */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 48px', height: '64px',
        background: 'var(--surface)', borderBottom: '1px solid var(--line)',
        position: 'sticky', top: 0, zIndex: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '10px',
            background: 'var(--grad)', display: 'grid', placeItems: 'center',
            fontSize: '16px', flexShrink: 0,
          }} />
          <span style={{ fontFamily: 'var(--fd)', fontWeight: 800, fontSize: '16px', color: 'var(--ink2)' }}>
            {c.home_title}
          </span>
        </div>
        <span style={{
          fontSize: '12px', fontWeight: 600, color: 'var(--muted)',
          padding: '4px 12px', borderRadius: '99px',
          background: 'var(--surface2)', border: '1px solid var(--line)',
        }}>
          Media Layanan BK
        </span>
      </nav>

      {/* ── HERO BANNER ── */}
      <div style={{
        background: 'var(--grad-hero)',
        padding: '72px 48px 80px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        textAlign: 'center', gap: '20px',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: '-120px', left: '50%', transform: 'translateX(-50%)',
          width: '600px', height: '600px', borderRadius: '50%',
          background: 'rgba(255,255,255,.04)', pointerEvents: 'none',
        }} />

        <span style={{
          fontSize: '11px', fontWeight: 700, letterSpacing: '.14em',
          textTransform: 'uppercase', color: 'rgba(255,255,255,.55)',
          position: 'relative',
        }}>Selamat Datang</span>

        <h1 style={{
          fontFamily: 'var(--fd)',
          fontSize: 'clamp(36px, 5vw, 60px)',
          fontWeight: 800, color: '#fff',
          lineHeight: 1.1, margin: 0, position: 'relative',
        }}>
          {c.home_title}
        </h1>

        <p style={{
          color: 'rgba(255,255,255,.72)', fontSize: '17px',
          lineHeight: 1.7, maxWidth: '520px', margin: 0, position: 'relative',
        }}>
          {c.home_subtitle}
        </p>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center', position: 'relative' }}>
          {badges.map(([label]) => (
            <span key={label} style={{
              padding: '7px 16px', borderRadius: '99px',
              border: '1px solid rgba(255,255,255,.2)',
              background: 'rgba(255,255,255,.1)',
              color: 'rgba(255,255,255,.9)', fontSize: '13px', fontWeight: 600,
            }}>{label}</span>
          ))}
        </div>
      </div>

      {/* ── WAVE ── */}
      <div style={{ background: 'var(--grad-hero)', lineHeight: 0 }}>
        <svg viewBox="0 0 1440 48" preserveAspectRatio="none" style={{ display: 'block', width: '100%', height: '48px' }}>
          <path d="M0,48 C360,0 1080,0 1440,48 L1440,48 L0,48 Z" fill="var(--bg)" />
        </svg>
      </div>

      {/* ── LOGIN CARDS ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 24px 64px', gap: '16px' }}>
        <div style={{ width: '100%', maxWidth: '480px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontFamily: 'var(--fd)', fontSize: '22px', fontWeight: 800, color: 'var(--ink2)', margin: '0 0 6px' }}>
              Pilih cara masuk
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: '14px', margin: 0 }}>Masuk sesuai peranmu untuk memulai.</p>
          </div>

          <Flash ok={sp.ok} />

          <div className="list">
            {s ? (
              <Link className="item" href="/siswa">
                <span style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <span style={{ width: '48px', height: '48px', borderRadius: '14px', flexShrink: 0, background: 'linear-gradient(135deg,#e8524a,#c73b35)', display: 'grid', placeItems: 'center', fontSize: '22px' }}>📚</span>
                  <span>
                    <span className="t">Lanjutkan sebagai {s.nickname}</span>
                    <span className="d">Kelas {s.class} · perangkat ini</span>
                  </span>
                </span>
                <span className="chip">Siswa</span>
              </Link>
            ) : (
              <Link className="item" href="/daftar">
                <span style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <span style={{ width: '48px', height: '48px', borderRadius: '14px', flexShrink: 0, background: 'linear-gradient(135deg,#e8524a,#c73b35)', display: 'grid', placeItems: 'center', fontSize: '22px' }}>📚</span>
                  <span>
                    <span className="t">Masuk sebagai Siswa</span>
                    <span className="d">Daftar dengan nama panggilan &amp; kode sekolah</span>
                  </span>
                </span>
                <span className="chip">Siswa</span>
              </Link>
            )}

            <Link className="item" href="/guru/masuk">
              <span style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ width: '48px', height: '48px', borderRadius: '14px', flexShrink: 0, background: 'linear-gradient(135deg,#0e9f8a,#0a7a68)', display: 'grid', placeItems: 'center', fontSize: '22px' }}>🏫</span>
                <span>
                  <span className="t">Masuk sebagai Guru BK</span>
                  <span className="d">Khusus guru BK · email &amp; kata sandi</span>
                </span>
              </span>
              <span className="chip warn">Guru</span>
            </Link>
          </div>

          <div style={{
            display: 'flex', gap: '10px', alignItems: 'center',
            padding: '14px 18px', borderRadius: 'var(--r)',
            background: 'var(--surface2)', border: '1px solid var(--line)',
          }}>
            <p style={{ fontSize: '12px', color: 'var(--muted)', margin: 0, lineHeight: 1.6 }}>
              Ruang guru dilindungi login. Siswa tidak bisa membuka halaman guru maupun melihat data siswa lain.
            </p>
          </div>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <footer style={{
        textAlign: 'center', padding: '20px 24px',
        borderTop: '1px solid var(--line)',
        fontSize: '12px', color: 'var(--muted)',
        background: 'var(--surface)',
      }}>
        {c.footer_text}
      </footer>
    </div>
  );
}
