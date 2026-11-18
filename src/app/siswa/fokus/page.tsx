export const dynamic = 'force-dynamic'
import Link from 'next/link';
import { requireStudent } from '@/lib/session';
import { studentPlan } from '@/lib/data';
import { saveFocus } from '@/app/actions';
import Submit from '@/components/Submit';
import Flash from '@/components/Flash';

export default async function Fokus({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const s = await requireStudent();
  const [sp, plan] = await Promise.all([searchParams, studentPlan(s.id)]);

  const tips = [
    ['Notifikasi', 'Matikan atau taruh ponsel di luar jangkauan selama sesi belajar.'],
    ['Tempat belajar', 'Pilih satu tempat yang tenang dan rapi.'],
    ['Siapkan alat', 'Alat tulis, catatan, dan air minum sebelum mulai.'],
    ['Bagi waktu', 'Belajar singkat, lalu istirahat sebentar (misal 25 menit belajar, 5 menit istirahat).'],
  ];

  return (
    <>
      <div style={{ background: 'var(--grad)', borderRadius: 'var(--r-lg)', padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.10em', textTransform: 'uppercase', color: 'rgba(255,255,255,.6)' }}>⚡ Pelaksanaan</span>
        <h2 style={{ color: '#fff', margin: 0, fontSize: 24 }}>Kurangi gangguan, satu rencana saja.</h2>
        <p style={{ color: 'rgba(255,255,255,.75)', margin: 0, fontSize: 15, lineHeight: 1.6, maxWidth: 500 }}>
          Susun rencana konkret untuk mengurangi gangguan saat belajar.
        </p>
      </div>

      <Flash ok={sp.ok} err={sp.err} />

      {/* Tips grid */}
      <style>{`@media(min-width:700px){.tips-grid{display:grid!important;grid-template-columns:1fr 1fr;gap:12px}}`}</style>
      <div className="tips-grid" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {tips.map(([label, desc]) => (
          <div key={String(label)} style={{
            display: 'flex', gap: 12, padding: '14px 16px',
            background: 'var(--surface)', border: '1px solid var(--line)',
            borderRadius: 'var(--r)', alignItems: 'flex-start',
            boxShadow: 'var(--shadow-sm)',
          }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink2)' }}>{label}</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 3, lineHeight: 1.5 }}>{desc}</div>
            </div>
          </div>
        ))}
      </div>

      <form action={saveFocus} className="card">
        <h3>Rencanaku</h3>
        <style>{`@media(min-width:700px){.focus-form{display:grid!important;grid-template-columns:1fr 1fr;gap:16px}}.focus-form-full{grid-column:1/-1}`}</style>
        <div className="focus-form" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="q" htmlFor="notif">Apa yang kamu lakukan dengan notifikasi?</label>
            <input type="text" id="notif" name="notif" maxLength={300} autoComplete="off"
              defaultValue={plan.focus_notif} placeholder="Contoh: Mode senyap selama 30 menit" />
          </div>
          <div>
            <label className="q" htmlFor="place">Di mana tempat belajarmu?</label>
            <input type="text" id="place" name="place" maxLength={300} autoComplete="off"
              defaultValue={plan.focus_place} placeholder="Contoh: Meja belajar di kamar" />
          </div>
          <div className="focus-form-full">
            <label className="q" htmlFor="tools">Alat apa yang perlu disiapkan?</label>
            <input type="text" id="tools" name="tools" maxLength={300} autoComplete="off"
              defaultValue={plan.focus_tools} placeholder="Contoh: Buku catatan, pulpen, air minum" />
          </div>
        </div>
        <Submit>Simpan Rencana Fokus</Submit>
        <p className="small">Gunakan contoh umum, bukan data pribadi.</p>
      </form>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <Link href="/siswa/strategi" className="btn ghost" style={{ width: 'auto', minHeight: 40, padding: '8px 16px', fontSize: 13 }}>
          ← Sebelumnya: Strategi Belajar
        </Link>
        <Link href="/siswa/refleksi" className="btn ghost" style={{ width: 'auto', minHeight: 40, padding: '8px 16px', fontSize: 13 }}>
          Lanjut ke Refleksi Mingguan →
        </Link>
      </div>
    </>
  );
}
