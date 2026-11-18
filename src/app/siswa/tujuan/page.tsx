import { requireStudent } from '@/lib/session';
import { studentData } from '@/lib/data';
import { saveGoal } from '@/app/actions';
import DraftTextarea from '@/components/DraftTextarea';
import Submit from '@/components/Submit';
import Flash from '@/components/Flash';

export default async function Tujuan({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const s = await requireStudent();
  const sp = await searchParams;
  const { plan } = await studentData(s.id);

  return (
    <>
      <div style={{ background: 'var(--grad)', borderRadius: 'var(--r-lg)', padding: '20px 22px' }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.10em', textTransform: 'uppercase', color: 'rgba(255,255,255,.65)' }}>Perencanaan</span>
        <h2 style={{ color: '#fff', margin: '4px 0 0', fontSize: 22 }}>Satu tujuan untuk satu minggu.</h2>
        <p style={{ color: 'rgba(255,255,255,.75)', margin: '6px 0 0', fontSize: 14, lineHeight: 1.6 }}>
          Tujuan yang spesifik dan realistis lebih mudah dicapai.
        </p>
      </div>

      <Flash ok={sp.ok} err={sp.err} />

      {/* Contoh card */}
      <div className="card">
        <div style={{ display: 'flex', gap: 12 }}>
          <span style={{ fontSize: 20, flexShrink: 0 }}>💡</span>
          <div style={{ display: 'grid', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <span className="chip warn" style={{ flexShrink: 0 }}>Kurang jelas</span>
              <span style={{ fontSize: 14, color: 'var(--muted)' }}>"Aku mau lebih rajin belajar."</span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <span className="chip ok" style={{ flexShrink: 0 }}>Lebih jelas</span>
              <span style={{ fontSize: 14, color: 'var(--ink2)' }}>"Minggu ini aku menjawab 5 soal Matematika tanpa melihat catatan, Selasa dan Kamis pukul 19.00."</span>
            </div>
          </div>
        </div>
      </div>

      <form action={saveGoal} className="card">
        <div>
          <label className="q" htmlFor="goal">🎯 Tulis satu tujuan belajarmu untuk satu minggu</label>
          <DraftTextarea
            id="goal" name="goal" storageKey="rsb-draft-goal"
            defaultValue={plan.goal} maxLength={500}
            placeholder="Contoh: Minggu ini aku berlatih soal Biologi tanpa melihat catatan, 2 kali."
          />
        </div>
        <Submit>Simpan tujuan →</Submit>
        <p className="small">Draf tersimpan otomatis. Gunakan contoh fiktif, bukan data pribadi.</p>
      </form>
    </>
  );
}
