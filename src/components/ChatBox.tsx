'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase-client';

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
  sendAction: (f: FormData) => Promise<{ ok?: boolean; error?: string }>;
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

  /* ── Supabase Realtime subscribe ── */
  useEffect(() => {
    const sb = getSupabaseBrowser();
    const channel = sb
      .channel(`chat:${requestId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `request_id=eq.${requestId}`,
        },
        (payload) => {
          const msg = payload.new as Message;
          setMessages((prev) => {
            // Hindari duplikat
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        },
      )
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
  }, [requestId]);

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
      const fd = new FormData();
      fd.set('request_id', requestId);
      fd.set('body', body);
      const res = await sendAction(fd);
      if (res?.error) {
        // Rollback optimistic
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
        setErr(res.error);
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
