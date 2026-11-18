import { FLASH } from '@/lib/constants';

export default function Flash({ ok, err }: { ok?: string; err?: string }) {
  const m = (err && FLASH.err[err]) || (ok && FLASH.ok[ok]) || null;
  if (!m) return null;
  return (
    <div className={err ? 'note' : 'note good'} role="status">
      {m}
    </div>
  );
}
