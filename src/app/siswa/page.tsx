export const dynamic = 'force-dynamic'
import Link from 'next/link';
import { requireStudent } from '@/lib/session';
import { studentData } from '@/lib/data';
import { giveConsent } from '@/app/actions';
import { HABITS_HELP, HABITS_HINDER, STRATEGIES } from '@/lib/constants';
import { fmtDate } from '@/lib/util';
import Submit from '@/components/Submit';
import Flash from '@/components/Flash';
import Calendar from '@/components/Calendar';

type Row = [href: string, title: string, desc: string, done: boolean, icon: string];

export default async function Beranda({ searchParams }: { searchParams: Promise<{ err?: string }> }) {
  const s = await requireStudent({ consent: false });
  const sp = await searchParams;

  /* ── Consent ── */
  if (!s.consent_at) {
    return (
      <>
        <div style={{
          background: 'var(--grad-hero)', borderRadius: 'var(--r-xl)',
          padding: '40px 36px', color: '#fff',
          display: 'flex', flexDirection: 'column', gap: 14,
          boxShadow: '0 12px 36px rgba(232,82,74,.26)',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', right: -40, top: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,.08)', pointerEvents: 'none' }} />
          <span style={{
            alignSelf: 'flex-start', padding: '5px 14px', borderRadius: 99,
            background: 'rgba(255,255,255,.16)', fontSize: 12, fontWeight: 700,
            letterSpacing: '.06em', textTransform: 'uppercase',
          }}>
            👋 Selamat datang, {s.nickname} · Kelas {s.class}
          </span>
          <h2 style={{ color: '#fff', fontSize: 'clamp(24px, 4vw, 32px)', margin: 0, lineHeight: 1.2 }}>
            Satu strategi belajar, dicoba satu minggu.
          </h2>
          <p style={{ opacity: .88, fontSize: 15, margin: 0, lineHeight: 1.65, maxWidth: 580 }}>
            Kenali kebiasaanmu, tetapkan satu tujuan sederhana, susun jadwal ulang, berlatih mengingat kembali, lalu refleksikan hasilnya. Tidak ada jawaban benar atau salah.
          </p>
        </div>
        <Flash err={sp.err} />
        <div className="card" style={{ padding: '24px 26px', gap: 18 }}>
          <div>
            <span className="eyebrow">Privasi &amp; Kenyamanan</span>
            <h3 style={{ fontSize: 18 }}>📋 Sebelum mulai, pahami dulu cara kerja ruang ini</h3>
          </div>
          <style>{`@media(min-width:600px){.consent-g{display:grid!important;grid-template-columns:1fr 1fr;gap:12px}}`}</style>
          <div className="consent-g" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {([
              ['📝', 'Data yang dicatat', 'Nama panggilan, kelas, rencana belajar, latihan kuis, refleksi, dan jadwal konsultasi.'],
              ['👁️', 'Siapa yang bisa melihat', 'Hanya kamu. Guru BK hanya melihat bagian yang kamu izinkan. Siswa lain tidak punya akses.'],
              ['🛡️', 'Aman & Minimalis', 'Tanpa iklan, tanpa pelacak pihak ketiga, dan kamu bisa menghapus seluruh datamu kapan saja.'],
              ['🤝', 'Pendamping Belajar', 'Aplikasi ini membantumu mengatur strategi belajar mandiri bersama Guru BK di sekolah.'],
            ] as [string, string, string][]).map(([icon, label, desc]) => (
              <div key={label} style={{
                display: 'flex', gap: 14, padding: '16px',
                background: 'var(--surface2)', borderRadius: 'var(--r)',
                border: '1px solid var(--line)', alignItems: 'flex-start',
              }}>
                <span style={{
                  width: 40, height: 40, borderRadius: 12,
                  background: '#fff', display: 'grid', placeItems: 'center',
                  fontSize: 20, flexShrink: 0, boxShadow: 'var(--shadow-sm)',
                }}>{icon}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink2)' }}>{label}</div>
                  <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4, lineHeight: 1.5 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <form action={giveConsent} style={{ display: 'grid', gap: 14 }}>
          <label className="choice" style={{ background: 'var(--tint)', borderColor: 'var(--accent)', borderWidth: 2, padding: '16px 18px' }}>
            <input type="checkbox" name="agree" required />
            <span style={{ fontWeight: 700, color: 'var(--ink2)' }}>Aku sudah membaca dan setuju menggunakan Ruang Strategi Belajar.</span>
          </label>
          <Submit>Mulai Perjalanan Belajarku →</Submit>
        </form>
      </>
    );
  }

  /* ── Dashboard ── */
  const d = await studentData(s.id);
  const p = d.plan;

  const allHabits = [...HABITS_HELP, ...HABITS_HINDER];
  const focusHabitLabel = allHabits.find((h) => h.id === p.habit_focus)?.label ?? null;
  const strategyLabels = STRATEGIES.filter((st) => p.strategies.includes(st.id)).map((st) => st.label);

  const groups: Array<{ phase: string; subtitle: string; icon: string; accent: string; bg: string; border: string; rows: Row[] }> = [
    {
      phase: '1. Perencanaan',
      subtitle: 'Susun fondasi belajarmu minggu ini',
      icon: '🗺️',
      accent: '#e8524a',
      bg: '#fff0ef',
      border: '#fad9d7',
      rows: [
        ['/siswa/kebiasaan', 'Kenali Kebiasaan', focusHabitLabel ? `Fokus: ${focusHabitLabel}` : 'Tandai kebiasaanmu, pilih satu untuk dicoba', !!p.habit_focus, '🔍'],
        ['/siswa/tujuan', 'Tetapkan Tujuan', p.goal ? `Tujuan: "${p.goal.slice(0, 55)}${p.goal.length > 55 ? '…' : ''}"` : 'Tulis satu tujuan spesifik untuk satu minggu', !!p.goal, '🎯'],
        ['/siswa/waktu', 'Atur Waktu', p.sched_start ? `Mulai ${fmtDate(p.sched_start) ?? p.sched_start}${p.sched_topic ? ` · ${p.sched_topic}` : ''}` : 'Buat jadwal ulang bertahap (hari 1, 3, 7, 14)', !!p.sched_start, '⏰'],
      ],
    },
    {
      phase: '2. Pelaksanaan',
      subtitle: 'Praktikkan strategi & jaga fokus',
      icon: '⚡',
      accent: '#2a9d8f',
      bg: '#e8f7f5',
      border: '#c0eae5',
      rows: [
        ['/siswa/strategi', 'Strategi & Kuis', d.quiz ? `Kuis selesai (${d.quiz.score}/${d.quiz.total} benar)` : 'Pelajari strategi efektif & kerjakan kuis latihan', !!d.quiz || p.strategies.length > 0, '📚'],
        ['/siswa/fokus', 'Fokus Belajar', p.focus_notif || p.focus_place || p.focus_tools ? 'Rencana pengurang gangguan sudah tersimpan' : 'Susun rencana mengurangi gangguan saat belajar', !!(p.focus_notif || p.focus_place || p.focus_tools), '🎧'],
      ],
    },
    {
      phase: '3. Evaluasi & Dukungan',
      subtitle: 'Tinjau hasil & diskusi dengan Guru BK',
      icon: '🪞',
      accent: '#7c5cbf',
      bg: '#f3eeff',
      border: '#ddd0f7',
      rows: [
        ['/siswa/refleksi', 'Refleksi Mingguan', d.reflections.length > 0 ? `${d.reflections.length} catatan refleksi tersimpan` : 'Catat yang berhasil dan kendala yang dihadapi', d.reflections.length > 0, '🪞'],
        ['/siswa/bantuan', 'Bantuan Guru BK', d.requests.length > 0 ? `${d.requests.length} jadwal konsultasi diajukan` : 'Atur privasi berbagi data & jadwal konsultasi', d.requests.length > 0 || s.share_summary, '💬'],
      ],
    },
  ];

  const core = groups.flatMap((g) => g.rows).filter((r) => r[0] !== '/siswa/bantuan');
  const doneN = core.filter((r) => r[3]).length;
  const pct = Math.round((doneN / core.length) * 100);
  const nextStep = core.find((r) => !r[3]) ?? core[0];

  // Stats for mini cards
  const hariIni = d.days.includes(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }));
  const totalHari = d.days.length;
  const reflCount = d.reflections.length;

  // Ring SVG geometry
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (pct / 100) * circumference;

  const hasPlanSummary = !!(focusHabitLabel || p.goal || p.sched_start || strategyLabels.length > 0);

  return (
    <>
      {/* ══ HERO BANNER ══ */}
      <div style={{
        background: 'var(--grad-hero)', borderRadius: 'var(--r-xl)',
        padding: '32px 34px', color: '#fff',
        boxShadow: '0 12px 36px rgba(232,82,74,.24)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', right: -60, top: -60, width: 240, height: 240, borderRadius: '50%', background: 'rgba(255,255,255,.07)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', right: 100, bottom: -80, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,.05)', pointerEvents: 'none' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20, position: 'relative' }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              <span style={{
                background: 'rgba(255,255,255,.18)', borderRadius: 99,
                padding: '4px 12px', fontSize: 12, fontWeight: 700, letterSpacing: '.04em',
              }}>
                👋 Halo, {s.nickname} · Kelas {s.class}
              </span>
              {hariIni ? (
                <span style={{ background: 'rgba(42,157,143,.9)', borderRadius: 99, padding: '4px 12px', fontSize: 12, fontWeight: 700 }}>
                  🔥 Aktif berlatih hari ini
                </span>
              ) : (
                <span style={{ background: 'rgba(255,255,255,.14)', borderRadius: 99, padding: '4px 12px', fontSize: 12, fontWeight: 600 }}>
                  ✨ Yuk lanjutkan langkahmu hari ini
                </span>
              )}
            </div>

            <h2 style={{ color: '#fff', fontSize: 'clamp(22px, 3.5vw, 30px)', margin: '4px 0 8px', lineHeight: 1.2 }}>
              {doneN === core.length
                ? 'Luar biasa! Semua langkah minggu ini sudah lengkap 🎉'
                : 'Mau lanjutkan langkah yang mana hari ini?'}
            </h2>
            <p style={{ color: 'rgba(255,255,255,.82)', fontSize: 14, margin: '0 0 18px', maxWidth: 520, lineHeight: 1.55 }}>
              Kamu sudah menyelesaikan <b>{doneN} dari {core.length} langkah utama</b>. Lakukan perlahan satu per satu — konsistensi kecil jauh lebih berdampak.
            </p>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <Link href={nextStep[0]} style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: '#fff', color: 'var(--accent)',
                padding: '10px 20px', borderRadius: 12,
                fontWeight: 800, fontSize: 14, textDecoration: 'none',
                boxShadow: '0 4px 14px rgba(0,0,0,.12)',
              }}>
                <span>{nextStep[4]}</span>
                <span>{doneN === core.length ? 'Tinjau Kembali: ' : 'Lanjut: '}{nextStep[1]} →</span>
              </Link>
              <Link href="/siswa/bantuan" style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'rgba(255,255,255,.15)', color: '#fff',
                border: '1px solid rgba(255,255,255,.28)',
                padding: '10px 16px', borderRadius: 12,
                fontWeight: 700, fontSize: 13, textDecoration: 'none',
              }}>
                💬 Hubungi Guru BK
              </Link>
            </div>
          </div>

          {/* Circular SVG Progress Ring */}
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            background: 'rgba(255,255,255,.12)', padding: '16px 20px',
            borderRadius: 22, border: '1px solid rgba(255,255,255,.2)',
            backdropFilter: 'blur(6px)', flexShrink: 0,
          }}>
            <div style={{ position: 'relative', width: 92, height: 92, display: 'grid', placeItems: 'center' }}>
              <svg width="92" height="92" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="46" cy="46" r={radius} stroke="rgba(255,255,255,.22)" strokeWidth="8" fill="none" />
                <circle
                  cx="46"
                  cy="46"
                  r={radius}
                  stroke="#ffffff"
                  strokeWidth="8"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
              <div style={{ position: 'absolute', textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--fd)', fontSize: 22, fontWeight: 800, color: '#fff', lineHeight: 1 }}>{pct}%</div>
                <div style={{ fontSize: 10, opacity: .8, fontWeight: 700, marginTop: 2 }}>{doneN}/{core.length}</div>
              </div>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, opacity: .9 }}>Progres Minggu Ini</span>
          </div>
        </div>
      </div>

      {/* ══ STAT MINI CARDS ══ */}
      <style>{`
        @media(min-width:640px){.stat-row{grid-template-columns:repeat(4,1fr)!important}}
        @media(min-width:880px){.phase-grid{display:grid!important;grid-template-columns:repeat(3,1fr);gap:18px;align-items:start}}
        @media(min-width:720px){.summary-grid{grid-template-columns:repeat(2,1fr)!important}}
      `}</style>
      <div className="stat-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {([
          ['📅', String(totalHari), 'Hari berlatih bulan ini', '#e8524a', '#fff0ef'],
          ['✅', `${doneN}/${core.length}`, 'Langkah selesai', '#2a9d8f', '#e8f7f5'],
          ['🧠', d.quiz ? `${d.quiz.score}/${d.quiz.total}` : 'Belum', 'Skor kuis terakhir', '#d97706', '#fffbeb'],
          ['🪞', String(reflCount), 'Refleksi ditulis', '#7c5cbf', '#f3eeff'],
        ] as [string, string, string, string, string][]).map(([icon, val, label, color, bg]) => (
          <div key={label} style={{
            background: 'var(--surface)', border: '1.5px solid var(--line)',
            borderTop: `3px solid ${color}`,
            borderRadius: 'var(--r-lg)', padding: '16px 18px',
            display: 'flex', alignItems: 'center', gap: 13,
            boxShadow: 'var(--shadow-sm)',
          }}>
            <span style={{
              width: 44, height: 44, borderRadius: 13,
              background: bg, display: 'grid', placeItems: 'center',
              fontSize: 20, flexShrink: 0,
            }}>{icon}</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--fd)', fontSize: 22, fontWeight: 800, color, lineHeight: 1.1 }}>{val}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3, fontWeight: 600 }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ══ RINGKASAN RENCANA BELAJARKU (Jika sudah ada yang diisi) ══ */}
      {hasPlanSummary && (
        <div className="card" style={{
          background: 'linear-gradient(180deg, #ffffff 0%, #fdf8f3 100%)',
          border: '1.5px solid var(--line)',
          padding: '20px 24px',
          gap: 14,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>📌</span>
              <h3 style={{ margin: 0, fontSize: 16 }}>Ringkasan Rencana Belajarku</h3>
            </div>
            <span className="chip ok">Aktif Minggu Ini</span>
          </div>
          <div className="summary-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
            <div style={{ padding: '12px 14px', borderRadius: 12, background: '#fff', border: '1px solid var(--line)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent)', letterSpacing: '.05em' }}>
                🔍 Kebiasaan Fokus
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink2)', marginTop: 4 }}>
                {focusHabitLabel ?? 'Belum dipilih'}
              </div>
            </div>
            <div style={{ padding: '12px 14px', borderRadius: 12, background: '#fff', border: '1px solid var(--line)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--sec)', letterSpacing: '.05em' }}>
                ⏰ Jadwal Ulang Materi
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink2)', marginTop: 4 }}>
                {p.sched_start ? `${p.sched_topic || 'Materi pilihan'} · Mulai ${fmtDate(p.sched_start) ?? p.sched_start}` : 'Belum diatur'}
              </div>
            </div>
            {p.goal && (
              <div style={{ padding: '12px 14px', borderRadius: 12, background: '#fff', border: '1px solid var(--line)', gridColumn: '1 / -1' }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#7c5cbf', letterSpacing: '.05em' }}>
                  🎯 Target Mingguan
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink2)', marginTop: 4, lineHeight: 1.5 }}>
                  “{p.goal}”
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ PHASE GROUPS (3 TAHAP UTAMA) ══ */}
      <div className="phase-grid" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {groups.map((g) => {
          const doneInGroup = g.rows.filter((r) => r[3]).length;
          return (
            <section key={g.phase} style={{
              background: 'var(--surface)',
              border: '1.5px solid var(--line)',
              borderRadius: 'var(--r-lg)',
              padding: '16px',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex', flexDirection: 'column', gap: 12,
            }}>
              {/* Phase header */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 14px', borderRadius: 14,
                background: g.bg, border: `1px solid ${g.border}`,
              }}>
                <span style={{
                  width: 38, height: 38, borderRadius: 10,
                  background: '#fff', display: 'grid', placeItems: 'center',
                  fontSize: 18, flexShrink: 0, boxShadow: '0 2px 6px rgba(0,0,0,.05)',
                }}>{g.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--fd)', fontWeight: 800, fontSize: 15, color: g.accent }}>{g.phase}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>{g.subtitle}</div>
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 800,
                  background: g.accent, color: '#fff',
                  padding: '3px 9px', borderRadius: 99,
                }}>
                  {doneInGroup}/{g.rows.length}
                </span>
              </div>

              {/* Items */}
              <div style={{ display: 'grid', gap: 10 }}>
                {g.rows.map(([href, title, desc, done, icon]) => (
                  <Link key={href} href={href} className="phase-item" style={{
                    display: 'flex', alignItems: 'center', gap: 13,
                    padding: '14px 15px',
                    background: done ? g.bg : 'var(--surface2)',
                    border: `1.5px solid ${done ? g.border : 'var(--line)'}`,
                    borderRadius: 16,
                    textDecoration: 'none',
                    position: 'relative',
                    overflow: 'hidden',
                  }}>
                    {done && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: g.accent }} />}
                    <span style={{
                      width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                      background: done ? g.accent : '#fff',
                      color: done ? '#fff' : 'var(--ink2)',
                      display: 'grid', placeItems: 'center', fontSize: 19,
                      boxShadow: done ? `0 3px 10px ${g.accent}40` : 'var(--shadow-sm)',
                    }}>{icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--ink2)' }}>{title}</span>
                        {done && (
                          <span style={{
                            fontSize: 10, fontWeight: 800,
                            padding: '1px 7px', borderRadius: 99,
                            background: '#fff', color: g.accent,
                            border: `1px solid ${g.border}`,
                          }}>
                            Selesai
                          </span>
                        )}
                      </div>
                      <div style={{
                        fontSize: 12, color: 'var(--muted)', marginTop: 3, lineHeight: 1.4,
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      }}>
                        {desc}
                      </div>
                    </div>
                    <span style={{
                      width: 28, height: 28, borderRadius: 99, flexShrink: 0,
                      background: done ? g.accent : '#fff',
                      display: 'grid', placeItems: 'center',
                      fontSize: 13, fontWeight: 800,
                      color: done ? '#fff' : 'var(--muted)',
                      border: `1.5px solid ${done ? g.accent : 'var(--line)'}`,
                    }}>
                      {done ? '✓' : '→'}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {/* ══ KALENDER ══ */}
      <Calendar days={d.days} />

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
        padding: '16px 20px', borderRadius: 'var(--r-lg)',
        background: 'var(--surface)', border: '1.5px solid var(--line)',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--tint)', display: 'grid', placeItems: 'center', fontSize: 20 }}>💬</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--ink2)' }}>Ingin berdiskusi langsung dengan Guru BK?</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Kamu memegang kendali penuh atas data apa saja yang ingin dibagikan.</div>
          </div>
        </div>
        <Link href="/siswa/bantuan" style={{
          padding: '9px 16px', borderRadius: 10,
          background: 'var(--tint)', color: 'var(--accent)',
          border: '1.5px solid var(--tint2)',
          fontWeight: 800, fontSize: 13, textDecoration: 'none',
        }}>
          Buka Bantuan BK →
        </Link>
      </div>
    </>
  );
}
