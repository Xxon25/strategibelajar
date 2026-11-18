export const dynamic = 'force-dynamic'
import Link from 'next/link';
import { requireStudent } from '@/lib/session';
import { studentData } from '@/lib/data';
import { giveConsent } from '@/app/actions';
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
        <div style={{ background: 'var(--grad)', borderRadius: 'var(--r-xl)', padding: '36px 40px', color: '#fff', display: 'flex', flexDirection: 'column', gap: 12, boxShadow: '0 8px 32px rgba(232,82,74,.25)' }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.10em', textTransform: 'uppercase', opacity: .7 }}>Halo, {s.nickname} 👋</span>
          <h2 style={{ color: '#fff', fontSize: 28, margin: 0 }}>Satu strategi, dicoba satu minggu.</h2>
          <p style={{ opacity: .85, fontSize: 15, margin: 0, lineHeight: 1.65, maxWidth: 560 }}>Kenali kebiasaan, tentukan satu tujuan, susun jadwal, berlatih mengingat kembali, lalu refleksikan hasilnya. Tidak ada jawaban benar atau salah.</p>
        </div>
        <Flash err={sp.err} />
        <div className="card">
          <h3>📋 Sebelum mulai, baca dulu</h3>
          <style>{`@media(min-width:600px){.consent-g{display:grid!important;grid-template-columns:1fr 1fr;gap:12px}}`}</style>
          <div className="consent-g" style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {([['📝','Data yang dicatat','Nama panggilan, kelas, rencana belajar, hasil kuis, refleksi, dan jadwal konsultasi.'],['👁️','Yang bisa melihat','Hanya kamu. Guru BK hanya melihat yang kamu izinkan. Siswa lain tidak punya akses.'],['🚫','Tidak ada','Iklan, pelacak pihak ketiga, atau penjualan data. Jangan tulis data pribadi.'],['⚠️','Perlu diketahui','RSB tidak mendiagnosis atau memberi label. RSB bukan pengganti guru BK.']] as [string,string,string][]).map(([icon,label,desc]) => (
              <div key={label} style={{ display:'flex', gap:12, padding:'14px', background:'var(--surface2)', borderRadius:'var(--r)', alignItems:'flex-start' }}>
                <span style={{ fontSize:22, flexShrink:0 }}>{icon}</span>
                <div><div style={{ fontWeight:700, fontSize:14, color:'var(--ink2)' }}>{label}</div><div style={{ fontSize:13, color:'var(--muted)', marginTop:3, lineHeight:1.5 }}>{desc}</div></div>
              </div>
            ))}
          </div>
        </div>
        <form action={giveConsent} style={{ display:'grid', gap:14 }}>
          <label className="choice" style={{ background:'var(--tint)', borderColor:'var(--accent)', borderWidth:2 }}>
            <input type="checkbox" name="agree" required />
            <span style={{ fontWeight:600 }}>Aku sudah membaca dan setuju datanya dipakai seperti di atas.</span>
          </label>
          <Submit>Setuju &amp; mulai →</Submit>
        </form>
      </>
    );
  }

  /* ── Dashboard ── */
  const d = await studentData(s.id);
  const p = d.plan;

  const groups: Array<{ phase: string; icon: string; accent: string; bg: string; border: string; rows: Row[] }> = [
    { phase:'Perencanaan', icon:'🗺️', accent:'#e8524a', bg:'#fff0ef', border:'#fad9d7',
      rows:[
        ['/siswa/kebiasaan','Kenali Kebiasaan','Tandai kebiasaanmu, pilih satu untuk dicoba',!!p.habit_focus,'🔍'],
        ['/siswa/tujuan','Tetapkan Tujuan','Tulis satu tujuan untuk satu minggu',!!p.goal,'🎯'],
        ['/siswa/waktu','Atur Waktu','Buat jadwal ulang bertahap',!!p.sched_start,'⏰'],
      ]},
    { phase:'Pelaksanaan', icon:'⚡', accent:'#2a9d8f', bg:'#e8f7f5', border:'#c0eae5',
      rows:[
        ['/siswa/strategi','Strategi Belajar',d.quiz?`Kuis: ${d.quiz.score}/${d.quiz.total} benar`:'Pelajari strategi & kerjakan kuis',!!d.quiz,'📚'],
        ['/siswa/fokus','Fokus Belajar','Susun rencana mengurangi gangguan',!!(p.focus_notif||p.focus_place||p.focus_tools),'🎧'],
      ]},
    { phase:'Refleksi', icon:'🪞', accent:'#7c5cbf', bg:'#f3eeff', border:'#ddd0f7',
      rows:[
        ['/siswa/refleksi','Refleksi Mingguan','Catat yang berhasil dan yang menjadi kendala',d.reflections.length>0,'🪞'],
        ['/siswa/bantuan','Bantuan Guru BK','Kamu yang memilih apa yang dibagikan',d.requests.length>0,'💬'],
      ]},
  ];

  const core = groups.flatMap(g=>g.rows).filter(r=>r[0]!=='/siswa/bantuan');
  const doneN = core.filter(r=>r[3]).length;
  const pct = Math.round((doneN/core.length)*100);

  // Stats for mini cards
  const hariIni = d.days.includes(new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Jakarta'}));
  const totalHari = d.days.length;
  const reflCount = d.reflections.length;

  return (
    <>
      {/* ══ HERO ══ */}
      <div style={{
        background:'var(--grad)', borderRadius:'var(--r-xl)',
        padding:'32px 36px', color:'#fff',
        boxShadow:'0 8px 32px rgba(232,82,74,.22)',
        position:'relative', overflow:'hidden',
      }}>
        <div style={{ position:'absolute', right:-50, top:-50, width:220, height:220, borderRadius:'50%', background:'rgba(255,255,255,.08)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', right:80, bottom:-70, width:160, height:160, borderRadius:'50%', background:'rgba(255,255,255,.05)', pointerEvents:'none' }} />

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:16, position:'relative' }}>
          <div style={{ flex:1 }}>
            <span style={{ fontSize:11, fontWeight:700, letterSpacing:'.10em', textTransform:'uppercase', opacity:.7 }}>Halo, {s.nickname} · Kelas {s.class}</span>
            <h2 style={{ color:'#fff', fontSize:26, margin:'6px 0 10px' }}>Mau mulai dari mana hari ini?</h2>
            <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
              <span style={{ background:'rgba(255,255,255,.18)', borderRadius:99, padding:'4px 14px', fontSize:13, fontWeight:600 }}>
                {doneN} dari {core.length} langkah selesai
              </span>
              {hariIni && <span style={{ background:'rgba(255,255,255,.18)', borderRadius:99, padding:'4px 14px', fontSize:13, fontWeight:600 }}>✅ Sudah berlatih hari ini</span>}
            </div>
          </div>
          {/* Big % */}
          <div style={{ width:80, height:80, borderRadius:'50%', flexShrink:0, background:'rgba(255,255,255,.18)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', border:'3px solid rgba(255,255,255,.35)' }}>
            <span style={{ fontSize:22, fontWeight:800, color:'#fff', lineHeight:1 }}>{pct}%</span>
            <span style={{ fontSize:10, opacity:.75, marginTop:1 }}>selesai</span>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ marginTop:20, position:'relative' }}>
          <div style={{ height:8, borderRadius:99, background:'rgba(255,255,255,.25)', overflow:'hidden' }}>
            <div style={{ height:'100%', borderRadius:99, background:'rgba(255,255,255,.9)', width:`${pct}%`, transition:'width .4s ease' }} />
          </div>
        </div>
      </div>

      {/* ══ STAT MINI CARDS ══ */}
      <style>{`
        @media(min-width:600px){.stat-row{grid-template-columns:repeat(3,1fr)!important}}
        @media(min-width:860px){.phase-grid{display:grid!important;grid-template-columns:repeat(3,1fr);gap:20px;align-items:start}}
      `}</style>
      <div className="stat-row" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        {([
          ['📅', String(totalHari), 'hari berlatih total', '#e8524a'],
          ['🪞', String(reflCount), 'refleksi ditulis', '#7c5cbf'],
          [d.quiz?'🧠':'⬜', d.quiz?`${d.quiz.score}/${d.quiz.total}`:'–', 'skor kuis terakhir', '#2a9d8f'],
        ] as [string,string,string,string][]).map(([icon, val, label, color]) => (
          <div key={label} style={{ background:'var(--surface)', border:'1.5px solid var(--line)', borderRadius:'var(--r-lg)', padding:'16px 20px', display:'flex', alignItems:'center', gap:14, boxShadow:'var(--shadow-sm)' }}>
            <span style={{ width:44, height:44, borderRadius:12, background:`${color}15`, display:'grid', placeItems:'center', fontSize:20, flexShrink:0 }}>{icon}</span>
            <div>
              <div style={{ fontFamily:'var(--fd)', fontSize:24, fontWeight:800, color, lineHeight:1 }}>{val}</div>
              <div style={{ fontSize:12, color:'var(--muted)', marginTop:3 }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ══ PHASE GROUPS ══ */}
      <div className="phase-grid" style={{ display:'flex', flexDirection:'column', gap:20 }}>
        {groups.map((g) => (
          <section key={g.phase}>
            {/* Phase header */}
            <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 16px', borderRadius:'var(--r)', background:g.bg, border:`1px solid ${g.border}`, marginBottom:10 }}>
              <span style={{ fontSize:18 }}>{g.icon}</span>
              <span style={{ fontFamily:'var(--fd)', fontWeight:800, fontSize:14, color:g.accent }}>{g.phase}</span>
              <div style={{ flex:1 }} />
              <div style={{ display:'flex', gap:4 }}>
                {g.rows.map(r => (
                  <div key={r[0]} style={{ width:8, height:8, borderRadius:'50%', background:r[3]?g.accent:`${g.accent}30` }} />
                ))}
              </div>
              <span style={{ fontSize:11, fontWeight:700, background:g.accent, color:'#fff', padding:'2px 8px', borderRadius:99 }}>
                {g.rows.filter(r=>r[3]).length}/{g.rows.length}
              </span>
            </div>

            {/* Items */}
            <div style={{ display:'grid', gap:8 }}>
              {g.rows.map(([href, title, desc, done, icon]) => (
                <Link key={href} href={href} className="phase-item" style={{
                  display:'flex', alignItems:'center', gap:14,
                  padding:'16px 18px',
                  background: done ? g.bg : 'var(--surface)',
                  border:`1.5px solid ${done ? g.border : 'var(--line)'}`,
                  borderRadius:'var(--r-lg)',
                  textDecoration:'none',
                  boxShadow:'var(--shadow-sm)',
                  position:'relative',
                  overflow:'hidden',
                }}>
                  {/* left accent bar if done */}
                  {done && <div style={{ position:'absolute', left:0, top:0, bottom:0, width:4, background:g.accent, borderRadius:'4px 0 0 4px' }} />}
                  <span style={{
                    width:44, height:44, borderRadius:13, flexShrink:0,
                    background: done ? g.accent : 'var(--surface2)',
                    display:'grid', placeItems:'center', fontSize:20,
                    boxShadow: done ? `0 2px 10px ${g.accent}40` : 'none',
                  }}>{icon}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:700, fontSize:15, color:'var(--ink2)' }}>{title}</div>
                    <div style={{ fontSize:12, color:'var(--muted)', marginTop:3, lineHeight:1.4 }}>{desc}</div>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3, flexShrink:0 }}>
                    <span style={{
                      width:28, height:28, borderRadius:99,
                      background: done ? g.accent : 'var(--surface2)',
                      display:'grid', placeItems:'center',
                      fontSize:14, color: done ? '#fff' : 'var(--line)',
                      border:`1.5px solid ${done ? g.accent : 'var(--line)'}`,
                    }}>
                      {done ? '✓' : '›'}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* ══ KALENDER ══ */}
      <Calendar days={d.days} />

      <p className="small" style={{ textAlign:'center' }}>
        💬 Butuh bantuan? Tombol <b>Bantuan BK</b> selalu ada di bawah.
      </p>
    </>
  );
}
