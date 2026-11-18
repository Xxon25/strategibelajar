'use client';

import { useFormStatus } from 'react-dom';

export default function Submit({
  children,
  className = 'btn',
  pendingText = 'Menyimpan…',
}: {
  children: React.ReactNode;
  className?: string;
  pendingText?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button className={className} type="submit" disabled={pending}>
      {pending ? pendingText : children}
    </button>
  );
}
