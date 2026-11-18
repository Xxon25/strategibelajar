export const dynamic = 'force-dynamic'
import Link from 'next/link';
import { requireStudent } from '@/lib/session';
import { studentStrategiData, getSiteContent } from '@/lib/data';
import { saveStrategies } from '@/app/actions';
import { STRATEGIES } from '@/lib/constants';
import Quiz from '@/components/Quiz';
import Submit from '@/components/Submit';
import Flash from '@/components/Flash';

const DEFAULT_INTRO =
  'Tutup catatan, lalu coba jawab atau jelaskan materi dengan kata-katamu sendiri. Setelah itu, periksa catatan dan perbaiki yang belum tepat.';

export default async function Strategi({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const s = await requireStudent();
  const [sp, { strategies, quiz }, content] = await Promise.all([
    searchParams,
    studentStrategiData(s.id),
    getSiteContent(),
  ]);
  const intro = content.strategi_intro?.trim() || DEFAULT_INTRO;

  return (
    <>
      <div style={{ background: 'var(--grad)', borderRadius: 'var(--r-lg)', padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.10em', textTransform: 'uppercase', color: 'rgba(255,255,255,.65)' }}>
          ⚡ Pelaksanaan · Langkah 1 dari 2
        </span>
        <h2 style={{ color: '#fff', margin: 0, fontSize: 24 }}>Latihan mengingat kembali.</h2>
        <p style={{ color: 'rgba(255,255,255,.78)', margin: 0, fontSize: 15, lineHeight: 1.6, maxWidth: 540 }}>
          Pelajari strategi belajar yang terbukti efektif secara ilmiah, pilih strategi untuk minggu ini, lalu uji pemahamanmu lewat kuis singkat.
        </p>
      </div>

      <Flash ok={sp.ok} err={sp.err} />

      {/* Info card */}
      <div className="card">
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <span style={{ fontSize: 24, flexShrink: 0 }}>📚</span>
          <div>
            <h3 style={{ marginBottom: 6 }}>Latihan mengingat kembali</h3>
            <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6 }}>
              {intro}
            </p>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 8, lineHeight: 1.5 }}>
              Strategi ini dan belajar terdistribusi dinilai efektif tinggi (Dunlosky et al., 2013).
              Membaca ulang dan menandai teks tidak konsisten membantu.
            </p>
          </div>
        </div>
      </div>

      {/* Pilih strategi */}
      <form action={saveStrategies} className="card">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 20 }}>⚡</span>
          <h3>Strategi yang ingin kamu coba minggu ini</h3>
        </div>
        <fieldset>
          {STRATEGIES.map((st) => (
            <label key={st.id} className="choice">
              <input type="checkbox" name="s" value={st.id} defaultChecked={strategies.includes(st.id)} />
              <span>
                <span style={{ fontWeight: 700, display: 'block', marginBottom: 2 }}>{st.label}</span>
                <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 400 }}>{st.desc}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <Submit>Simpan pilihan strategi →</Submit>
      </form>

      {/* Kuis */}
      <div className="card" style={{ borderColor: 'var(--accent)', borderWidth: 1.5 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 20 }}>🧠</span>
          <div>
            <h3>Kuis mandiri</h3>
            <p className="small" style={{ marginTop: 2 }}>Tanpa penilaian — hanya untuk melatih ingatan</p>
          </div>
        </div>
        <Quiz last={quiz} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <Link href="/siswa/waktu" className="btn ghost" style={{ width: 'auto', minHeight: 40, padding: '8px 16px', fontSize: 13 }}>
          ← Sebelumnya: Atur Waktu
        </Link>
        <Link href="/siswa/fokus" className="btn ghost" style={{ width: 'auto', minHeight: 40, padding: '8px 16px', fontSize: 13 }}>
          Langkah Berikutnya: Fokus Belajar →
        </Link>
      </div>
    </>
  );
}
