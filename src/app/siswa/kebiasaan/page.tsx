import { requireStudent } from '@/lib/session';
import { studentData } from '@/lib/data';
import { saveHabits } from '@/app/actions';
import { HABITS_HELP, HABITS_HINDER } from '@/lib/constants';
import Submit from '@/components/Submit';
import Flash from '@/components/Flash';

export default async function Kebiasaan({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const s = await requireStudent();
  const sp = await searchParams;
  const { plan } = await studentData(s.id);
  const all = [
    ...HABITS_HINDER.map((h) => ({ ...h, pre: 'Kurangi', color: '#f59e0b' })),
    ...HABITS_HELP.map((h) => ({ ...h, pre: 'Mulai/pertahankan', color: 'var(--sec)' })),
  ];

  return (
    <>
      {/* Page header */}
      <div style={{
        background: 'var(--grad)', borderRadius: 'var(--r-lg)',
        padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.10em', textTransform: 'uppercase', color: 'rgba(255,255,255,.6)' }}>
          🗺️ Perencanaan · Langkah 1 dari 3
        </span>
        <h2 style={{ color: '#fff', margin: 0, fontSize: 24 }}>Satu kebiasaan dulu.</h2>
        <p style={{ color: 'rgba(255,255,255,.75)', margin: 0, fontSize: 15, lineHeight: 1.6, maxWidth: 540 }}>
          Tandai kebiasaan yang sudah kamu lakukan, lalu pilih satu yang ingin dicoba minggu ini.
          Tidak ada jawaban salah — kebiasaan yang menghambat bukan tanda kamu malas.
        </p>
      </div>

      <Flash ok={sp.ok} err={sp.err} />

      <form action={saveHabits} style={{ display: 'grid', gap: 20 }}>

        {/* Dua kolom di desktop */}
        <style>{`
          @media (min-width: 700px) {
            .habit-cols { display: grid !important; grid-template-columns: 1fr 1fr; gap: 20px; }
          }
        `}</style>

        <div className="habit-cols" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Kebiasaan membantu */}
          <div className="card" style={{ borderTop: '3px solid var(--sec)', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'var(--sec-tint)', display: 'grid', placeItems: 'center', fontSize: 18,
              }}>✅</div>
              <div>
                <h3 style={{ margin: 0 }}>Kebiasaan yang membantu</h3>
                <p className="small" style={{ margin: 0 }}>Centang yang sudah kamu lakukan</p>
              </div>
            </div>
            <fieldset style={{ gap: 8 }}>
              {HABITS_HELP.map((h) => (
                <label key={h.id} className="choice">
                  <input type="checkbox" name="done" value={h.id} defaultChecked={plan.habits_done.includes(h.id)} />
                  <span style={{ fontSize: 14 }}>{h.label}</span>
                </label>
              ))}
            </fieldset>
          </div>

          {/* Kebiasaan menghambat */}
          <div className="card" style={{ borderTop: '3px solid #f59e0b', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: '#fff7ed', display: 'grid', placeItems: 'center', fontSize: 18,
              }}>⚠️</div>
              <div>
                <h3 style={{ margin: 0 }}>Kebiasaan yang bisa menghambat</h3>
                <p className="small" style={{ margin: 0 }}>Centang yang kadang kamu lakukan</p>
              </div>
            </div>
            <fieldset style={{ gap: 8 }}>
              {HABITS_HINDER.map((h) => (
                <label key={h.id} className="choice">
                  <input type="checkbox" name="done" value={h.id} defaultChecked={plan.habits_done.includes(h.id)} />
                  <span style={{ fontSize: 14 }}>{h.label}</span>
                </label>
              ))}
            </fieldset>
          </div>
        </div>

        {/* Fokus pilihan — full width */}
        <div className="card" style={{ border: '2px solid var(--accent)', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'var(--tint2)', display: 'grid', placeItems: 'center', fontSize: 18,
            }}>🎯</div>
            <div>
              <h3 style={{ margin: 0 }}>Pilih satu kebiasaan untuk dicoba minggu ini</h3>
              <p className="small" style={{ margin: 0 }}>Fokus pada satu hal, bukan semuanya</p>
            </div>
          </div>

          {/* Grid 2 kolom untuk pilihan */}
          <style>{`
            @media (min-width: 700px) {
              .focus-grid { display: grid !important; grid-template-columns: 1fr 1fr; gap: 10px; }
            }
          `}</style>
          <div className="focus-grid" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {all.map((h) => (
              <label key={h.id} className="choice" style={{ alignItems: 'center' }}>
                <input type="radio" name="focus" value={h.id} defaultChecked={plan.habit_focus === h.id} />
                <span>
                  <span style={{
                    fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em',
                    color: h.color, display: 'block', marginBottom: 1,
                  }}>{h.pre}</span>
                  <span style={{ fontSize: 14 }}>{h.label}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <Submit>Simpan pilihan →</Submit>
      </form>
    </>
  );
}
