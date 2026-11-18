export const dynamic = 'force-dynamic'
import Link from 'next/link';
import { requireStudent } from '@/lib/session';
import { studentPlan } from '@/lib/data';
import { saveSchedule } from '@/app/actions';
import { SCHED } from '@/lib/constants';
import { fmtDate, todayJakarta } from '@/lib/util';
import PrintButton from '@/components/PrintButton';
import Submit from '@/components/Submit';
import Flash from '@/components/Flash';

export default async function Waktu({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const s = await requireStudent();
  const [sp, plan] = await Promise.all([searchParams, studentPlan(s.id)]);
  const start = plan.sched_start;
  const topic = plan.sched_topic || 'Materi pilihanmu';

  const schedIcons = ['', '', '', '', ''];

  return (
    <>
      <div style={{ background: 'var(--grad)', borderRadius: 'var(--r-lg)', padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.10em', textTransform: 'uppercase', color: 'rgba(255,255,255,.65)' }}>
          Perencanaan · Langkah 3 dari 3
        </span>
        <h2 style={{ color: '#fff', margin: 0, fontSize: 24 }}>Jadwal ulang bertahap.</h2>
        <p style={{ color: 'rgba(255,255,255,.78)', margin: 0, fontSize: 15, lineHeight: 1.6, maxWidth: 540 }}>
          Mengulang materi dengan jeda (Hari ke-1, 3, 7, dan 14) terbukti jauh lebih efektif daripada belajar sekaligus semalaman menjelang ujian.
        </p>
      </div>

      <Flash ok={sp.ok} err={sp.err} />

      <form action={saveSchedule} className="card no-print">
        <h3>Buat jadwal ulang</h3>
        <div>
          <label className="q" htmlFor="start">Tanggal belajar pertama</label>
          <input type="date" id="start" name="start" defaultValue={start ?? todayJakarta()} required />
        </div>
        <div>
          <label className="q" htmlFor="topic">Materi yang dipelajari</label>
          <input type="text" id="topic" name="topic" maxLength={60} autoComplete="off"
            placeholder="Contoh: Sel dan jaringan" defaultValue={plan.sched_topic} />
        </div>
        <Submit>Buat jadwal →</Submit>
      </form>

      {start && (
        <div className="card">
          <h3>Jadwal belajarku: {topic}</h3>
          <div style={{ display: 'grid', gap: 8 }}>
            {SCHED.map(([label, add], i) => (
              <div key={label} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '12px 16px',
                background: i === 0 ? 'var(--tint)' : 'var(--surface2)',
                borderRadius: 'var(--r)',
                border: `1.5px solid ${i === 0 ? 'var(--accent)' : 'var(--line)'}`,
              }}>
                <span style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: i === 0 ? 'var(--grad)' : 'var(--surface)',
                  display: 'grid', placeItems: 'center', fontSize: 16,
                  border: '1px solid var(--line)',
                }}>{schedIcons[i]}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink2)' }}>{label}</div>
                  <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 1 }}>{fmtDate(start, add)}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>
                    {add ? 'Latihan mengingat kembali tanpa melihat catatan' : `Pelajari ${topic}`}
                  </div>
                </div>
                {i === 0 && <span className="chip">Mulai</span>}
              </div>
            ))}
          </div>
          <PrintButton />
          <p className="small no-print">Tidak ada internet? Cetak atau salin ke buku catatan.</p>
        </div>
      )}

      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <Link href="/siswa/tujuan" className="btn ghost" style={{ width: 'auto', minHeight: 40, padding: '8px 16px', fontSize: 13 }}>
          ← Sebelumnya: Tujuan
        </Link>
        <Link href="/siswa/strategi" className="btn ghost" style={{ width: 'auto', minHeight: 40, padding: '8px 16px', fontSize: 13 }}>
          Lanjut ke Pelaksanaan: Strategi Belajar →
        </Link>
      </div>
    </>
  );
}
