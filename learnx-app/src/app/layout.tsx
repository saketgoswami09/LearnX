import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';

const suisse = localFont({
  src: [
    { path: '../../public/fonts/suisse-bp-ultra-light.woff2', weight: '300', style: 'normal' },
    { path: '../../public/fonts/suisse-bp-light.woff2',       weight: '400', style: 'normal' },
    { path: '../../public/fonts/suisse-bp-regular.woff2',     weight: '500', style: 'normal' },
    { path: '../../public/fonts/suisse-bp-regular.woff2',     weight: '600', style: 'normal' },
    { path: '../../public/fonts/suisse-bp-regular.woff2',     weight: '700', style: 'normal' },
    { path: '../../public/fonts/suisse-bp-regular.woff2',     weight: '800', style: 'normal' },
  ],
  variable: '--font-suisse',
  display: 'swap',
});

const george = localFont({
  src: '../../public/fonts/george-x-regular.woff2',
  variable: '--font-george',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'LearnX — Your local learning workspace',
  description: 'Organize, watch, and track your personal learning content locally.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${suisse.variable} ${george.variable}`}>
      <body className="font-sans antialiased">
        <div className="app-shell">
          <Sidebar />
          <div className="app-main flex min-h-dvh flex-col">
            <TopBar />
            <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto custom-scrollbar">
              <div className="app-content fade-in-up">{children}</div>
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
