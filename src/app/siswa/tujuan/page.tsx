export const dynamic = 'force-dynamic'
import Link from 'next/link';
import { requireStudent } from '@/lib/session';
import { studentPlan } from '@/lib/data';
import { saveGoal } from '@/app/actions';
import DraftTextarea from '@/components/DraftTextarea';
import Submit from '@/components/Submit';
import Flash from '@/components/Flash';

export default async function Tujuan({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const s = await requireStudent();
  const [sp, plan] = await Promise.all([searchParams, studentPlan(s.id)]);

  return (
    <>
      <div style={{ background: 'var(--grad)', borderRadius: 'var(--r-lg)', padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.10em', textTransform: 'uppercase', color: 'rgba(255,255,255,.65)' }}>
          Perencanaan · Langkah 2 dari 3
        </span>
        <h2 style={{ color: '#fff', margin: 0, fontSize: 24 }}>Satu tujuan untuk satu minggu.</h2>
        <p style={{ color: 'rgba(255,255,255,.78)', margin: 0, fontSize: 15, lineHeight: 1.6, maxWidth: 540 }}>
          Tujuan yang spesifik dan realistis jauh lebih mudah dicapai daripada target yang terlalu umum.
        </p>
      </div>

      <Flash ok={sp.ok} err={sp.err} />

      {/* Contoh card */}
      <div className="card">
        <div style={{ display: 'flex', gap: 12 }}>
          <span style={{ fontSize: 22, flexShrink: 0 }} />          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span className="chip warn" style={{ flexShrink: 0 }}>Kurang jelas</span>
              <span style={{ fontSize: 14, color: 'var(--muted)' }}>&ldquo;Aku mau lebih rajin belajar.&rdquo;</span>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span className="chip ok" style={{ flexShrink: 0 }}>Lebih jelas</span>
              <span style={{ fontSize: 14, color: 'var(--ink2)', fontWeight: 600 }}>
                &ldquo;Minggu ini aku menjawab 5 soal Matematika tanpa melihat catatan, Selasa dan Kamis pukul 19.00.&rdquo;
              </span>
            </div>
          </div>
        </div>
      </div>

      <form action={saveGoal} className="card" style={{ borderTop: '3px solid var(--accent)' }}>
        <div>
          <label className="q" htmlFor="goal">Tulis satu tujuan belajarmu untuk satu minggu</label>
          <DraftTextarea
            id="goal" name="goal" storageKey="rsb-draft-goal"
            defaultValue={plan.goal} maxLength={500}
            placeholder="Contoh: Minggu ini aku berlatih soal Biologi tanpa melihat catatan, 2 kali."
          />
        </div>
        <Submit>Simpan Tujuan Mingguan</Submit>
        <p className="small">Draf tersimpan otomatis di perangkat ini. Gunakan contoh umum, bukan data rahasia.</p>
      </form>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <Link href="/siswa/kebiasaan" className="btn ghost" style={{ width: 'auto', minHeight: 40, padding: '8px 16px', fontSize: 13 }}>
          ← Sebelumnya: Kebiasaan
        </Link>
        <Link href="/siswa/waktu" className="btn ghost" style={{ width: 'auto', minHeight: 40, padding: '8px 16px', fontSize: 13 }}>
          Langkah Berikutnya: Atur Waktu →
        </Link>
      </div>
    </>
  );
}
