export const dynamic = 'force-dynamic'
import Link from 'next/link';
import { requireStudent } from '@/lib/session';
import { studentRefleksiData } from '@/lib/data';
import { saveReflection } from '@/app/actions';
import { BARRIER } from '@/lib/constants';
import DraftTextarea from '@/components/DraftTextarea';
import Calendar from '@/components/Calendar';
import Submit from '@/components/Submit';
import Flash from '@/components/Flash';

export default async function Refleksi({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const s = await requireStudent();
  const [sp, d] = await Promise.all([searchParams, studentRefleksiData(s.id)]);
  const last = d.reflections[0];
  const support = last?.support_flag && sp.ok === 'support';
  const talk = last && !last.support_flag && last.barrier === 'ya' && sp.ok === 'refleksi';

  return (
    <>
      <div style={{ background: 'var(--grad)', borderRadius: 'var(--r-lg)', padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.10em', textTransform: 'uppercase', color: 'rgba(255,255,255,.6)' }}>Refleksi diri</span>
        <h2 style={{ color: '#fff', margin: 0, fontSize: 24 }}>Tinjau setelah seminggu.</h2>
        <p style={{ color: 'rgba(255,255,255,.75)', margin: 0, fontSize: 15, lineHeight: 1.6, maxWidth: 500 }}>
          Isi setelah mempraktikkan strategi. Hanya kamu yang bisa membaca refleksi ini.
        </p>
      </div>

      <Flash ok={sp.ok === 'support' ? undefined : sp.ok} err={sp.err} />

      {support && (
        <div className="note">
          <span className="big">Terima kasih sudah menulis.</span>
          Kalau kamu merasa sangat putus asa, kamu tidak harus menghadapinya sendiri. Hubungi guru BK atau orang dewasa yang kamu percaya.
          <Link className="btn" style={{ marginTop: 12 }} href="/siswa/bantuan">Buka Bantuan Guru BK →</Link>
        </div>
      )}
      {talk && (
        <div className="note good">
          <span className="big">Langkah yang berani.</span>
          Kamu memilih ingin berbicara dengan guru BK. Itu langkah yang baik.
          <Link className="btn" style={{ marginTop: 12 }} href="/siswa/bantuan">Ajukan jadwal konsultasi →</Link>
        </div>
      )}

      {/* Form + Calendar side by side di desktop */}
      <style>{`@media(min-width:860px){.refl-layout{display:grid!important;grid-template-columns:1fr 340px;gap:20px;align-items:start}}`}</style>
      <div className="refl-layout" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        <form action={saveReflection} style={{ display: 'grid', gap: 16 }}>
          <div className="card">
            <h3>Refleksiku minggu ini</h3>
            <div>
              <label className="q" htmlFor="r1">Apa yang berhasil?</label>
              <DraftTextarea id="r1" name="r1" storageKey="rsb-draft-r1" placeholder="Strategi atau kebiasaan yang berhasil kamu lakukan..." />
            </div>
            <div>
              <label className="q" htmlFor="r2">Apa kendalanya?</label>
              <DraftTextarea id="r2" name="r2" storageKey="rsb-draft-r2" placeholder="Hal yang sulit atau hambatan yang kamu temui..." />
            </div>
            <div>
              <label className="q" htmlFor="r3">Apa penyesuaian untuk minggu depan?</label>
              <DraftTextarea id="r3" name="r3" storageKey="rsb-draft-r3" placeholder="Apa yang akan kamu ubah atau coba lebih..." />
            </div>
          </div>

          <div className="card">
            <h3>Hambatan belajarmu masih berlanjut?</h3>
            <fieldset style={{ gap: 10 }}>
              {(Object.keys(BARRIER) as Array<keyof typeof BARRIER>).map((k) => (
                <label key={k} className="choice">
                  <input type="radio" name="barrier" value={k} required />
                  <span>{BARRIER[k].long}</span>
                </label>
              ))}
            </fieldset>
          </div>

          <Submit>Simpan refleksi →</Submit>
          <p className="small">Draf tersimpan otomatis. Jangan tulis data pribadi atau rahasia.</p>
        </form>

        {/* Kolom kanan: kalender + riwayat */}
        <div style={{ display: 'grid', gap: 16 }}>
          <Calendar days={d.days} />

          {d.reflections.length > 0 && (
            <details className="card">
              <summary>Refleksi sebelumnya ({d.reflections.length})</summary>
              <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
                {d.reflections.map((r) => (
                  <div key={r.id} style={{
                    padding: '12px 14px', borderRadius: 'var(--r)',
                    background: 'var(--surface2)', border: '1px solid var(--line)',
                    display: 'grid', gap: 6,
                  }}>
                    <span className="small" style={{ fontWeight: 700, color: 'var(--accent)' }}>
                      {new Date(r.created_at).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                    {r.r1 && <p style={{ fontSize: 13, margin: 0 }}><b>Berhasil:</b> {r.r1}</p>}
                    {r.r2 && <p style={{ fontSize: 13, margin: 0 }}><b>Kendala:</b> {r.r2}</p>}
                    {r.r3 && <p style={{ fontSize: 13, margin: 0 }}><b>Penyesuaian:</b> {r.r3}</p>}
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      </div>
    </>
  );
}
