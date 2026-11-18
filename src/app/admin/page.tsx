export const dynamic = 'force-dynamic'
import Link from 'next/link';
import { requireAdmin } from '@/lib/session';
import { admin } from '@/lib/supabase-admin';
import { logoutAdmin, saveContent } from '@/app/admin-actions';
import Submit from '@/components/Submit';
import AddCounselorForm from '@/components/AddCounselorForm';
import { DeleteCounselorForm, DeleteStudentForm, DeleteAllStudentsForm } from '@/components/AdminActions';
import CopyButton from '@/components/CopyButton';

type SP = { tab?: string; ok?: string };

export default async function AdminPage({ searchParams }: { searchParams: Promise<SP> }) {
  const a = await requireAdmin();
  const sp = await searchParams;
  const tab = sp.tab === 'guru' || sp.tab === 'siswa' || sp.tab === 'konten' ? sp.tab : 'overview';
  const sb = admin();

  // Ambil semua data — wrap try/catch kalau tabel belum ada
  let counselors: Array<{ user_id: string; name: string; school_name: string; created_at: string }> = [];
  let students: Array<{ id: string; nickname: string; class: string; school_code: string; consent_at: string | null; created_at: string }> = [];
  let codes: Array<{ code: string; owner_id: string; note: string; active: boolean; created_at: string }> = [];
  let contents: Record<string, string> = {};
  let dbError: string | null = null;

  try {
    const [counselorsRes, studentsRes, codesRes, contentRes] = await Promise.all([
      sb.from('counselors').select('user_id,name,school_name,created_at').order('created_at', { ascending: false }),
      sb.from('students').select('id,nickname,class,school_code,consent_at,created_at').order('created_at', { ascending: false }),
      sb.from('school_codes').select('code,owner_id,note,active,created_at').order('created_at', { ascending: false }),
      sb.from('site_content').select('key,value').order('key'),
    ]);
    counselors = counselorsRes.data ?? [];
    students = studentsRes.data ?? [];
    codes = codesRes.data ?? [];
    contents = Object.fromEntries((contentRes.data ?? []).map(r => [r.key, r.value]));
    if (counselorsRes.error) dbError = `DB Error: ${counselorsRes.error.message}`;
  } catch (e) {
    dbError = `Tabel belum dibuat. Jalankan schema.sql di Supabase SQL Editor. (${e})`;
  }

  // Helper: jumlah siswa per kode
  const studentsByCode = new Map<string, number>();
  for (const s of students) studentsByCode.set(s.school_code, (studentsByCode.get(s.school_code) ?? 0) + 1);

  // Helper: kode per guru
  const codesByOwner = new Map<string, typeof codes>();
  for (const c of codes) {
    if (!codesByOwner.has(c.owner_id)) codesByOwner.set(c.owner_id, []);
    codesByOwner.get(c.owner_id)!.push(c);
  }

  const tabs: Array<[string, string, string]> = [
    ['overview', '📊', 'Overview'],
    ['guru', '👩‍🏫', 'Guru BK'],
    ['siswa', '🎒', 'Siswa'],
    ['konten', '✏️', 'Edit Konten'],
  ];

  const contentKeys: Array<[string, string, string]> = [
    ['home_title',    'Judul Halaman Utama',         'Ruang Strategi Belajar'],
    ['home_subtitle', 'Subjudul / Deskripsi Hero',    'Kenali kebiasaan belajarmu...'],
    ['home_badge1',   'Badge 1',                      'Strategi Belajar'],
    ['home_badge2',   'Badge 2',                      'Tujuan Mingguan'],
    ['home_badge3',   'Badge 3',                      'Manajemen Waktu'],
    ['home_badge4',   'Badge 4',                      'Refleksi Diri'],
    ['strategi_intro','Intro Halaman Strategi',        ''],
    ['footer_text',   'Teks Footer',                  'Ruang Strategi Belajar · Media Layanan BK'],
  ];

  return (
    <div className="app wide">
      {/* ── Topbar ── */}
      <div className="topbar" style={{ background: 'var(--grad-admin)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '10px',
            background: 'rgba(255,255,255,.15)',
            display: 'grid', placeItems: 'center', fontSize: '16px',
          }}>⚙️</div>
          <b style={{ color: '#fff', WebkitTextFillColor: '#fff', background: 'none' }}>Panel Admin · RSB</b>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,.65)', fontWeight: 600 }}>Halo, {a.name}</span>
          <form action={logoutAdmin}>
            <button className="btn link" type="submit" style={{ color: '#fca5a5', textDecorationColor: '#fca5a5', fontSize: '13px' }}>Keluar</button>
          </form>
        </div>
      </div>

      <main className="screen">
        {dbError && (
          <div className="note" style={{ fontFamily: 'monospace', fontSize: '13px' }}>
            <span className="big">⚠️ Database belum siap</span>
            {dbError}
            <div style={{ marginTop: '12px', display: 'grid', gap: '8px' }}>
              <p style={{ fontWeight: 400 }}>Jalankan SQL berikut di <a href="https://supabase.com/dashboard/project/hdmyigzrioalkweobcob/sql/new" target="_blank" style={{ color: 'var(--warn-ink)', textDecoration: 'underline' }}>Supabase SQL Editor</a>:</p>
              <code style={{ background: 'rgba(0,0,0,.15)', padding: '8px 12px', borderRadius: '8px', display: 'block', whiteSpace: 'pre-wrap', fontSize: '12px' }}>{`-- 1. Copy paste seluruh isi file supabase/schema.sql lalu Run\n-- 2. Setelah berhasil, insert admin:\ninsert into admins (user_id, name)\nvalues ('4670740a-ffcd-4f9a-9847-37ef0175f91f', 'Super Admin')\non conflict (user_id) do nothing;`}</code>
            </div>
          </div>
        )}
        {sp.ok && (
          <div className="note good">✅ Perubahan berhasil disimpan.</div>
        )}

        {/* ── Tab navigation ── */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {tabs.map(([k, icon, label]) => (
            <Link
              key={k}
              href={`/admin?tab=${k}`}
              style={{
                padding: '8px 20px', borderRadius: 'var(--r)',
                border: '1.5px solid var(--line)',
                background: tab === k ? '#4f46e5' : 'var(--surface)',
                color: tab === k ? '#fff' : 'var(--muted)',
                fontWeight: 700, fontSize: '14px', textDecoration: 'none',
                display: 'flex', alignItems: 'center', gap: '6px',
                transition: 'all .15s',
              }}
            >
              {icon} {label}
            </Link>
          ))}
        </div>

        {/* ════════ TAB: OVERVIEW ════════ */}
        {tab === 'overview' && (
          <>
            <div>
              <span className="eyebrow">Super Admin Dashboard</span>
              <h2>Selamat datang, {a.name}</h2>
            </div>

            {/* Stats */}
            <div className="stats">
              <div className="card" style={{ borderTop: '3px solid #4f46e5' }}>
                <span className="stat" style={{ color: '#4f46e5' }}>{counselors.length}</span>
                <span className="small">Guru BK terdaftar</span>
              </div>
              <div className="card" style={{ borderTop: '3px solid var(--accent)' }}>
                <span className="stat">{students.length}</span>
                <span className="small">Total siswa</span>
              </div>
              <div className="card" style={{ borderTop: '3px solid #f59e0b' }}>
                <span className="stat" style={{ color: '#f59e0b' }}>{codes.filter(c => c.active).length}</span>
                <span className="small">Kode aktif</span>
              </div>
            </div>

            {/* Daftar sekolah ringkas */}
            <div className="card">
              <h3>Semua Sekolah</h3>
              {counselors.length === 0 ? (
                <p className="muted">Belum ada guru BK. Tambahkan di tab Guru BK.</p>
              ) : (
                <div className="list">
                  {counselors.map(c => {
                    const ownerCodes = codesByOwner.get(c.user_id) ?? [];
                    const totalSiswa = ownerCodes.reduce((n, oc) => n + (studentsByCode.get(oc.code) ?? 0), 0);
                    return (
                      <div key={c.user_id} className="item" style={{ cursor: 'default' }}>
                        <span>
                          <span className="t">{c.school_name}</span>
                          <span className="d">{c.name} · {totalSiswa} siswa · {ownerCodes.length} kode</span>
                        </span>
                        <span className="chip">{ownerCodes.filter(x => x.active).length} aktif</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick links */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '12px' }}>
              {[
                ['👩‍🏫', 'Kelola Guru BK', '/admin?tab=guru'],
                ['🎒', 'Lihat Semua Siswa', '/admin?tab=siswa'],
                ['✏️', 'Edit Konten App', '/admin?tab=konten'],
              ].map(([icon, label, href]) => (
                <Link key={href} href={href} className="card" style={{ textDecoration: 'none', flexDirection: 'row', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '24px' }}>{icon}</span>
                  <span style={{ fontWeight: 700, color: 'var(--ink2)' }}>{label}</span>
                </Link>
              ))}
            </div>
          </>
        )}

        {/* ════════ TAB: GURU BK ════════ */}
        {tab === 'guru' && (
          <>
            <div>
              <span className="eyebrow">Manajemen Guru BK</span>
              <h2>Daftar Guru BK</h2>
            </div>

            <AddCounselorForm />

            {counselors.length > 0 && (
              <div className="tbl">
                <table>
                  <thead>
                    <tr>
                      <th>Nama</th>
                      <th>Sekolah</th>
                      <th>Kode Sekolah</th>
                      <th>Total Siswa</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {counselors.map(c => {
                      const ownerCodes = codesByOwner.get(c.user_id) ?? [];
                      const totalSiswa = ownerCodes.reduce((n, oc) => n + (studentsByCode.get(oc.code) ?? 0), 0);
                      return (
                        <tr key={c.user_id}>
                          <td><b>{c.name}</b></td>
                          <td>{c.school_name}</td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              {ownerCodes.map(oc => (
                                <div key={oc.code} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <code style={{
                                    fontSize: '12px', background: 'var(--surface2)',
                                    padding: '2px 8px', borderRadius: '6px',
                                    border: '1px solid var(--line)',
                                    letterSpacing: '.05em', fontWeight: 700,
                                  }}>
                                    {oc.code}
                                  </code>
                                  <CopyButton text={oc.code} />
                                  {!oc.active && (
                                    <span className="chip warn" style={{ fontSize: '10px', padding: '1px 6px' }}>nonaktif</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="num">{totalSiswa}</td>
                          <td>
                            <DeleteCounselorForm userId={c.user_id} name={c.name} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ════════ TAB: SISWA ════════ */}
        {tab === 'siswa' && (
          <>
            <div>
              <span className="eyebrow">Manajemen Siswa</span>
              <h2>Semua Siswa ({students.length})</h2>
            </div>

            {students.length === 0 ? (
              <p className="lead">Belum ada siswa terdaftar.</p>
            ) : (
              <div className="tbl">
                <table>
                  <thead>
                    <tr>
                      <th>Nama Panggilan</th>
                      <th>Kelas</th>
                      <th>Kode Sekolah</th>
                      <th>Sekolah</th>
                      <th>Consent</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map(s => {
                      const code = codes.find(c => c.code === s.school_code);
                      const counselor = counselors.find(c => c.user_id === code?.owner_id);
                      return (
                        <tr key={s.id}>
                          <td><b>{s.nickname}</b></td>
                          <td>{s.class}</td>
                          <td><code style={{ fontSize: '12px' }}>{s.school_code}</code></td>
                          <td>{counselor?.school_name ?? '–'}</td>
                          <td>
                            <span className={'chip' + (s.consent_at ? '' : ' warn')}>
                              {s.consent_at ? 'Sudah' : 'Belum'}
                            </span>
                          </td>
                          <td>
                            <DeleteStudentForm id={s.id} nickname={s.nickname} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Hapus semua siswa per kode */}
            {codes.length > 0 && (
              <div className="card">
                <h3>Hapus semua siswa per kode sekolah</h3>
                <DeleteAllStudentsForm codes={codes.map(c => ({
                  code: c.code,
                  note: c.note,
                  count: studentsByCode.get(c.code) ?? 0,
                }))} />
              </div>
            )}
          </>
        )}

        {/* ════════ TAB: EDIT KONTEN ════════ */}
        {tab === 'konten' && (
          <>
            <div>
              <span className="eyebrow">Editor Konten</span>
              <h2>Edit Teks Aplikasi</h2>
            </div>
            <p className="lead">Ubah teks yang tampil di halaman-halaman aplikasi. Perubahan langsung terlihat setelah disimpan.</p>

            <form action={saveContent} style={{ display: 'grid', gap: '16px' }}>
              <div className="card">
                <h3>Halaman Utama</h3>
                {contentKeys.slice(0, 6).map(([key, label, placeholder]) => (
                  <div key={key}>
                    <label className="q" htmlFor={`content_${key}`}>{label}</label>
                    {key === 'home_subtitle' ? (
                      <textarea id={`content_${key}`} name={`content_${key}`} defaultValue={contents[key] ?? placeholder} rows={3} />
                    ) : (
                      <input type="text" id={`content_${key}`} name={`content_${key}`} defaultValue={contents[key] ?? placeholder} maxLength={200} />
                    )}
                  </div>
                ))}
              </div>

              <div className="card">
                <h3>Halaman Lainnya</h3>
                {contentKeys.slice(6).map(([key, label, placeholder]) => (
                  <div key={key}>
                    <label className="q" htmlFor={`content_${key}`}>{label}</label>
                    <textarea id={`content_${key}`} name={`content_${key}`} defaultValue={contents[key] ?? placeholder} rows={3} />
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
