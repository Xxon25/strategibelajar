export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { requireStudent } from '@/lib/session';
import { admin } from '@/lib/supabase-admin';
import { getMessages, sendStudentMessage } from '@/app/chat-actions';
import ChatBox from '@/components/ChatBox';

export default async function SiswaChat({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const { requestId } = await params;
  const s = await requireStudent();

  // Pastikan request ini milik siswa yang login
  const { data: req } = await admin()
    .from('consult_requests')
    .select('id, slot_label, mode, status, confirmed_time, meet_link, room_info, reschedule_note')
    .eq('id', requestId)
    .eq('student_id', s.id)
    .maybeSingle();

  if (!req) notFound();

  const messages = await getMessages(requestId);
  const isOnline = req.mode === 'online';

  return (
    <>
      {/* Header */}
      <div style={{
        background: 'var(--grad)', borderRadius: 'var(--r-lg)',
        padding: '22px 28px', display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        <Link href="/siswa/bantuan" style={{
          fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,.7)',
          textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4,
          marginBottom: 2, width: 'fit-content',
        }}>
          ← Kembali ke Bantuan BK
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <h2 style={{ color: '#fff', margin: 0, fontSize: 20 }}>Chat dengan Guru BK</h2>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 99,
            background: isOnline ? '#2a9d8f' : '#c73b35',
            color: '#fff',
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
        <p style={{ color: 'rgba(255,255,255,.75)', margin: 0, fontSize: 13 }}>
          Jadwal: {req.slot_label}
        </p>
      </div>

      {/* Info balasan guru (jika sudah ada) */}
      {(req.confirmed_time || req.meet_link || req.room_info || req.reschedule_note) && (
        <div style={{
          background: isOnline ? '#e8f7f5' : '#fff0ef',
          border: `1.5px solid ${isOnline ? '#c0eae5' : '#fad9d7'}`,
          borderRadius: 'var(--r)', padding: '14px 18px',
          display: 'grid', gap: 6, fontSize: 13,
        }}>
          <span style={{
            fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '.07em', color: isOnline ? '#2a9d8f' : '#e8524a',
          }}>
            Info dari Guru BK
          </span>
          {isOnline ? (
            <>
              {req.confirmed_time && (
                <div>
                  <span style={{ color: 'var(--muted)' }}>Waktu: </span>
                  <strong>{req.confirmed_time}</strong>
                </div>
              )}
              {req.meet_link && (
                <a
                  href={req.meet_link} target="_blank" rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    color: '#2a9d8f', fontWeight: 700,
                    background: '#fff', padding: '7px 14px', borderRadius: 8,
                    border: '1px solid #c0eae5', textDecoration: 'none',
                    width: 'fit-content',
                  }}
                >
                  Buka Link Meeting →
                </a>
              )}
            </>
          ) : (
            <>
              {req.room_info && (
                <div>
                  <span style={{ color: 'var(--muted)' }}>Ruangan: </span>
                  <strong>{req.room_info}</strong>
                </div>
              )}
              {req.reschedule_note && (
                <div>
                  <span style={{ color: 'var(--muted)' }}>Catatan: </span>
                  {req.reschedule_note}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Chat box */}
      <div style={{ flex: 1, minHeight: 400, display: 'flex', flexDirection: 'column' }}>
        <ChatBox
          requestId={requestId}
          myRole="student"
          myLabel={s.nickname}
          otherLabel="Guru BK"
          initialMessages={messages}
          sendAction={sendStudentMessage}
        />
      </div>

      <p className="small" style={{ textAlign: 'center' }}>
        Percakapan ini hanya dilihat oleh kamu dan Guru BK.
      </p>
    </>
  );
}
