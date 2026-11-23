export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { requireGuru } from '@/lib/session';
import { admin } from '@/lib/supabase-admin';
import { getMessages, sendGuruMessage } from '@/app/chat-actions';
import ChatBox from '@/components/ChatBox';

export default async function GuruChat({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const { requestId } = await params;
  const g = await requireGuru();

  // Ambil request + verifikasi kepemilikan guru
  const { data: req } = await admin()
    .from('consult_requests')
    .select('id, slot_label, mode, status, student_id, confirmed_time, meet_link, room_info, reschedule_note')
    .eq('id', requestId)
    .maybeSingle();

  if (!req) notFound();

  // Verifikasi siswa pakai kode milik guru ini
  const { data: student } = await admin()
    .from('students')
    .select('id, nickname, class, school_code')
    .eq('id', req.student_id)
    .maybeSingle();

  if (!student) notFound();

  const { data: codeCheck } = await admin()
    .from('school_codes')
    .select('code')
    .eq('code', student.school_code)
    .eq('owner_id', g.user_id)
    .maybeSingle();

  if (!codeCheck) notFound();

  const messages = await getMessages(requestId);
  const isOnline = req.mode === 'online';

  return (
    <div className="app wide">
      {/* Topbar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        padding: '0 max(32px, calc((100% - 1200px)/2))',
        height: 60, flexShrink: 0, background: '#fff',
        borderBottom: '1px solid var(--line)', position: 'sticky', top: 0, zIndex: 10,
        boxShadow: 'var(--shadow-sm)',
      }}>
        <Link href="/guru?tab=konsul" style={{
          display: 'flex', alignItems: 'center', gap: 8,
          fontWeight: 700, fontSize: 14, color: 'var(--accent)', textDecoration: 'none',
        }}>
          ← Kembali ke Konsultasi
        </Link>
        <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>
          {g.name} · {g.school_name}
        </span>
      </div>

      <main className="screen" style={{ maxHeight: 'calc(100dvh - 60px)', display: 'flex', flexDirection: 'column' }}>
        {/* Header siswa */}
        <div style={{
          background: 'var(--grad)', borderRadius: 'var(--r-lg)',
          padding: '22px 28px', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: 'rgba(255,255,255,.2)',
              display: 'grid', placeItems: 'center',
              fontSize: 20, fontWeight: 800, color: '#fff', flexShrink: 0,
            }}>
              {student.nickname[0].toUpperCase()}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <h2 style={{ color: '#fff', margin: 0, fontSize: 20 }}>{student.nickname}</h2>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 99,
                  background: 'rgba(255,255,255,.18)', color: '#fff',
                }}>Kelas {student.class}</span>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 99,
                  background: isOnline ? '#2a9d8f' : '#c73b35', color: '#fff',
                }}>
                  {isOnline ? 'Online' : 'Tatap Muka'}
                </span>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 99,
                  background: 'rgba(255,255,255,.18)', color: '#fff',
                }}>
                  {req.status}
                </span>
              </div>
              <p style={{ color: 'rgba(255,255,255,.75)', margin: '4px 0 0', fontSize: 13 }}>
                Jadwal: {req.slot_label}
              </p>
            </div>
          </div>
        </div>

        {/* Info balasan yang sudah ada */}
        {(req.confirmed_time || req.meet_link || req.room_info || req.reschedule_note) && (
          <div style={{
            background: isOnline ? '#e8f7f5' : '#fff0ef',
            border: `1.5px solid ${isOnline ? '#c0eae5' : '#fad9d7'}`,
            borderRadius: 'var(--r)', padding: '12px 16px',
            display: 'flex', gap: 16, fontSize: 13, flexWrap: 'wrap',
            alignItems: 'center', flexShrink: 0,
          }}>
            <span style={{
              fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '.07em', color: isOnline ? '#2a9d8f' : '#e8524a',
              flexShrink: 0,
            }}>Sudah dikonfirmasi</span>
            {isOnline && req.confirmed_time && <span><strong>{req.confirmed_time}</strong></span>}
            {isOnline && req.meet_link && (
              <a href={req.meet_link} target="_blank" rel="noopener noreferrer"
                style={{ color: '#2a9d8f', fontWeight: 700, wordBreak: 'break-all' }}>
                {req.meet_link}
              </a>
            )}
            {!isOnline && req.room_info && <span>Ruangan: <strong>{req.room_info}</strong></span>}
            {!isOnline && req.reschedule_note && <span>{req.reschedule_note}</span>}
            <Link href="/guru?tab=konsul" style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>
              Edit balasan →
            </Link>
          </div>
        )}

        {/* Chat box */}
        <div style={{ flex: 1, minHeight: 360 }}>
          <ChatBox
            requestId={requestId}
            myRole="counselor"
            myLabel={g.name}
            otherLabel={student.nickname}
            initialMessages={messages}
            sendAction={sendGuruMessage}
          />
        </div>
      </main>
    </div>
  );
}
