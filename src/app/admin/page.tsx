export const dynamic = 'force-dynamic'
import Link from 'next/link';
import { requireAdmin } from '@/lib/session';
import { admin } from '@/lib/supabase-admin';
import {
  logoutAdmin,
  saveContent,
  previewGuru,
  previewStudent,
  createDemoStudent,
  adminNewCode,
  adminToggleCode,
  adminAddSlot,
  adminToggleSlot,
  adminSetRequestStatus,
} from '@/app/admin-actions';
import { BARRIER, CLASSES, HABITS_HELP, HABITS_HINDER, STRATEGIES, STATUSES, QUIZ } from '@/lib/constants';
import Submit from '@/components/Submit';
import AddCounselorForm from '@/components/AddCounselorForm';
import { DeleteCounselorForm, DeleteStudentForm, DeleteAllStudentsForm } from '@/components/AdminActions';
import CopyButton from '@/components/CopyButton';

type SP = { tab?: string; ok?: string; kelas?: string; kode?: string };

type Counselor = { user_id: string; name: string; school_name: string; created_at: string };
type StudentRow = {
  id: string; nickname: string; class: string; school_code: string; consent_at: string | null;
  share_summary: boolean; include_reflection: boolean; created_at: string;
};
type Code = { code: string; owner_id: string; note: string; active: boolean; created_at: string };
type Slot = { id: string; owner_id: string; label: string; active: boolean; created_at: string };
type PlanRow = {
  student_id: string; habits_done: string[]; habit_focus: string; goal: string; sched_topic: string;
  sched_start: string | null; strategies: string[]; focus_notif: string; focus_place: string; focus_tools: string;
};
type QuizRow = { id: string; student_id: string; score: number; total: number; created_at: string };
type ReflRow = {
  id: string; student_id: string; r1: string; r2: string; r3: string;
  barrier: keyof typeof BARRIER; support_flag: boolean; created_at: string;
};
type ReqRow = { id: string; student_id: string; slot_label: string; status: string; created_at: string };

const VALID_TABS = ['overview', 'view', 'guru', 'siswa', 'konsul', 'konten'] as const;
type Tab = (typeof VALID_TABS)[number];

const btnIndigo: React.CSSProperties = {
  padding: '8px 14px', borderRadius: 10, background: '#4f46e5', color: '#fff',
  fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap',
};
const btnCoral: React.CSSProperties = { ...btnIndigo, background: 'var(--accent)' };

export default async function AdminPage({ searchParams }: { searchParams: Promise<SP> }) {
  const a = await requireAdmin();
  const sp = await searchParams;
  const tab: Tab = (VALID_TABS as readonly string[]).includes(sp.tab ?? '') ? (sp.tab as Tab) : 'overview';
  const sb = admin();

  let counselors: Counselor[] = [];
  let students: StudentRow[] = [];
  let codes: Code[] = [];
  let slots: Slot[] = [];
  let plans: PlanRow[] = [];
  let quizzes: QuizRow[] = [];
  let reflections: ReflRow[] = [];
  let requests: ReqRow[] = [];
  let practiceDays: Array<{ student_id: string; day: string }> = [];
  let contents: Record<string, string> = {};
  let dbError: string | null = null;

  try {
    const [cRes, sRes, codeRes, slotRes, planRes, quizRes, reflRes, reqRes, dayRes, contentRes] = await Promise.all([
      sb.from('counselors').select('user_id,name,school_name,created_at').order('created_at', { ascending: false }),
      sb.from('students').select('id,nickname,class,school_code,consent_at,share_summary,include_reflection,created_at').order('created_at', { ascending: false }),
      sb.from('school_codes').select('code,owner_id,note,active,created_at').order('created_at', { ascending: false }),
      sb.from('consult_slots').select('id,owner_id,label,active,created_at').order('created_at'),
      sb.from('student_plans').select('*'),
      sb.from('quiz_attempts').select('id,student_id,score,total,created_at').order('created_at', { ascending: false }),
      sb.from('reflections').select('id,student_id,r1,r2,r3,barrier,support_flag,created_at').order('created_at', { ascending: false }),
      sb.from('consult_requests').select('id,student_id,slot_label,status,created_at').order('created_at', { ascending: false }),
      sb.from('practice_days').select('student_id,day'),
      sb.from('site_content').select('key,value').order('key'),
    ]);
    counselors = (cRes.data ?? []) as Counselor[];
    students = (sRes.data ?? []) as StudentRow[];
    codes = (codeRes.data ?? []) as Code[];
    slots = (slotRes.data ?? []) as Slot[];
    plans = (planRes.data ?? []) as PlanRow[];
    quizzes = (quizRes.data ?? []) as QuizRow[];
    reflections = (reflRes.data ?? []) as ReflRow[];
    requests = (reqRes.data ?? []) as ReqRow[];
    practiceDays = (dayRes.data ?? []) as Array<{ student_id: string; day: string }>;
    contents = Object.fromEntries((contentRes.data ?? []).map((r) => [r.key, r.value]));
    if (cRes.error) dbError = `DB Error: ${cRes.error.message}`;
  } catch (e) {
    console.error('[AdminPage] Gagal memuat data:', e);
    dbError = `Gagal memuat data dari Supabase. (${e})`;
  }

  /* ── Lookups ── */
  const studentsByCode = new Map<string, number>();
  for (const s of students) studentsByCode.set(s.school_code, (studentsByCode.get(s.school_code) ?? 0) + 1);
  const codesByOwner = new Map<string, Code[]>();
  for (const c of codes) codesByOwner.set(c.owner_id, [...(codesByOwner.get(c.owner_id) ?? []), c]);
  const slotsByOwner = new Map<string, Slot[]>();
  for (const sl of slots) slotsByOwner.set(sl.owner_id, [...(slotsByOwner.get(sl.owner_id) ?? []), sl]);
  const planByStudent = new Map(plans.map((p) => [p.student_id, p]));
  const lastQuiz = new Map<string, QuizRow>();
  for (const q of quizzes) if (!lastQuiz.has(q.student_id)) lastQuiz.set(q.student_id, q);
  const reflsByStudent = new Map<string, ReflRow[]>();
  for (const r of reflections) reflsByStudent.set(r.student_id, [...(reflsByStudent.get(r.student_id) ?? []), r]);
  const daysByStudent = new Map<string, number>();
  for (const d of practiceDays) daysByStudent.set(d.student_id, (daysByStudent.get(d.student_id) ?? 0) + 1);
  const studentById = new Map(students.map((s) => [s.id, s]));
  const counselorOfCode = (code: string) => counselors.find((c) => c.user_id === codes.find((x) => x.code === code)?.owner_id);

  const allHabits = [...HABITS_HELP, ...HABITS_HINDER];
  const habitLabel = (id: string) => allHabits.find((h) => h.id === id)?.label ?? id;
  const strategyLabel = (id: string) => STRATEGIES.find((s) => s.id === id)?.label ?? id;

  const baruCount = requests.filter((r) => r.status === 'Baru').length;
  const supportAlerts = reflections.filter((r) => r.support_flag);

  const filteredStudents = students.filter((s) => {
    if (sp.kelas && s.class !== sp.kelas) return false;
    if (sp.kode && s.school_code !== sp.kode) return false;
    return true;
  });

  const tabs: Array<[Tab, string, string, number | undefined]> = [
    ['overview', '📊', 'Overview', undefined],
    ['view', '👁️', 'Lihat View Guru & Murid', undefined],
    ['guru', '👩‍🏫', 'Guru BK', counselors.length],
    ['siswa', '🎒', 'Siswa', students.length],
    ['konsul', '📅', 'Konsultasi & Refleksi', baruCount || undefined],
    ['konten', '✏️', 'Edit Konten', undefined],
  ];

  const contentKeys: Array<[string, string, string]> = [
    ['home_title', 'Judul Halaman Utama', 'Ruang Strategi Belajar'],
    ['home_subtitle', 'Subjudul / Deskripsi Hero', 'Kenali kebiasaan belajarmu...'],
    ['home_badge1', 'Badge 1', 'Strategi Belajar'],
    ['home_badge2', 'Badge 2', 'Tujuan Mingguan'],
    ['home_badge3', 'Badge 3', 'Manajemen Waktu'],
    ['home_badge4', 'Badge 4', 'Refleksi Diri'],
    ['strategi_intro', 'Intro Halaman Strategi', ''],
    ['footer_text', 'Teks Footer', 'Ruang Strategi Belajar · Media Layanan BK'],
  ];

  /* ── Reusable blocks ── */
  const GuruPicker = (
    counselors.length === 0 ? (
      <p className="small">Belum ada Guru BK. Tambahkan di tab Guru BK.</p>
    ) : (
      <form action={previewGuru} style={{ display: 'flex', gap: 8 }}>
        <select name="user_id" required style={{ flex: 1, padding: '8px 12px', fontSize: 13 }}>
          {counselors.map((c) => <option key={c.user_id} value={c.user_id}>{c.name} — {c.school_name}</option>)}
        </select>
        <button type="submit" style={btnIndigo}>👁️ Buka View Guru →</button>
      </form>
    )
  );

  const StudentPicker = (
    students.length === 0 ? (
      <p className="small">Belum ada siswa. Klik &ldquo;Masuk View Siswa Demo&rdquo;.</p>
    ) : (
      <form action={previewStudent} style={{ display: 'flex', gap: 8 }}>
        <select name="student_id" required style={{ flex: 1, padding: '8px 12px', fontSize: 13 }}>
          {students.map((s) => <option key={s.id} value={s.id}>{s.nickname} (Kelas {s.class} · {s.school_code})</option>)}
        </select>
        <button type="submit" style={btnCoral}>👁️ Buka View Murid →</button>
      </form>
    )
  );

  return (
    <div className="app wide">
      {/* ── Topbar ── */}
      <div className="topbar" style={{ background: 'var(--grad-admin)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,.15)', display: 'grid', placeItems: 'center', fontSize: 17 }}>⚙️</div>
          <div>
            <b style={{ color: '#fff', display: 'block', lineHeight: 1.1 }}>Panel Super Admin · RSB</b>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,.6)' }}>Kontrol Guru BK, Siswa &amp; Preview View</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Link href="/" style={{ padding: '5px 12px', borderRadius: 8, background: 'rgba(255,255,255,.12)', color: '#fff', fontSize: 12, fontWeight: 700 }}>🏠 Beranda</Link>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,.75)', fontWeight: 600 }}>Halo, {a.name}</span>
          <form action={logoutAdmin}>
            <button className="btn link" type="submit" style={{ color: '#fca5a5', fontSize: 13 }}>Keluar</button>
          </form>
        </div>
      </div>

      <main className="screen">
        {dbError && (
          <div className="note" style={{ fontFamily: 'monospace', fontSize: 13 }}>
            <span className="big">⚠️ Database belum siap</span>
            {dbError}
          </div>
        )}
        {sp.ok && <div className="note good">✅ Perubahan berhasil disimpan.</div>}

        {/* ── Tabs ── */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', borderBottom: '2px solid var(--line)', paddingBottom: 12 }}>
          {tabs.map(([k, icon, label, badge]) => {
            const on = tab === k;
            return (
              <Link key={k} href={`/admin?tab=${k}`} style={{
                padding: '9px 16px', borderRadius: 'var(--r)',
                border: `1.5px solid ${on ? '#4f46e5' : 'var(--line)'}`,
                background: on ? 'linear-gradient(135deg,#4f46e5,#6366f1)' : 'var(--surface)',
                color: on ? '#fff' : 'var(--ink2)',
                fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 7,
                boxShadow: on ? '0 4px 12px rgba(79,70,229,.25)' : 'var(--shadow-sm)',
              }}>
                <span>{icon}</span><span>{label}</span>
                {badge !== undefined && (
                  <span style={{ fontSize: 11, fontWeight: 800, padding: '1px 7px', borderRadius: 99, background: on ? 'rgba(255,255,255,.22)' : 'var(--surface2)', color: on ? '#fff' : 'var(--accent)' }}>{badge}</span>
                )}
              </Link>
            );
          })}
        </div>

        {/* ════════ OVERVIEW ════════ */}
        {tab === 'overview' && (
          <>
            <div>
              <span className="eyebrow" style={{ color: '#4f46e5' }}>Super Admin Dashboard</span>
              <h2>Ringkasan &amp; Kontrol Pusat</h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))', gap: 12 }}>
              {[
                { icon: '👩‍🏫', val: counselors.length, label: 'Guru BK', color: '#4f46e5', bg: '#eef2ff' },
                { icon: '🎒', val: students.length, label: 'Total Siswa', color: '#e8524a', bg: '#fff0ef' },
                { icon: '✅', val: students.filter((s) => s.consent_at).length, label: 'Siswa Consent', color: '#2a9d8f', bg: '#e8f7f5' },
                { icon: '🔑', val: codes.filter((c) => c.active).length, label: 'Kode Aktif', color: '#d97706', bg: '#fffbeb' },
                { icon: '🪞', val: reflections.length, label: 'Refleksi', color: '#7c5cbf', bg: '#f3eeff' },
                { icon: '📅', val: requests.length, label: `Konsultasi (${baruCount} baru)`, color: '#0284c7', bg: '#f0f9ff' },
              ].map((st) => (
                <div key={st.label} className="card" style={{ borderTop: `3px solid ${st.color}`, padding: '16px 18px', flexDirection: 'row', alignItems: 'center', gap: 13 }}>
                  <span style={{ width: 44, height: 44, borderRadius: 12, background: st.bg, display: 'grid', placeItems: 'center', fontSize: 21, flexShrink: 0 }}>{st.icon}</span>
                  <div>
                    <div style={{ fontFamily: 'var(--fd)', fontSize: 26, fontWeight: 800, color: st.color, lineHeight: 1 }}>{st.val}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3, fontWeight: 600 }}>{st.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick view switcher */}
            <div className="card" style={{ background: 'linear-gradient(135deg,#eef2ff,#f5f3ff)', border: '1.5px solid #c7d2fe', padding: '22px 24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', color: '#4f46e5' }}>👁️ Simulasi Tampilan</span>
                  <h3 style={{ fontSize: 18, marginTop: 2, color: '#1e1b4b' }}>Lihat dari sudut pandang Guru BK atau Murid</h3>
                </div>
                <form action={createDemoStudent}>
                  <button type="submit" style={{ ...btnCoral, background: 'var(--grad)' }}>🚀 Masuk View Siswa Demo</button>
                </form>
              </div>
              <style>{`@media(min-width:760px){.preview-split{display:grid!important;grid-template-columns:1fr 1fr;gap:16px}}`}</style>
              <div className="preview-split" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ background: '#fff', padding: '16px 18px', borderRadius: 14, border: '1px solid #e0e7ff', display: 'grid', gap: 10 }}>
                  <div style={{ fontWeight: 800, fontSize: 15, color: '#1e1b4b' }}>🏫 View Guru BK</div>
                  {GuruPicker}
                </div>
                <div style={{ background: '#fff', padding: '16px 18px', borderRadius: 14, border: '1px solid #fad9d7', display: 'grid', gap: 10 }}>
                  <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--ink2)' }}>🎒 View Murid</div>
                  {StudentPicker}
                </div>
              </div>
            </div>

            {supportAlerts.length > 0 && (
              <div className="note" style={{ display: 'grid', gap: 8 }}>
                <span className="big">🚨 {supportAlerts.length} refleksi perlu perhatian</span>
                {supportAlerts.slice(0, 5).map((r) => {
                  const st = studentById.get(r.student_id);
                  return (
                    <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, background: 'rgba(255,255,255,.6)', padding: '8px 12px', borderRadius: 8 }}>
                      <span style={{ fontSize: 13 }}><b>{st?.nickname ?? 'Siswa'}</b> (Kelas {st?.class ?? '-'}) — &ldquo;{r.r2 || r.r1 || r.r3}&rdquo;</span>
                      {st && (
                        <form action={previewStudent}>
                          <input type="hidden" name="student_id" value={st.id} />
                          <button type="submit" className="chip warn" style={{ cursor: 'pointer' }}>👁️ Lihat View Siswa</button>
                        </form>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="card">
              <h3>🏫 Sekolah &amp; Guru BK</h3>
              {counselors.length === 0 ? (
                <p className="muted">Belum ada guru BK.</p>
              ) : (
                <div className="list">
                  {counselors.map((c) => {
                    const oc = codesByOwner.get(c.user_id) ?? [];
                    const total = oc.reduce((n, x) => n + (studentsByCode.get(x.code) ?? 0), 0);
                    return (
                      <div key={c.user_id} className="item" style={{ flexWrap: 'wrap' }}>
                        <span>
                          <span className="t">{c.school_name} — {c.name}</span>
                          <span className="d">{total} siswa · {oc.length} kode · {(slotsByOwner.get(c.user_id) ?? []).length} jadwal</span>
                        </span>
                        <form action={previewGuru}>
                          <input type="hidden" name="user_id" value={c.user_id} />
                          <button type="submit" style={{ padding: '6px 12px', borderRadius: 8, background: '#eef2ff', color: '#4f46e5', border: '1px solid #c7d2fe', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>👁️ Lihat View Guru</button>
                        </form>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* ════════ LIHAT VIEW ════════ */}
        {tab === 'view' && (
          <>
            <div>
              <span className="eyebrow" style={{ color: '#4f46e5' }}>Simulasi &amp; Inspeksi</span>
              <h2>👁️ Lihat View Guru BK &amp; Murid</h2>
              <p className="lead" style={{ marginTop: 4 }}>
                Masuk ke tampilan Guru BK atau Murid persis seperti yang mereka lihat. Banner ungu di atas halaman bisa dipakai untuk kembali ke Panel Admin kapan saja. Sesi asli mereka tidak terganggu.
              </p>
            </div>

            <style>{`@media(min-width:820px){.view-grid{display:grid!important;grid-template-columns:1fr 1fr;gap:20px;align-items:start}}`}</style>
            <div className="view-grid" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="card" style={{ borderTop: '4px solid #4f46e5' }}>
                <h3 style={{ fontSize: 18 }}>👩‍🏫 Dashboard Guru BK</h3>
                {counselors.length === 0 ? (
                  <div className="note">Belum ada Guru BK.</div>
                ) : (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {counselors.map((c) => {
                      const oc = codesByOwner.get(c.user_id) ?? [];
                      const total = oc.reduce((n, x) => n + (studentsByCode.get(x.code) ?? 0), 0);
                      return (
                        <div key={c.user_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 14, background: 'var(--surface2)', border: '1.5px solid var(--line)' }}>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: 15 }}>{c.name}</div>
                            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{c.school_name} · {total} siswa · {oc.map((x) => x.code).join(', ') || '–'}</div>
                          </div>
                          <form action={previewGuru}>
                            <input type="hidden" name="user_id" value={c.user_id} />
                            <button type="submit" style={btnIndigo}>👁️ Masuk →</button>
                          </form>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="card" style={{ borderTop: '4px solid var(--accent)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <h3 style={{ fontSize: 18 }}>🎒 Aplikasi Murid</h3>
                  <form action={createDemoStudent}>
                    <button type="submit" style={{ ...btnCoral, background: 'var(--grad)', fontSize: 12 }}>🚀 Siswa Demo</button>
                  </form>
                </div>
                {students.length === 0 ? (
                  <div className="note">Belum ada siswa. Klik &ldquo;Siswa Demo&rdquo; untuk mencoba.</div>
                ) : (
                  <div style={{ display: 'grid', gap: 10, maxHeight: 440, overflowY: 'auto', paddingRight: 4 }}>
                    {students.map((s) => {
                      const p = planByStudent.get(s.id);
                      const q = lastQuiz.get(s.id);
                      return (
                        <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '13px 16px', borderRadius: 14, background: 'var(--surface2)', border: '1.5px solid var(--line)' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: 800, fontSize: 15 }}>{s.nickname}</span>
                              <span className="chip" style={{ fontSize: 11 }}>Kelas {s.class}</span>
                              <code style={{ fontSize: 11, color: 'var(--muted)' }}>{s.school_code}</code>
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>
                              {s.consent_at ? '✅ Consent' : '⏳ Belum consent'} · {p?.goal ? '🎯 Ada tujuan' : 'Belum tujuan'} · {q ? `🧠 ${q.score}/${q.total}` : 'Belum kuis'} · 🪞 {(reflsByStudent.get(s.id) ?? []).length}
                            </div>
                          </div>
                          <form action={previewStudent}>
                            <input type="hidden" name="student_id" value={s.id} />
                            <button type="submit" style={btnCoral}>👁️ Masuk →</button>
                          </form>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ════════ GURU BK ════════ */}
        {tab === 'guru' && (
          <>
            <div>
              <span className="eyebrow" style={{ color: '#4f46e5' }}>Guru BK, Kode Sekolah &amp; Jadwal</span>
              <h2>Daftar Guru BK ({counselors.length})</h2>
            </div>
            <AddCounselorForm />
            <style>{`@media(min-width:760px){.guru-sub{display:grid!important;grid-template-columns:1fr 1fr;gap:16px}}`}</style>
            {counselors.map((c) => {
              const oc = codesByOwner.get(c.user_id) ?? [];
              const os = slotsByOwner.get(c.user_id) ?? [];
              const total = oc.reduce((n, x) => n + (studentsByCode.get(x.code) ?? 0), 0);
              return (
                <div key={c.user_id} className="card" style={{ borderTop: '3px solid #4f46e5' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: 18 }}>{c.name}</h3>
                      <span className="chip">{c.school_name}</span>
                      <span className="chip ok">{total} siswa</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <form action={previewGuru}>
                        <input type="hidden" name="user_id" value={c.user_id} />
                        <button type="submit" style={btnIndigo}>👁️ Lihat View</button>
                      </form>
                      <DeleteCounselorForm userId={c.user_id} name={c.name} />
                    </div>
                  </div>
                  <div className="guru-sub" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ padding: '14px 16px', borderRadius: 12, background: 'var(--surface2)', border: '1px solid var(--line)', display: 'grid', gap: 8 }}>
                      <b style={{ fontSize: 13 }}>🔑 Kode Sekolah ({oc.length})</b>
                      {oc.map((x) => (
                        <div key={x.code} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, background: '#fff', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--line)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <code style={{ fontWeight: 800, fontSize: 13, color: 'var(--accent)' }}>{x.code}</code>
                            <CopyButton text={x.code} />
                            <span style={{ fontSize: 12, color: 'var(--muted)' }}>({studentsByCode.get(x.code) ?? 0})</span>
                            {!x.active && <span className="chip warn" style={{ fontSize: 10 }}>Nonaktif</span>}
                          </div>
                          <form action={adminToggleCode}>
                            <input type="hidden" name="code" value={x.code} />
                            <button type="submit" style={{ fontSize: 11, fontWeight: 700, color: '#4f46e5', textDecoration: 'underline' }}>{x.active ? 'Nonaktifkan' : 'Aktifkan'}</button>
                          </form>
                        </div>
                      ))}
                      <form action={adminNewCode} style={{ display: 'flex', gap: 8 }}>
                        <input type="hidden" name="owner_id" value={c.user_id} />
                        <input type="text" name="note" placeholder="Catatan kode baru…" style={{ padding: '7px 10px', fontSize: 12 }} />
                        <button type="submit" style={{ ...btnIndigo, fontSize: 12, padding: '7px 12px' }}>+ Kode</button>
                      </form>
                    </div>
                    <div style={{ padding: '14px 16px', borderRadius: 12, background: 'var(--surface2)', border: '1px solid var(--line)', display: 'grid', gap: 8 }}>
                      <b style={{ fontSize: 13 }}>🕐 Jadwal Konsultasi ({os.length})</b>
                      {os.map((sl) => (
                        <div key={sl.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, background: '#fff', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--line)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 13, fontWeight: 700 }}>{sl.label}</span>
                            <span className={'chip' + (sl.active ? ' ok' : ' warn')} style={{ fontSize: 10 }}>{sl.active ? 'Aktif' : 'Nonaktif'}</span>
                          </div>
                          <form action={adminToggleSlot}>
                            <input type="hidden" name="id" value={sl.id} />
                            <button type="submit" style={{ fontSize: 11, fontWeight: 700, color: '#4f46e5', textDecoration: 'underline' }}>{sl.active ? 'Nonaktifkan' : 'Aktifkan'}</button>
                          </form>
                        </div>
                      ))}
                      <form action={adminAddSlot} style={{ display: 'flex', gap: 8 }}>
                        <input type="hidden" name="owner_id" value={c.user_id} />
                        <input type="text" name="label" placeholder="Rabu, 13.00 – 14.00" required style={{ padding: '7px 10px', fontSize: 12 }} />
                        <button type="submit" style={{ ...btnIndigo, background: 'var(--sec)', fontSize: 12, padding: '7px 12px' }}>+ Jadwal</button>
                      </form>
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* ════════ SISWA ════════ */}
        {tab === 'siswa' && (
          <>
            <div>
              <span className="eyebrow" style={{ color: '#4f46e5' }}>Detail Progres Siswa</span>
              <h2>Semua Siswa ({filteredStudents.length} dari {students.length})</h2>
            </div>

            <form method="get" className="card" style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', gap: 12, padding: '16px 20px' }}>
              <input type="hidden" name="tab" value="siswa" />
              <div style={{ flex: 1, minWidth: 160 }}>
                <label className="q" htmlFor="f-kelas">Kelas</label>
                <select id="f-kelas" name="kelas" defaultValue={sp.kelas ?? ''}>
                  <option value="">Semua Kelas</option>
                  {CLASSES.map((c) => <option key={c} value={c}>Kelas {c}</option>)}
                </select>
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <label className="q" htmlFor="f-kode">Kode Sekolah</label>
                <select id="f-kode" name="kode" defaultValue={sp.kode ?? ''}>
                  <option value="">Semua Kode</option>
                  {codes.map((c) => <option key={c.code} value={c.code}>{c.code} — {c.note}</option>)}
                </select>
              </div>
              <button type="submit" style={{ ...btnIndigo, height: 46, padding: '0 20px', fontSize: 14 }}>Terapkan</button>
            </form>

            {filteredStudents.length === 0 ? (
              <p className="lead">Tidak ada siswa yang sesuai filter.</p>
            ) : (
              <div className="tbl">
                <table>
                  <thead>
                    <tr><th>Siswa</th><th>Kelas &amp; Kode</th><th>Privasi</th><th>Progres</th><th>Isi Data</th><th>Aksi</th></tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((s) => {
                      const p = planByStudent.get(s.id);
                      const q = lastQuiz.get(s.id);
                      const rs = reflsByStudent.get(s.id) ?? [];
                      return (
                        <tr key={s.id}>
                          <td>
                            <div style={{ fontWeight: 800 }}>{s.nickname}</div>
                            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{counselorOfCode(s.school_code)?.school_name ?? '–'}</div>
                          </td>
                          <td><span className="chip" style={{ marginRight: 6 }}>{s.class}</span><code style={{ fontSize: 12 }}>{s.school_code}</code></td>
                          <td>
                            <span className={'chip' + (s.consent_at ? ' ok' : ' warn')}>{s.consent_at ? 'Consent' : 'Belum'}</span>
                            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Share: <b>{s.share_summary ? (s.include_reflection ? 'Ya + refleksi' : 'Ya') : 'Tidak'}</b></div>
                          </td>
                          <td style={{ fontSize: 12 }}>
                            <div>📅 {daysByStudent.get(s.id) ?? 0} hari</div>
                            <div>🧠 {q ? `${q.score}/${q.total || QUIZ.length}` : '–'}</div>
                            <div>🪞 {rs.length}x</div>
                          </td>
                          <td>
                            <details>
                              <summary style={{ fontSize: 12, color: '#4f46e5' }}>📋 Lihat</summary>
                              <div style={{ marginTop: 8, padding: '10px 12px', borderRadius: 10, background: 'var(--surface2)', border: '1px solid var(--line)', display: 'grid', gap: 5, fontSize: 12, maxWidth: 340 }}>
                                <div><b>Kebiasaan:</b> {p?.habit_focus ? habitLabel(p.habit_focus) : '–'}</div>
                                <div><b>Tujuan:</b> {p?.goal || '–'}</div>
                                <div><b>Jadwal:</b> {p?.sched_start ? `${p.sched_topic || 'Materi'} (${p.sched_start})` : '–'}</div>
                                <div><b>Strategi:</b> {p?.strategies?.length ? p.strategies.map(strategyLabel).join(', ') : '–'}</div>
                                <div><b>Fokus:</b> {[p?.focus_notif, p?.focus_place, p?.focus_tools].filter(Boolean).join(' · ') || '–'}</div>
                                {rs[0] && (
                                  <div style={{ borderTop: '1px solid var(--line)', paddingTop: 5 }}>
                                    <b>Refleksi terakhir ({BARRIER[rs[0].barrier]?.short}):</b>
                                    {rs[0].r1 && <div>• {rs[0].r1}</div>}
                                    {rs[0].r2 && <div>• {rs[0].r2}</div>}
                                    {rs[0].r3 && <div>• {rs[0].r3}</div>}
                                  </div>
                                )}
                              </div>
                            </details>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                              <form action={previewStudent}>
                                <input type="hidden" name="student_id" value={s.id} />
                                <button type="submit" style={{ ...btnIndigo, fontSize: 12, padding: '6px 12px' }}>👁️ View</button>
                              </form>
                              <DeleteStudentForm id={s.id} nickname={s.nickname} />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {codes.length > 0 && (
              <div className="card">
                <h3>🗑️ Hapus semua siswa per kode sekolah</h3>
                <DeleteAllStudentsForm codes={codes.map((c) => ({ code: c.code, note: c.note, count: studentsByCode.get(c.code) ?? 0 }))} />
              </div>
            )}
          </>
        )}

        {/* ════════ KONSULTASI & REFLEKSI ════════ */}
        {tab === 'konsul' && (
          <>
            <div>
              <span className="eyebrow" style={{ color: '#4f46e5' }}>Monitoring Layanan BK</span>
              <h2>Konsultasi &amp; Refleksi</h2>
            </div>

            <div className="card">
              <h3>📅 Permintaan Konsultasi ({requests.length})</h3>
              {requests.length === 0 ? (
                <p className="muted">Belum ada permintaan.</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 14 }}>
                  {requests.map((r) => {
                    const s = studentById.get(r.student_id);
                    return (
                      <div key={r.id} className="card" style={{ borderTop: `3px solid ${r.status === 'Baru' ? 'var(--accent)' : r.status === 'Selesai' ? 'var(--sec)' : '#d97706'}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontWeight: 800 }}>{s?.nickname ?? 'Siswa'}</div>
                            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Kelas {s?.class ?? '-'} · {s?.school_code ?? '-'}</div>
                          </div>
                          <span className={'chip' + (r.status === 'Baru' ? ' warn' : r.status === 'Selesai' ? ' ok' : '')}>{r.status}</span>
                        </div>
                        <div style={{ background: 'var(--surface2)', padding: '10px 12px', borderRadius: 10, fontSize: 13 }}>Jadwal: <b>{r.slot_label}</b></div>
                        <div className="seg3">
                          {STATUSES.map((st) => (
                            <form key={st} action={adminSetRequestStatus}>
                              <input type="hidden" name="id" value={r.id} />
                              <input type="hidden" name="status" value={st} />
                              <button className="opt" type="submit" aria-pressed={r.status === st} style={{ width: '100%', fontSize: 12, minHeight: 38, padding: '6px 8px' }}>{st}</button>
                            </form>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="card">
              <h3>🪞 Refleksi Terbaru ({reflections.length})</h3>
              {reflections.length === 0 ? (
                <p className="muted">Belum ada refleksi.</p>
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  {reflections.slice(0, 20).map((r) => {
                    const s = studentById.get(r.student_id);
                    return (
                      <div key={r.id} style={{ padding: '14px 16px', borderRadius: 12, background: r.support_flag ? 'var(--warn-bg)' : 'var(--surface2)', border: `1px solid ${r.support_flag ? 'var(--warn-line)' : 'var(--line)'}`, display: 'grid', gap: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <b>{s?.nickname ?? 'Siswa'}</b>
                          <span className="chip" style={{ fontSize: 11 }}>Kelas {s?.class ?? '-'}</span>
                          <span className="chip ok" style={{ fontSize: 11 }}>{BARRIER[r.barrier]?.short}</span>
                          {r.support_flag && <span className="chip warn" style={{ fontSize: 11 }}>🚨 Perlu perhatian</span>}
                        </div>
                        {r.r1 && <p style={{ fontSize: 13 }}><b>Berhasil:</b> {r.r1}</p>}
                        {r.r2 && <p style={{ fontSize: 13 }}><b>Kendala:</b> {r.r2}</p>}
                        {r.r3 && <p style={{ fontSize: 13 }}><b>Penyesuaian:</b> {r.r3}</p>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* ════════ EDIT KONTEN ════════ */}
        {tab === 'konten' && (
          <>
            <div>
              <span className="eyebrow" style={{ color: '#4f46e5' }}>Editor Konten</span>
              <h2>Edit Teks Aplikasi</h2>
            </div>
            <form action={saveContent} style={{ display: 'grid', gap: 16 }}>
              <div className="card">
                <h3>Halaman Utama</h3>
                {contentKeys.slice(0, 6).map(([key, label, ph]) => (
                  <div key={key}>
                    <label className="q" htmlFor={`content_${key}`}>{label}</label>
                    {key === 'home_subtitle' ? (
                      <textarea id={`content_${key}`} name={`content_${key}`} defaultValue={contents[key] ?? ph} rows={3} />
                    ) : (
                      <input type="text" id={`content_${key}`} name={`content_${key}`} defaultValue={contents[key] ?? ph} maxLength={200} />
                    )}
                  </div>
                ))}
              </div>
              <div className="card">
                <h3>Halaman Lainnya</h3>
                {contentKeys.slice(6).map(([key, label, ph]) => (
                  <div key={key}>
                    <label className="q" htmlFor={`content_${key}`}>{label}</label>
                    <textarea id={`content_${key}`} name={`content_${key}`} defaultValue={contents[key] ?? ph} rows={3} />
                  </div>
                ))}
              </div>
              <Submit pendingText="Menyimpan…">💾 Simpan Semua Perubahan</Submit>
            </form>
          </>
        )}
      </main>
    </div>
  );
}
