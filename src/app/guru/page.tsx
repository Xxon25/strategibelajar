export const dynamic = 'force-dynamic'
import Link from 'next/link';
import { requireGuru } from '@/lib/session';
import { admin } from '@/lib/supabase-admin';
import { BARRIER, CLASSES, STATUSES, QUIZ } from '@/lib/constants';
import { todayJakarta } from '@/lib/util';
import { logoutGuru, setRequestStatus, newCode, toggleCode, addSlot, toggleSlot, replyRequest } from '@/app/guru-actions';
import { exitPreview } from '@/app/admin-actions';
import Submit from '@/components/Submit';
import CopyButton from '@/components/CopyButton';
import ConsultChat from '@/components/ConsultChat';

type SP = { tab?: string; kelas?: string; hb?: string };
type Refl = { student_id: string; r1: string; r2: string; r3: string; barrier: keyof typeof BARRIER; support_flag: boolean; created_at: string };

export default async function Guru({ searchParams }: { searchParams: Promise<SP> }) {
  const g = await requireGuru();
  const sp = await searchParams;
  const tab = sp.tab === 'konsul' || sp.tab === 'kode' || sp.tab === 'jadwal' ? sp.tab : 'siswa';
  const sb = admin();

  let codes: Array<{ code: string; active: boolean; note: string }> = [];
  let students: Array<{ id: string; nickname: string; class: string; share_summary: boolean; include_reflection: boolean; consent_at: string | null }> = [];
  let reflData: Refl[] = [];
  let quizData: Array<{ student_id: string; score: number; total: number }> = [];
  let daysData: Array<{ student_id: string }> = [];
  let requests: Array<{ id: string; student_id: string; slot_label: string; status: string; mode: string; room_info: string; reschedule_note: string; meet_link: string; confirmed_time: string }> = [];
  let slotsData: Array<{ id: string; label: string; active: boolean; mode: string }> = [];

  try {
    const { data: codesRes } = await sb.from('school_codes').select('*').eq('owner_id', g.user_id).order('created_at', { ascending: false });
    codes = (codesRes ?? []) as typeof codes;
    const codeList = codes.map((c) => c.code);
    const { data: studs } = codeList.length
      ? await sb.from('students').select('id,nickname,class,share_summary,include_reflection,consent_at').in('school_code', codeList).order('created_at', { ascending: false })
      : { data: [] as typeof students };
    students = studs ?? [];
    const ids = students.map((s) => s.id);
    const monthStart = todayJakarta().slice(0, 8) + '01';

    const [reflRes, quizRes, daysRes, reqRes, slotRes] = await Promise.all([
      ids.length ? sb.from('reflections').select('student_id,r1,r2,r3,barrier,support_flag,created_at').in('student_id', ids).order('created_at', { ascending: false }) : { data: [] },
      ids.length ? sb.from('quiz_attempts').select('student_id,score,total,created_at').in('student_id', ids).order('created_at', { ascending: false }) : { data: [] },
      ids.length ? sb.from('practice_days').select('student_id,day').in('student_id', ids).gte('day', monthStart) : { data: [] },
      ids.length ? sb.from('consult_requests').select('id,student_id,slot_label,status,mode,room_info,reschedule_note,meet_link,confirmed_time,created_at').in('student_id', ids).order('created_at', { ascending: false }) : { data: [] },
      sb.from('consult_slots').select('id,label,active,mode').eq('owner_id', g.user_id).order('created_at'),
    ]);
    reflData = (reflRes.data ?? []) as Refl[];
    quizData = (quizRes.data ?? []) as typeof quizData;
    daysData = (daysRes.data ?? []) as typeof daysData;
    requests = (reqRes.data ?? []) as typeof requests;
    slotsData = (slotRes.data ?? []) as typeof slotsData;
  } catch (err) {
    console.error('[GuruPage] Gagal memuat data dashboard guru:', err);
  }

  const lastRefl = new Map<string, Refl>();
  for (const r of reflData) if (!lastRefl.has(r.student_id)) lastRefl.set(r.student_id, r);
  const lastQuiz = new Map<string, { score: number; total: number }>();
  for (const q of quizData) if (!lastQuiz.has(q.student_id)) lastQuiz.set(q.student_id, q);
  const dayCount = new Map<string, number>();
  for (const d of daysData) dayCount.set(d.student_id, (dayCount.get(d.student_id) ?? 0) + 1);
  const byId = new Map(students.map((s) => [s.id, s]));

  const reflected = students.filter((s) => lastRefl.has(s.id)).length;
  const baru = requests.filter((r) => r.status === 'Baru').length;
  const alerts = students.filter((s) => s.share_summary && lastRefl.get(s.id)?.support_flag);

  const rows = students.filter((s) => {
    if (sp.kelas && s.class !== sp.kelas) return false;
    if (sp.hb) {
      const r = lastRefl.get(s.id);
      if (!(s.share_summary && r && r.barrier === sp.hb)) return false;
    }
    return true;
  });

  const statCards = [
    { val: students.length, label: 'Siswa terdaftar', color: '#e8524a', bg: '#fff0ef' },
    { val: reflected, label: 'Sudah refleksi', color: '#2a9d8f', bg: '#e8f7f5' },
    { val: baru, label: 'Konsultasi baru', color: '#7c5cbf', bg: '#f3eeff' },
    { val: (codes ?? []).filter((c) => c.active).length, label: 'Kode aktif', color: '#d4820a', bg: '#fff8ed' },
  ];

  const tabItems: Array<[string, string]> = [
    ['siswa', 'Siswa'],
    ['konsul', baru > 0 ? `Konsultasi (${baru})` : 'Konsultasi'],
    ['kode', 'Kode Sekolah'],
    ['jadwal', 'Jadwal'],
  ];

  return (
    <div className="app wide">
      {/* ── Banner Preview Admin ── */}
      {g.is_admin_preview && (
        <div style={{
          background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
          color: '#fff',
          padding: '10px max(32px, calc((100% - 1200px)/2))',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10,
          fontSize: 13, fontWeight: 600,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span><b>Mode Preview Admin</b> — Sedang melihat View Guru BK: <b>{g.name}</b> ({g.school_name})</span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Link href="/admin?tab=view" style={{ padding: '5px 12px', borderRadius: 8, background: 'rgba(255,255,255,.18)', color: '#fff', fontWeight: 700, fontSize: 12, textDecoration: 'none' }}>
              Ganti View
            </Link>
            <form action={exitPreview}>
              <input type="hidden" name="to" value="/admin" />
              <button type="submit" style={{ padding: '5px 12px', borderRadius: 8, background: '#fff', color: '#4f46e5', fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>
                ← Kembali ke Panel Admin
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Topbar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        padding: '0 max(32px, calc((100% - 1200px)/2))',
        height: 60, flexShrink: 0, background: '#fff',
        borderBottom: '1px solid var(--line)', position: 'sticky', top: 0, zIndex: 10,
        boxShadow: 'var(--shadow-sm)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--grad)', display: 'grid', placeItems: 'center', fontSize: 16, boxShadow: '0 2px 8px rgba(232,82,74,.3)' }} />
          <span style={{ fontFamily: 'var(--fd)', fontWeight: 800, fontSize: 15, color: 'var(--accent)' }}>Ruang Strategi Belajar</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>{g.name} · {g.school_name}</span>
          <form action={logoutGuru}>
            <button type="submit" style={{ padding: '6px 14px', borderRadius: 'var(--r)', border: '1.5px solid var(--line)', background: 'transparent', color: 'var(--accent)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Keluar</button>
          </form>
        </div>
      </div>

      <main className="screen">
        {/* ── Page header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.10em', textTransform: 'uppercase', color: 'var(--accent)', opacity: .8 }}>Ruang Guru BK · {g.school_name}</span>
            <h2 style={{ marginTop: 4 }}>Halo, {g.name}</h2>
          </div>
          {baru > 0 && (
            <div style={{ background: 'var(--accent)', color: '#fff', padding: '8px 18px', borderRadius: 'var(--r)', fontWeight: 700, fontSize: 14, boxShadow: '0 2px 8px rgba(232,82,74,.3)' }}>
              {baru} konsultasi baru
            </div>
          )}
        </div>

        {/* ── Stat cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {statCards.map(({ val, label, color, bg }) => (
            <div key={label} style={{ background: '#fff', border: '1.5px solid var(--line)', borderRadius: 'var(--r-lg)', padding: '18px 20px', display: 'flex', gap: 14, alignItems: 'center', boxShadow: 'var(--shadow-sm)', borderTop: `3px solid ${color}` }}>
              <div>
                <div style={{ fontFamily: 'var(--fd)', fontSize: 28, fontWeight: 800, color, lineHeight: 1 }}>{val}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Alerts ── */}
        {alerts.map((s) => (
          <div key={s.id} className="note" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div>
              <span className="big">Perlu perhatian: {s.nickname} ({s.class})</span>
              <small>Refleksinya memuat kata bernada putus asa. Sebaiknya hubungi siswa secara pribadi hari ini.</small>
            </div>
          </div>
        ))}

        {/* ── Tab navigation ── */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', borderBottom: '2px solid var(--line)', paddingBottom: 0 }}>
          {tabItems.map(([k, l]) => (
            <Link key={k} href={`/guru?tab=${k}`} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '10px 20px',
              borderRadius: 'var(--r) var(--r) 0 0',
              border: '1.5px solid var(--line)',
              borderBottom: tab === k ? '2px solid #fff' : '1.5px solid var(--line)',
              background: tab === k ? '#fff' : 'var(--surface2)',
              color: tab === k ? 'var(--accent)' : 'var(--muted)',
              fontWeight: 700, fontSize: 14, textDecoration: 'none',
              marginBottom: tab === k ? '-2px' : 0,
              transition: 'color .15s, background .15s',
            }}>
              {l}
              {k === 'konsul' && baru > 0 && (
                <span style={{ background: 'var(--accent)', color: '#fff', fontSize: 10, fontWeight: 800, padding: '1px 6px', borderRadius: 99, marginLeft: 2 }}>{baru}</span>
              )}
            </Link>
          ))}
        </div>

        {/* ════ TAB: SISWA ════ */}
        {tab === 'siswa' && (
          <>
            <form method="get" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, alignItems: 'end' }}>
              <div>
                <label className="q" htmlFor="kelas">Kelas</label>
                <select id="kelas" name="kelas" defaultValue={sp.kelas ?? ''}>
                  <option value="">Semua kelas</option>
                  {CLASSES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="q" htmlFor="hb">Status hambatan</label>
                <select id="hb" name="hb" defaultValue={sp.hb ?? ''}>
                  <option value="">Semua status</option>
                  {(Object.keys(BARRIER) as Array<keyof typeof BARRIER>).map((k) => <option key={k} value={k}>{BARRIER[k].short}</option>)}
                </select>
              </div>
              <button type="submit" style={{ height: 46, padding: '0 20px', borderRadius: 'var(--r)', border: '1.5px solid var(--accent)', background: 'var(--tint)', color: 'var(--accent)', fontWeight: 700, fontSize: 14, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                Terapkan →
              </button>
            </form>

            {rows.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--muted)' }}>
                <p style={{ fontSize: 15, fontWeight: 600 }}>Tidak ada siswa yang cocok dengan filter ini.</p>
              </div>
            ) : (
              <div className="tbl">
                <table>
                  <thead>
                    <tr>
                      <th>Siswa</th>
                      <th>Kelas</th>
                      <th>Status</th>
                      <th>Hambatan belajar</th>
                      <th>Kuis</th>
                      <th>Hari latihan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((s) => {
                      const r = lastRefl.get(s.id);
                      const q = lastQuiz.get(s.id);
                      return (
                        <tr key={s.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--tint2)', display: 'grid', placeItems: 'center', fontSize: 14, fontWeight: 800, color: 'var(--accent)', flexShrink: 0 }}>
                                {s.nickname[0].toUpperCase()}
                              </div>
                              <span style={{ fontWeight: 700 }}>{s.nickname}</span>
                            </div>
                          </td>
                          <td><span style={{ background: 'var(--surface2)', padding: '3px 10px', borderRadius: 99, fontSize: 12, fontWeight: 700 }}>{s.class}</span></td>
                          <td>
                            {r ? (
                              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--sec)', fontWeight: 700 }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--sec)', display: 'inline-block' }} />
                                Sudah refleksi
                              </span>
                            ) : (
                              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--muted)' }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--line)', display: 'inline-block' }} />
                                Belum refleksi
                              </span>
                            )}
                          </td>
                          {!r ? (
                            <td colSpan={3} style={{ color: 'var(--muted)', fontSize: 13 }}>–</td>
                          ) : !s.share_summary ? (
                            <td colSpan={3}><span className="chip warn">Tidak dibagikan</span></td>
                          ) : (
                            <>
                              <td>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                  <span style={{ fontSize: 13, fontWeight: 600 }}>{BARRIER[r.barrier].short}</span>
                                  {r.support_flag && <span className="chip warn" style={{ alignSelf: 'flex-start', fontSize: 10 }}>Perlu perhatian</span>}
                                  {s.include_reflection && (
                                    <details style={{ marginTop: 4 }}>
                                      <summary style={{ fontSize: 12, cursor: 'pointer', color: 'var(--accent)' }}>Lihat refleksi</summary>
                                      <div style={{ marginTop: 8, display: 'grid', gap: 4 }}>
                                        {r.r1 && <p style={{ fontSize: 12, margin: 0 }}><b>Berhasil:</b> {r.r1}</p>}
                                        {r.r2 && <p style={{ fontSize: 12, margin: 0 }}><b>Kendala:</b> {r.r2}</p>}
                                        {r.r3 && <p style={{ fontSize: 12, margin: 0 }}><b>Penyesuaian:</b> {r.r3}</p>}
                                      </div>
                                    </details>
                                  )}
                                </div>
                              </td>
                              <td className="num">
                                {q ? (
                                  <span style={{ fontWeight: 700, color: q.score >= 2 ? 'var(--sec)' : 'var(--warn-ink)' }}>
                                    {q.score}/{q.total || QUIZ.length}
                                  </span>
                                ) : '–'}
                              </td>
                              <td className="num">
                                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <span style={{ fontWeight: 700 }}>{dayCount.get(s.id) ?? 0}</span>
                                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>hari</span>
                                </span>
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <p className="small">Guru hanya melihat data yang siswa izinkan. Skor kuis hanya latihan. Tidak ada peringkat antarsiswa.</p>
          </>
        )}

        {/* ════ TAB: KONSUL ════ */}
        {tab === 'konsul' && (
          <>
            {requests.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--muted)' }}>
                <p style={{ fontSize: 15, fontWeight: 600 }}>Belum ada permintaan konsultasi.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                {requests.map((r) => {
                  const s = byId.get(r.student_id);
                  const isOnline = r.mode === 'online';
                  const hasReply = isOnline
                    ? !!(r.confirmed_time || r.meet_link)
                    : !!(r.room_info || r.reschedule_note);
                  return (
                    <div key={r.id} className="card" style={{
                      borderTop: `3px solid ${r.status === 'Baru' ? 'var(--accent)' : r.status === 'Selesai' ? 'var(--sec)' : '#7c5cbf'}`,
                      gap: 14,
                    }}>
                      {/* Header siswa + status */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--tint2)', display: 'grid', placeItems: 'center', fontSize: 16, fontWeight: 800, color: 'var(--accent)', flexShrink: 0 }}>
                            {(s?.nickname ?? 'S')[0].toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 15 }}>{s?.nickname ?? 'Siswa'}</div>
                            {s && <div style={{ fontSize: 12, color: 'var(--muted)' }}>Kelas {s.class}</div>}
                          </div>
                        </div>
                        <span className={'chip' + (r.status === 'Baru' ? ' warn' : r.status === 'Selesai' ? ' ok' : '')}>{r.status}</span>
                      </div>

                      {/* Info jadwal */}
                      <div style={{
                        background: isOnline ? '#e8f7f5' : '#fff0ef',
                        border: `1px solid ${isOnline ? '#c0eae5' : '#fad9d7'}`,
                        borderRadius: 10, padding: '10px 14px', fontSize: 13,
                        display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
                      }}>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                          background: isOnline ? '#2a9d8f' : '#e8524a', color: '#fff',
                        }}>
                          {isOnline ? 'Online' : 'Tatap Muka'}
                        </span>
                        <span style={{ color: 'var(--muted)' }}>Jadwal dipilih:</span>
                        <span style={{ fontWeight: 700 }}>{r.slot_label}</span>
                      </div>

                      {/* Balasan yang sudah ada */}
                      {hasReply && (
                        <div style={{
                          background: 'var(--surface2)', border: '1px solid var(--line)',
                          borderRadius: 10, padding: '12px 14px', fontSize: 13, display: 'grid', gap: 6,
                        }}>
                          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--muted)' }}>
                            Balasan tersimpan
                          </span>
                          {isOnline ? (
                            <>
                              {r.confirmed_time && (
                                <div><span style={{ color: 'var(--muted)' }}>Jam pasti:</span> <strong>{r.confirmed_time}</strong></div>
                              )}
                              {r.meet_link && (
                                <div style={{ wordBreak: 'break-all' }}>
                                  <span style={{ color: 'var(--muted)' }}>Link:</span>{' '}
                                  <a href={r.meet_link} target="_blank" rel="noopener noreferrer" style={{ color: '#2a9d8f', fontWeight: 600 }}>{r.meet_link}</a>
                                </div>
                              )}
                            </>
                          ) : (
                            <>
                              {r.room_info && (
                                <div><span style={{ color: 'var(--muted)' }}>Ruangan:</span> <strong>{r.room_info}</strong></div>
                              )}
                              {r.reschedule_note && (
                                <div><span style={{ color: 'var(--muted)' }}>Catatan:</span> {r.reschedule_note}</div>
                              )}
                            </>
                          )}
                        </div>
                      )}

                      {/* Form balas — inline, berbeda untuk online vs offline */}
                      {r.status !== 'Selesai' && (
                        <details style={{ fontSize: 13 }}>
                          <summary style={{ cursor: 'pointer', fontWeight: 700, color: 'var(--accent)', userSelect: 'none', padding: '4px 0' }}>
                            {hasReply ? 'Edit balasan' : isOnline ? 'Konfirmasi jam & link meeting' : 'Isi ruangan / geser jadwal'}
                          </summary>
                          <form action={replyRequest} style={{ display: 'grid', gap: 10, marginTop: 10 }}>
                            <input type="hidden" name="id" value={r.id} />
                            <input type="hidden" name="mode" value={r.mode} />
                            {isOnline ? (
                              <>
                                <div>
                                  <label className="q" style={{ fontSize: 12 }}>Jam pasti</label>
                                  <input
                                    type="text" name="confirmed_time" maxLength={80}
                                    defaultValue={r.confirmed_time}
                                    placeholder="Contoh: Jumat, 10 Jan — 10.00 WIB"
                                    style={{ fontSize: 13 }}
                                  />
                                </div>
                                <div>
                                  <label className="q" style={{ fontSize: 12 }}>Link Zoom / Google Meet</label>
                                  <input
                                    type="url" name="meet_link" maxLength={500}
                                    defaultValue={r.meet_link}
                                    placeholder="https://meet.google.com/xxx-xxxx-xxx"
                                    style={{ fontSize: 13 }}
                                  />
                                </div>
                              </>
                            ) : (
                              <>
                                <div>
                                  <label className="q" style={{ fontSize: 12 }}>Ruangan</label>
                                  <input
                                    type="text" name="room_info" maxLength={120}
                                    defaultValue={r.room_info}
                                    placeholder="Contoh: Ruang BK Lt. 2 / Ruang 205"
                                    style={{ fontSize: 13 }}
                                  />
                                </div>
                                <div>
                                  <label className="q" style={{ fontSize: 12 }}>Catatan (opsional — geser jadwal, dll)</label>
                                  <textarea
                                    name="reschedule_note" maxLength={300}
                                    defaultValue={r.reschedule_note}
                                    placeholder="Contoh: Jadwal digeser ke Senin 13 Jan pukul 10.00 karena rapat."
                                    rows={2}
                                    style={{ fontSize: 13, resize: 'vertical', width: '100%', padding: '8px 12px', borderRadius: 8, border: '1.5px solid var(--line)', fontFamily: 'inherit' }}
                                  />
                                </div>
                              </>
                            )}
                            <Submit pendingText="Menyimpan…">Simpan &amp; tandai Dijadwalkan</Submit>
                          </form>
                        </details>
                      )}

                      {/* Ubah status */}
                      <div className="seg3">
                        {STATUSES.map((st) => (
                          <form key={st} action={setRequestStatus}>
                            <input type="hidden" name="id" value={r.id} />
                            <input type="hidden" name="status" value={st} />
                            <button className="opt" style={{ width: '100%', fontSize: 13 }} type="submit" aria-pressed={r.status === st}>{st}</button>
                          </form>
                        ))}
                      </div>
                      <ConsultChat
                        requestId={r.id}
                        viewerRole="guru"
                        viewerName={g.name}
                        partnerLabel={`${s?.nickname ?? 'Siswa'} (${s?.class ?? '-'})`}
                        slotLabel={r.slot_label}
                        status={r.status}
                        defaultOpen={requests.length === 1 || r.status !== 'Selesai'}
                      />
                    </div>
                  );
                })}
              </div>
            )}
            <p className="small">Siswa yang tidak membagikan ringkasan hanya terlihat sebagai nama dan jadwal.</p>
          </>
        )}

        {/* ════ TAB: KODE ════ */}
        {tab === 'kode' && (
          <>
            <p className="lead">Berikan kode ini kepada siswa untuk mendaftar. Nonaktifkan kode yang sudah tidak dipakai.</p>
            {(codes ?? []).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px', color: 'var(--muted)' }}>
                <p>Belum ada kode. Buat kode pertamamu di bawah.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {(codes ?? []).map((c) => (
                  <div key={c.code} style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '16px 20px', background: '#fff',
                    border: `1.5px solid ${c.active ? 'var(--line)' : 'var(--warn-line)'}`,
                    borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-sm)',
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <code style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 800, color: 'var(--accent)', letterSpacing: '.05em', background: 'var(--tint)', padding: '3px 10px', borderRadius: 8 }}>
                          {c.code}
                        </code>
                        <CopyButton text={c.code} />
                        <span className={'chip' + (c.active ? '' : ' warn')} style={{ fontSize: 11 }}>
                          {c.active ? '● Aktif' : '○ Nonaktif'}
                        </span>
                      </div>
                      {c.note && <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>{c.note}</div>}
                    </div>
                    <form action={toggleCode}>
                      <input type="hidden" name="code" value={c.code} />
                      <button type="submit" style={{ padding: '7px 16px', borderRadius: 'var(--r)', border: '1.5px solid var(--line)', background: 'var(--surface2)', color: 'var(--muted)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                        {c.active ? 'Nonaktifkan' : 'Aktifkan'}
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            )}
            <form action={newCode} className="card" style={{ borderTop: '3px solid var(--accent)' }}>
              <h3>Buat kode baru</h3>
              <div>
                <label className="q" htmlFor="note">Catatan (opsional)</label>
                <input type="text" id="note" name="note" maxLength={80} placeholder="Contoh: Kelas XI IPA 2 — Semester Ganjil 2025" />
              </div>
              <Submit pendingText="Membuat…">Buat kode baru</Submit>
            </form>
          </>
        )}

        {/* ════ TAB: JADWAL ════ */}
        {tab === 'jadwal' && (
          <>
            <p className="lead">Jadwal ini yang dilihat siswa saat mengajukan konsultasi.</p>
            {slotsData.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px', color: 'var(--muted)' }}>
                <p>Belum ada jadwal. Tambahkan jadwal pertama di bawah.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {slotsData.map((sl) => (
                  <div key={sl.id} style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '16px 20px', background: '#fff',
                    border: `1.5px solid ${sl.active ? 'var(--line)' : 'var(--warn-line)'}`,
                    borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-sm)',
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2 }}>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                          background: sl.mode === 'online' ? '#e8f7f5' : '#fff0ef',
                          color: sl.mode === 'online' ? '#2a9d8f' : '#e8524a',
                          border: `1px solid ${sl.mode === 'online' ? '#c0eae5' : '#fad9d7'}`,
                          whiteSpace: 'nowrap',
                        }}>
                          {sl.mode === 'online' ? 'Online' : 'Tatap Muka'}
                        </span>
                        <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink2)' }}>{sl.label}</span>
                      </div>
                    </div>
                    <span className={'chip' + (sl.active ? ' ok' : ' warn')} style={{ fontSize: 11 }}>
                      {sl.active ? '● Aktif' : '○ Nonaktif'}
                    </span>
                    <form action={toggleSlot}>
                      <input type="hidden" name="id" value={sl.id} />
                      <button type="submit" style={{ padding: '7px 16px', borderRadius: 'var(--r)', border: '1.5px solid var(--line)', background: 'var(--surface2)', color: 'var(--muted)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                        {sl.active ? 'Nonaktifkan' : 'Aktifkan'}
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            )}
            <form action={addSlot} className="card" style={{ borderTop: '3px solid var(--sec)' }}>
              <h3>Tambah jadwal</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'end' }}>
                <div>
                  <label className="q" htmlFor="label">Jadwal konsultasi</label>
                  <input type="text" id="label" name="label" maxLength={80} placeholder="Contoh: Jumat, 10.00 – 11.00" required />
                </div>
                <div>
                  <label className="q" htmlFor="mode">Mode</label>
                  <select id="mode" name="mode" style={{ height: 46 }}>
                    <option value="offline">Tatap Muka</option>
                    <option value="online">Online</option>
                  </select>
                </div>
              </div>
              <Submit pendingText="Menambah…">Tambah jadwal</Submit>
            </form>
          </>
        )}
      </main>
    </div>
  );
}
