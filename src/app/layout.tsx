import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, Source_Sans_3 } from 'next/font/google';
import './globals.css';

const fontDisplay = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  display: 'optional',
  variable: '--fd',
  preload: false,
});

const fontBody = Source_Sans_3({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  display: 'optional',
  variable: '--fb',
  preload: false,
});

export const metadata: Metadata = {
  title: 'Ruang Strategi Belajar (RSB)',
  description: 'Coba strategi belajar yang cocok untukmu. Media layanan bimbingan belajar bagi siswa SMA/MA.',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${fontDisplay.variable} ${fontBody.variable}`}>
      <body>{children}</body>
    </html>
  );
}
