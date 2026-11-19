export const dynamic = 'force-dynamic'
import { requireStudent } from '@/lib/session';
import { studentData, slotsForCode } from '@/lib/data';
import { saveShare, requestConsult, logoutStudent, deleteMyData } from '@/app/actions';
import { BARRIER } from '@/lib/constants';
import { monthInfo } from '@/lib/util';
import Submit from '@/components/Submit';
import Flash from '@/components/Flash';

export default async function Bantuan({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const s = await requireStudent();
  const sp = await searchParams;
  const [d, slots] = await Promise.all([studentData(s.id), slotsForCode(s.school_code)]);
  const last = d.reflections[0];
  const n = monthInfo(d.days).n;

  const onlineSlots = slots.filter((sl) => sl.mode === 'online');
  const offlineSlots = slots.filter((sl) => sl.mode === 'offline');

  return (
    <>
      <div style={{ background: 'var(--grad)', borderRadius: 'var(--r-lg)', padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.10em', textTransform: 'uppercase', color: 'rgba(255,255,255,.6)' }}>Bantuan Guru BK</span>
        <h2 style={{ color: '#fff', margin: 0, fontSize: 24 }}>Ceritamu rahasia.</h2>
        <p style={{ color: 'rgba(255,255,255,.75)', margin: 0, fontSize: 15, lineHeight: 1.6, maxWidth: 480 }}>
          Kamu yang memilih apa yang dibagikan. Meminta bantuan itu langkah yang berani.
        </p>
      </div>

      <Flash ok={sp.ok} err={sp.err} />

      {/* Layout 2 kolom di desktop */}
      <style>{`@media(min-width:860px){.bantuan-layout{display:grid!important;grid-template-columns:1fr 1fr;gap:20px;align-items:start}}`}</style>
      <div className="bantuan-layout" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Kolom kiri */}
        <div style={{ display: 'grid', gap: 16 }}>
          {/* Bagikan ringkasan */}
          <form action={saveShare} className="card">
            <h3>Bagikan ringkasan ke guru BK?</h3>
            <fieldset style={{ gap: 8 }}>
              <label className="choice">
                <input type="radio" name="share" value="1" defaultChecked={s.share_summary} />
                <span>Ya, bagikan ringkasanku</span>
              </label>
              <label className="choice">
                <input type="radio" name="share" value="0" defaultChecked={!s.share_summary} />
                <span>Tidak, jangan bagikan</span>
              </label>
            </fieldset>
            <label className="check">
              <input type="checkbox" name="include" defaultChecked={s.include_reflection} />
              <span>Sertakan isi refleksiku (hanya berlaku jika memilih "Ya")</span>
            </label>
            <Submit>Simpan pilihan</Submit>

            {/* Preview */}
            <div style={{ padding: '12px 14px', borderRadius: 'var(--r)', background: 'var(--surface2)', border: '1px solid var(--line)' }}>
              <span className="small" style={{ fontWeight: 700, display: 'block', marginBottom: 8 }}>Yang saat ini dilihat guru BK:</span>
              {s.share_summary ? (
                <div style={{ display: 'grid', gap: 6 }}>
                  {[
                    ['Hambatan', last ? BARRIER[last.barrier].short : 'Belum diisi'],
                    ['Kuis', d.quiz ? `Benar ${d.quiz.score} dari ${d.quiz.total}` : 'Belum dikerjakan'],
                    ['Hari berlatih bulan ini', `${n} hari`],
                    ['Refleksi', s.include_reflection ? 'Ikut dibagikan' : 'Tidak dibagikan'],
                  ].map(([label, val]) => (
                    <div key={String(label)} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
                      <span style={{ color: 'var(--muted)' }}>{label}:</span>
                      <span style={{ fontWeight: 600, color: 'var(--ink2)' }}>{val}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>
                  Guru BK hanya menerima permintaan jadwal. Rencana, kuis, dan refleksimu tidak dibagikan.
                </p>
              )}
            </div>
          </form>
        </div>

        {/* Kolom kanan */}
        <div style={{ display: 'grid', gap: 16 }}>
          {/* Konsultasi */}
          <form action={requestConsult} className="card">
            <h3>Pilih jadwal konsultasi</h3>

            {slots.length === 0 ? (
              <div style={{ padding: '16px', background: 'var(--surface2)', borderRadius: 'var(--r)', textAlign: 'center' }}>
                <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0 }}>
                  Guru BK belum menyediakan jadwal.<br />Kamu bisa menemui guru BK langsung di sekolah.
                </p>
              </div>
            ) : (
              <>
                {/* Online slots */}
                {onlineSlots.length > 0 && (
                  <div style={{ display: 'grid', gap: 8 }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '7px 12px', borderRadius: 8,
                      background: '#e8f7f5', border: '1px solid #c0eae5',
                    }}>
                      <span style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: '#2a9d8f', flexShrink: 0,
                      }} />
                      <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#2a9d8f' }}>
                        Online
                      </span>
                      <span style={{ fontSize: 11, color: '#2a9d8f', opacity: .75 }}>— via video call / chat</span>
                    </div>
                    <fieldset style={{ gap: 6 }}>
                      {onlineSlots.map((sl) => (
                        <label key={sl.id} className="choice">
                          <input type="radio" name="slot" value={sl.id} />
                          <span>{sl.label}</span>
                        </label>
                      ))}
                    </fieldset>
                  </div>
                )}

                {/* Offline slots */}
                {offlineSlots.length > 0 && (
                  <div style={{ display: 'grid', gap: 8, marginTop: onlineSlots.length > 0 ? 12 : 0 }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '7px 12px', borderRadius: 8,
                      background: '#fff0ef', border: '1px solid #fad9d7',
                    }}>
                      <span style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: '#e8524a', flexShrink: 0,
                      }} />
                      <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#e8524a' }}>
                        Tatap Muka
                      </span>
                      <span style={{ fontSize: 11, color: '#e8524a', opacity: .75 }}>— di sekolah</span>
                    </div>
                    <fieldset style={{ gap: 6 }}>
                      {offlineSlots.map((sl) => (
                        <label key={sl.id} className="choice">
                          <input type="radio" name="slot" value={sl.id} />
                          <span>{sl.label}</span>
                        </label>
                      ))}
                    </fieldset>
                  </div>
                )}

                <Submit>Ajukan jadwal</Submit>
              </>
            )}

            {d.requests.length > 0 && (
              <div style={{ display: 'grid', gap: 8, marginTop: 4 }}>
                <span className="small" style={{ fontWeight: 700 }}>Permintaan sebelumnya:</span>
                {d.requests.map((r) => {
                  const isOnline = r.mode === 'online';
                  const hasReply = isOnline
                    ? !!(r.confirmed_time || r.meet_link)
                    : !!(r.room_info || r.reschedule_note);
                  return (
                    <div key={r.id} style={{
                      background: 'var(--surface2)',
                      borderRadius: 'var(--r)', border: '1px solid var(--line)',
                      overflow: 'hidden',
                    }}>
                      {/* Baris utama */}
                      <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '10px 14px', gap: 8, flexWrap: 'wrap',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                            background: isOnline ? '#e8f7f5' : '#fff0ef',
                            color: isOnline ? '#2a9d8f' : '#e8524a',
                            border: `1px solid ${isOnline ? '#c0eae5' : '#fad9d7'}`,
                            whiteSpace: 'nowrap',
                          }}>
                            {isOnline ? 'Online' : 'Tatap Muka'}
                          </span>
                          <span style={{ fontWeight: 600, fontSize: 14 }}>{r.slot_label}</span>
                        </div>
                        <span className={'chip' + (r.status === 'Baru' ? ' warn' : r.status === 'Selesai' ? ' ok' : '')}>{r.status}</span>
                      </div>

                      {/* Balasan guru BK */}
                      {hasReply && (
                        <div style={{
                          borderTop: `1px solid ${isOnline ? '#c0eae5' : '#fad9d7'}`,
                          background: isOnline ? '#f0faf8' : '#fff8f7',
                          padding: '10px 14px', fontSize: 13, display: 'grid', gap: 6,
                        }}>
                          <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: isOnline ? '#2a9d8f' : '#e8524a' }}>
                            Info dari Guru BK
                          </span>
                          {isOnline ? (
                            <>
                              {r.confirmed_time && (
                                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                  <span style={{ color: 'var(--muted)' }}>Waktu:</span>
                                  <strong>{r.confirmed_time}</strong>
                                </div>
                              )}
                              {r.meet_link && (
                                <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                                  <span style={{ color: 'var(--muted)', flexShrink: 0 }}>Link meeting:</span>
                                  <a
                                    href={r.meet_link} target="_blank" rel="noopener noreferrer"
                                    style={{
                                      color: '#2a9d8f', fontWeight: 700, wordBreak: 'break-all',
                                      background: '#fff', padding: '3px 10px', borderRadius: 6,
                                      border: '1px solid #c0eae5', textDecoration: 'none', fontSize: 13,
                                    }}
                                  >
                                    Buka link meeting →
                                  </a>
                                </div>
                              )}
                            </>
                          ) : (
                            <>
                              {r.room_info && (
                                <div style={{ display: 'flex', gap: 6 }}>
                                  <span style={{ color: 'var(--muted)', flexShrink: 0 }}>Ruangan:</span>
                                  <strong>{r.room_info}</strong>
                                </div>
                              )}
                              {r.reschedule_note && (
                                <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                                  <span style={{ color: 'var(--muted)', flexShrink: 0 }}>Catatan:</span>
                                  <span>{r.reschedule_note}</span>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </form>

          {/* Kapan minta bantuan */}
          <div className="card">
            <h3>Kapan sebaiknya meminta bantuan?</h3>
            <div style={{ display: 'grid', gap: 8 }}>
              {[
                'Sudah mencoba strategi beberapa minggu tapi kesulitan belum berkurang.',
                'Merasa cemas, sedih, atau lelah berkepanjangan karena belajar.',
                'Bingung memilih strategi atau mengatur waktu.',
                'Ingin berdiskusi tentang hambatan yang tidak ingin ditulis.',
              ].map((text, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14 }}>
                  <span style={{ color: 'var(--accent)', fontWeight: 700, flexShrink: 0 }}>→</span>
                  <span style={{ color: 'var(--muted)', lineHeight: 1.5 }}>{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Alert segera */}
          <div className="note">
            <span className="big">Butuh bantuan segera?</span>
            <small>Hubungi guru BK atau orang dewasa yang kamu percaya. Aplikasi ini bukan layanan krisis dan tidak membalas pesan.</small>
          </div>
        </div>
      </div>

      {/* Pengaturan data */}
      <details className="card">
        <summary>Pengaturan data</summary>
        <style>{`@media(min-width:600px){.data-settings{display:grid!important;grid-template-columns:1fr 1fr;gap:16px}}`}</style>
        <div className="data-settings" style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
          <div style={{ padding: '16px', background: 'var(--surface2)', borderRadius: 'var(--r)', display: 'grid', gap: 10 }}>
            <p className="small" style={{ margin: 0 }}>Keluar dari perangkat ini. Tanpa kata sandi, kamu tidak bisa membuka data ini lagi setelah keluar.</p>
            <form action={logoutStudent}>
              <Submit className="btn ghost" pendingText="Keluar…">Keluar dari perangkat ini</Submit>
            </form>
          </div>
          <div style={{ padding: '16px', background: 'var(--danger-tint)', borderRadius: 'var(--r)', border: '1px solid var(--danger)', display: 'grid', gap: 10 }}>
            <p className="small" style={{ margin: 0 }}>Hapus semua data: rencana, kuis, refleksi, permintaan jadwal. <b>Tidak bisa dibatalkan.</b></p>
            <form action={deleteMyData}>
              <Submit className="btn danger" pendingText="Menghapus…">Hapus semua dataku</Submit>
            </form>
          </div>
        </div>
      </details>

      <p className="small" style={{ textAlign: 'center' }}>
        Yang bisa melihat datamu: kamu, dan guru BK untuk bagian yang kamu izinkan saja.
      </p>
    </>
  );
}
