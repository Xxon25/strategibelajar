'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export type ChatMsg = {
  id: string;
  request_id: string;
  sender_role: 'siswa' | 'guru';
  sender_name: string;
  message: string;
  created_at: string;
  pending?: boolean;
};

function fmtTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString('id-ID', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export default function ConsultChat({
  requestId,
  viewerRole,
  viewerName,
  partnerLabel,
  slotLabel,
  status,
  defaultOpen = true,
  initialMessages = [],
}: {
  requestId: string;
  viewerRole: 'siswa' | 'guru';
  viewerName: string;
  partnerLabel: string;
  slotLabel: string;
  status: string;
  defaultOpen?: boolean;
  initialMessages?: ChatMsg[];
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [messages, setMessages] = useState<ChatMsg[]>(initialMessages);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loadedOnce, setLoadedOnce] = useState(initialMessages.length > 0);
  const listRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    const el = listRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, []);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/chat?requestId=${encodeURIComponent(requestId)}&as=${viewerRole}`,
        { cache: 'no-store' }
      );
      if (!res.ok) return;
      const data = (await res.json()) as { messages?: ChatMsg[] };
      if (Array.isArray(data.messages)) {
        setMessages((prev) => {
          const pending = prev.filter((m) => m.pending);
          const committed = prev.filter((m) => !m.pending);
          if (
            pending.length === 0 &&
            committed.length === data.messages!.length &&
            committed[committed.length - 1]?.id === data.messages![data.messages!.length - 1]?.id
          ) {
            return prev;
          }
          const serverKeys = new Set(data.messages!.map((m) => `${m.sender_role}|${m.message}`));
          const remaining = pending.filter((p) => !serverKeys.has(`${p.sender_role}|${p.message}`));
          return [...data.messages!, ...remaining];
        });
        setLoadedOnce(true);
      }
    } catch {
      /* abaikan error jaringan sementara saat polling */
    }
  }, [requestId, viewerRole]);

  useEffect(() => {
    if (!open) return;
    void fetchMessages();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void fetchMessages();
    };
    const onFocus = () => void fetchMessages();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onFocus);
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        void fetchMessages();
      }
    }, 2000);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onFocus);
    };
  }, [open, fetchMessages]);

  useEffect(() => {
    if (open) scrollToBottom();
  }, [messages.length, open, scrollToBottom]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = text.trim();
    if (!clean || sending) return;

    setErr(null);
    setText('');
    setSending(true);

    const tempId = 'temp-' + Date.now();
    const optimistic: ChatMsg = {
      id: tempId,
      request_id: requestId,
      sender_role: viewerRole,
      sender_name: viewerName,
      message: clean,
      created_at: new Date().toISOString(),
      pending: true,
    };

    setMessages((prev) => [...prev, optimistic]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          message: clean,
          asRole: viewerRole,
        }),
      });
      const data = (await res.json()) as { message?: ChatMsg; error?: string };
      if (!res.ok || !data.message) {
        setErr(data.error || 'Gagal mengirim pesan.');
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setText(clean);
      } else {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? data.message! : m))
        );
      }
    } catch {
      setErr('Koneksi terputus. Coba kirim ulang.');
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setText(clean);
    } finally {
      setSending(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '10px 14px',
          borderRadius: 12,
          background: 'linear-gradient(135deg, #fff0ef 0%, #e8f7f5 100%)',
          border: '1.5px solid var(--accent)',
          color: 'var(--ink2)',
          fontWeight: 700,
          fontSize: 13,
          cursor: 'pointer',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>💬</span>
          <span>Buka Live Chat dengan {partnerLabel}</span>
        </span>
        <span
          style={{
            background: 'var(--accent)',
            color: '#fff',
            padding: '2px 10px',
            borderRadius: 99,
            fontSize: 11,
            fontWeight: 800,
          }}
        >
          {messages.length > 0 ? `${messages.length} pesan` : 'Chat'}
        </span>
      </button>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 16,
        border: '1.5px solid var(--line)',
        background: '#ffffff',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {/* Header Chat */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          padding: '12px 16px',
          background:
            viewerRole === 'siswa'
              ? 'var(--grad)'
              : 'linear-gradient(135deg, #2a9d8f 0%, #21867a 100%)',
          color: '#fff',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <span
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: 'rgba(255,255,255,.2)',
              display: 'grid',
              placeItems: 'center',
              fontSize: 17,
              flexShrink: 0,
            }}
          >
            💬
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'var(--fd)', fontWeight: 800, fontSize: 14 }}>
                Live Chat · {partnerLabel}
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  background: 'rgba(255,255,255,.22)',
                  padding: '1px 8px',
                  borderRadius: 99,
                  fontSize: 10,
                  fontWeight: 800,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#bbf7d0',
                    display: 'inline-block',
                  }}
                />
                {status}
              </span>
            </div>
            <div style={{ fontSize: 11, opacity: 0.85, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Jadwal: {slotLabel}
            </div>
          </div>
        </div>
        {!defaultOpen && (
          <button
            type="button"
            onClick={() => setOpen(false)}
            style={{
              padding: '4px 10px',
              borderRadius: 8,
              background: 'rgba(255,255,255,.18)',
              color: '#fff',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            Tutup ✕
          </button>
        )}
      </div>

      {/* Daftar Pesan */}
      <div
        ref={listRef}
        style={{
          height: 290,
          overflowY: 'auto',
          padding: '14px 16px',
          background: '#fdf8f3',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {messages.length === 0 ? (
          <div
            style={{
              margin: 'auto',
              textAlign: 'center',
              padding: '20px 16px',
              color: 'var(--muted)',
              maxWidth: 300,
            }}
          >
            <div style={{ fontSize: 28, marginBottom: 6 }}>👋</div>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink2)' }}>
              {loadedOnce ? 'Belum ada pesan di sesi konsultasi ini.' : 'Memuat percakapan…'}
            </div>
            <p style={{ fontSize: 12, marginTop: 4, lineHeight: 1.5 }}>
              {viewerRole === 'siswa'
                ? 'Tulis pesan pertamamu untuk memulai diskusi dengan Guru BK tentang kendala atau rencana belajarmu.'
                : 'Kirim pesan untuk menyapa atau mengonfirmasi jadwal konsultasi dengan siswa ini.'}
            </p>
          </div>
        ) : (
          messages.map((m) => {
            const isMine = m.sender_role === viewerRole;
            return (
              <div
                key={m.id}
                style={{
                  alignSelf: isMine ? 'flex-end' : 'flex-start',
                  maxWidth: '82%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isMine ? 'flex-end' : 'flex-start',
                  gap: 2,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 11,
                    color: 'var(--muted)',
                    paddingInline: 4,
                  }}
                >
                  <span style={{ fontWeight: 700, color: isMine ? 'var(--accent)' : 'var(--sec)' }}>
                    {isMine ? 'Kamu' : m.sender_name}
                  </span>
                  <span>·</span>
                  <span>{m.pending ? 'Mengirim…' : fmtTime(m.created_at)}</span>
                </div>
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: isMine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    background: isMine
                      ? viewerRole === 'siswa'
                        ? 'var(--grad)'
                        : 'linear-gradient(135deg, #2a9d8f 0%, #21867a 100%)'
                      : '#ffffff',
                    color: isMine ? '#ffffff' : 'var(--ink2)',
                    border: isMine ? 'none' : '1.5px solid var(--line)',
                    fontSize: 14,
                    lineHeight: 1.45,
                    boxShadow: '0 2px 6px rgba(45,26,14,.06)',
                    wordBreak: 'break-word',
                    whiteSpace: 'pre-wrap',
                    opacity: m.pending ? 0.75 : 1,
                  }}
                >
                  {m.message}
                </div>
              </div>
            );
          })
        )}
      </div>

      {err && (
        <div
          style={{
            padding: '6px 14px',
            background: 'var(--danger-tint)',
            color: 'var(--danger)',
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {err}
        </div>
      )}

      {/* Form Input Pesan */}
      <form
        onSubmit={handleSend}
        style={{
          display: 'flex',
          gap: 8,
          padding: '10px 12px',
          background: '#ffffff',
          borderTop: '1px solid var(--line)',
          alignItems: 'center',
        }}
      >
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Ketik pesan untuk ${partnerLabel}…`}
          maxLength={1000}
          style={{
            flex: 1,
            padding: '9px 13px',
            fontSize: 14,
            borderRadius: 12,
            border: '1.5px solid var(--line)',
            background: 'var(--surface2)',
          }}
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          style={{
            padding: '9px 16px',
            borderRadius: 12,
            background:
              viewerRole === 'siswa'
                ? 'var(--grad)'
                : 'linear-gradient(135deg, #2a9d8f 0%, #21867a 100%)',
            color: '#fff',
            fontWeight: 800,
            fontSize: 13,
            cursor: !text.trim() || sending ? 'not-allowed' : 'pointer',
            opacity: !text.trim() || sending ? 0.5 : 1,
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          Kirim →
        </button>
      </form>
    </div>
  );
}
