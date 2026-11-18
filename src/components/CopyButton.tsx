'use client';

import { useState } from 'react';

export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title="Salin kode"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '2px 8px',
        borderRadius: '6px',
        border: '1px solid var(--line)',
        background: copied ? 'var(--tint2)' : 'var(--surface)',
        color: copied ? 'var(--accent)' : 'var(--muted)',
        fontSize: '11px',
        fontWeight: 700,
        cursor: 'pointer',
        transition: 'all .15s',
        whiteSpace: 'nowrap',
      }}
    >
      {copied ? '✓ Tersalin' : '⎘ Salin'}
    </button>
  );
}
