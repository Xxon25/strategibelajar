'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ICON: Record<string, React.ReactNode> = {
  beranda: <path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  rencana: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.2" />
    </>
  ),
  strategi: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 8l1.5 1.5L12 7M8 14h8M8 17h5" />
    </>
  ),
  refleksi: (
    <>
      <path d="M5 4h13v15H7a2 2 0 0 0-2 2z" />
      <path d="M9 8h6M9 12h6" />
    </>
  ),
  bantuan: (
    <>
      <path d="M4 5h16v11H9l-5 4z" />
      <path d="M9 10h6" />
    </>
  ),
};

const PLAN = ['/siswa/kebiasaan', '/siswa/tujuan', '/siswa/waktu'];
const DO = ['/siswa/strategi', '/siswa/fokus'];
const inGroup = (p: string, g: string[]) => g.some((x) => p === x || p.startsWith(x + '/'));

const ITEMS = [
  { href: '/siswa', label: 'Beranda', icon: 'beranda', on: (p: string) => p === '/siswa' },
  { href: '/siswa/kebiasaan', label: 'Perencanaan', icon: 'rencana', on: (p: string) => inGroup(p, PLAN) },
  { href: '/siswa/strategi', label: 'Pelaksanaan', icon: 'strategi', on: (p: string) => inGroup(p, DO) },
  { href: '/siswa/refleksi', label: 'Refleksi', icon: 'refleksi', on: (p: string) => p.startsWith('/siswa/refleksi') },
  { href: '/siswa/bantuan', label: 'Bantuan BK', icon: 'bantuan', on: (p: string) => p.startsWith('/siswa/bantuan') },
];

export function BottomNav() {
  const p = usePathname();
  return (
    <nav className="bottom" aria-label="Menu utama">
      {ITEMS.map((i) => (
        <Link key={i.href} href={i.href} aria-current={i.on(p) ? 'page' : undefined}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            {ICON[i.icon]}
          </svg>
          <span>{i.label}</span>
        </Link>
      ))}
    </nav>
  );
}

const TABS_PLAN = [
  { href: '/siswa/kebiasaan', label: '1. Kenali Kebiasaan' },
  { href: '/siswa/tujuan', label: '2. Tetapkan Tujuan' },
  { href: '/siswa/waktu', label: '3. Atur Waktu' },
];
const TABS_DO = [
  { href: '/siswa/strategi', label: '1. Strategi & Kuis' },
  { href: '/siswa/fokus', label: '2. Fokus Belajar' },
];

export function SubTabs() {
  const p = usePathname();
  const tabs = inGroup(p, PLAN) ? TABS_PLAN : inGroup(p, DO) ? TABS_DO : null;
  if (!tabs) return null;
  return (
    <div className="subtabs" role="navigation" aria-label="Submenu">
      {tabs.map((t) => (
        <Link key={t.href} href={t.href} className="subtab" aria-current={p === t.href ? 'page' : undefined}>
          {t.label}
        </Link>
      ))}
    </div>
  );
}
