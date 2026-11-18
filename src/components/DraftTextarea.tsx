'use client';

import { useEffect, useRef } from 'react';

// Textarea dengan draf otomatis di perangkat (localStorage), aman bila sinyal terputus.
// Draf dihapus setelah formulir dikirim.
export default function DraftTextarea({
  name,
  id,
  storageKey,
  defaultValue = '',
  placeholder,
  maxLength = 1000,
}: {
  name: string;
  id: string;
  storageKey: string;
  defaultValue?: string;
  placeholder?: string;
  maxLength?: number;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    try {
      const draft = localStorage.getItem(storageKey);
      if (draft) el.value = draft;
    } catch {
      /* peramban tidak mengizinkan penyimpanan */
    }
    const form = el.closest('form');
    const clear = () => {
      try {
        localStorage.removeItem(storageKey);
      } catch {}
    };
    form?.addEventListener('submit', clear);
    return () => form?.removeEventListener('submit', clear);
  }, [storageKey]);

  return (
    <textarea
      ref={ref}
      id={id}
      name={name}
      defaultValue={defaultValue}
      placeholder={placeholder}
      maxLength={maxLength}
      onInput={(e) => {
        try {
          localStorage.setItem(storageKey, e.currentTarget.value);
        } catch {}
      }}
    />
  );
}
