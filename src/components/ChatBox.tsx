'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';

type Message = {
  id: string;
  sender_role: 'student' | 'counselor';
  body: string;
  created_at: string;
};

type Props = {
  requestId: string;
  myRole: 'student' | 'counselor';
  initialMessages: Message[];
  sendAction: (f: FormData) => Promise<{ ok?: boolean; error?: string; message?: Message }>;
  /** Label nama untuk role lawan — ditampilkan di bubble */
  otherLabel: string;
  myLabel: string;
};

export default function ChatBox({
  requestId,
  myRole,
  initialMessages,
  sendAction,
  otherLabel,
  myLabel,
}: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [err, setErr] = useState('');
  const [pending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /* ── Scroll ke bawah saat ada pesan baru ── */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /* ── Sync real-time via /api/chat (consult_messages) saat tab aktif ── */
  const syncMessages = useCallback(async () => {
    const asRole = myRole === 'counselor' ? 'guru' : 'siswa';
    try {
      const res = await fetch(`/api/chat?requestId=${encodeURIComponent(requestId)}&as=${asRole}`, { cache: 'no-store' });
      if (!res.ok) return;
      const json = (await res.json()) as {
        messages?: Array<{ id: string; sender_role: 'siswa' | 'guru'; message: string; created_at: string }>;
      };
      if (!Array.isArray(json.messages)) return;
      const mapped: Message[] = json.messages.map((m) => ({
        id: m.id,
        sender_role: m.sender_role === 'guru' ? 'counselor' : 'student',
        body: m.message,
        created_at: m.created_at,
      }));
      setMessages((prev) => {
        const pendingOpts = prev.filter((p) => p.id.startsWith('opt-'));
        const committed = prev.filter((p) => !p.id.startsWith('opt-'));
        if (
          committed.length === mapped.length &&
          committed.every((m, idx) => m.id === mapped[idx]?.id)
        ) {
          return prev;
        }
        const serverKeys = new Set(mapped.map((m) => `${m.sender_role}|${m.body}`));
        const remainingOpts = pendingOpts.filter((p) => !serverKeys.has(`${p.sender_role}|${p.body}`));
        return [...mapped, ...remainingOpts];
      });
    } catch {
      /* abaikan error jaringan sementara */
    }
  }, [requestId, myRole]);

  useEffect(() => {
    void syncMessages();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void syncMessages();
    };
    const onFocus = () => void syncMessages();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onFocus);
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') void syncMessages();
    }, 2000);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onFocus);
    };
  }, [syncMessages]);

  /* ── Kirim pesan ── */
  function handleSend() {
    const body = input.trim();
    if (!body) return;
    setErr('');

    // Optimistic update
    const optimistic: Message = {
      id: `opt-${Date.now()}`,
      sender_role: myRole,
      body,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set('request_id', requestId);
        fd.set('body', body);
        const res = await sendAction(fd);
        if (res?.error) {
          setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
          setErr(res.error);
          return;
        }
        if (res?.message) {
          setMessages((prev) =>
            prev.map((m) => (m.id === optimistic.id ? res.message! : m)),
          );
        } else {
          void syncMessages();
        }
      } catch {
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
        setErr('Gagal mengirim pesan. Coba lagi.');
      }
    });
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  /* ── Auto-resize textarea ── */
  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
  }

  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('id-ID', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
    });

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: 'numeric',
      month: 'long',
    });

  /* Kelompokkan pesan per tanggal */
  const groups: Array<{ date: string; msgs: Message[] }> = [];
  for (const m of messages) {
    const d = fmtDate(m.created_at);
    const last = groups[groups.length - 1];
    if (!last || last.date !== d) {
      groups.push({ date: d, msgs: [m] });
    } else {
      last.msgs.push(m);
    }
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100%', minHeight: 0,
      background: 'var(--surface)',
      border: '1.5px solid var(--line)',
      borderRadius: 'var(--r-lg)',
      overflow: 'hidden',
    }}>
      {/* ── Pesan ── */}
      <div style={{
        flex: 1, overflowY: 'auto',
        padding: '16px 16px 8px',
        display: 'flex', flexDirection: 'column', gap: 4,
        scrollbarWidth: 'thin',
      }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, padding: '32px 0' }}>
            Belum ada pesan. Mulai percakapan di bawah.
          </div>
        )}

        {groups.map((g) => (
          <div key={g.date}>
            {/* Separator tanggal */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              margin: '12px 0 8px',
            }}>
              <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
              <span style={{
                fontSize: 11, fontWeight: 700, color: 'var(--muted)',
                background: 'var(--surface)',
                padding: '0 8px',
                whiteSpace: 'nowrap',
              }}>{g.date}</span>
              <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
            </div>

            {g.msgs.map((m) => {
              const isMe = m.sender_role === myRole;
              const isOpt = m.id.startsWith('opt-');
              return (
                <div key={m.id} style={{
                  display: 'flex',
                  justifyContent: isMe ? 'flex-end' : 'flex-start',
                  marginBottom: 6,
                }}>
                  <div style={{ maxWidth: '78%' }}>
                    {/* Label pengirim */}
                    <div style={{
                      fontSize: 10, fontWeight: 700, marginBottom: 3,
                      color: 'var(--muted)',
                      textAlign: isMe ? 'right' : 'left',
                    }}>
                      {isMe ? myLabel : otherLabel}
                    </div>

                    {/* Bubble */}
                    <div style={{
                      padding: '10px 14px',
                      borderRadius: isMe ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                      background: isMe ? 'var(--grad)' : 'var(--surface2)',
                      color: isMe ? '#fff' : 'var(--ink)',
                      fontSize: 14, lineHeight: 1.55,
                      whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                      opacity: isOpt ? 0.65 : 1,
                      boxShadow: isMe ? '0 2px 8px rgba(232,82,74,.2)' : 'var(--shadow-sm)',
                    }}>
                      {m.body}
                    </div>

                    {/* Waktu */}
                    <div style={{
                      fontSize: 10, color: 'var(--muted)', marginTop: 3,
                      textAlign: isMe ? 'right' : 'left',
                    }}>
                      {isOpt ? 'Mengirim…' : fmtTime(m.created_at)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* ── Error ── */}
      {err && (
        <div style={{
          background: 'var(--danger-tint)', color: 'var(--danger)',
          fontSize: 12, fontWeight: 600, padding: '8px 16px',
          borderTop: '1px solid #fca5a5',
        }}>
          {err}
        </div>
      )}

      {/* ── Input ── */}
      <div style={{
        borderTop: '1px solid var(--line)',
        padding: '10px 12px',
        display: 'flex', gap: 8, alignItems: 'flex-end',
        background: 'var(--surface)',
      }}>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleInput}
          onKeyDown={handleKey}
          placeholder="Ketik pesan… (Enter kirim, Shift+Enter baris baru)"
          disabled={pending}
          rows={1}
          style={{
            flex: 1, resize: 'none', overflow: 'hidden',
            minHeight: 44, maxHeight: 140,
            border: '1.5px solid var(--line)', borderRadius: 12,
            padding: '10px 14px', fontSize: 14,
            fontFamily: 'inherit', lineHeight: 1.5,
            transition: 'border-color .15s',
            background: 'var(--surface)',
          }}
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={pending || !input.trim()}
          style={{
            flexShrink: 0,
            width: 44, height: 44, borderRadius: 12,
            background: input.trim() ? 'var(--grad)' : 'var(--surface2)',
            color: input.trim() ? '#fff' : 'var(--muted)',
            border: 'none', cursor: input.trim() ? 'pointer' : 'default',
            display: 'grid', placeItems: 'center',
            transition: 'background .15s',
          }}
          aria-label="Kirim"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.2"
            strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  );
}
