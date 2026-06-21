import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'LearnX — Your Local Learning OS',
  description: 'Organize, watch, and track your personal learning content. Local-first. No cloud needed.',
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} antialiased`}>
      <body className="font-sans text-gray-900 bg-[#F8F9FC] relative">

        {/* ── GLOBAL AURORA MESH BACKGROUND ── */}
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
          {/* Increased opacity & changed colors slightly for better visibility on light mode */}
          <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-purple-400/30 mix-blend-multiply blur-[120px] opacity-80" />
          <div className="absolute top-[10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-indigo-400/30 mix-blend-multiply blur-[120px] opacity-80" />
          <div className="absolute bottom-[-10%] left-[20%] w-[700px] h-[700px] rounded-full bg-cyan-300/30 mix-blend-multiply blur-[120px] opacity-70" />
        </div>

        {/* ── APP SHELL (z-10 keeps it above the background) ── */}
        <div className="flex h-screen overflow-hidden w-full relative z-10">

          <Sidebar />

          {/* 🔥 FIX: Changed bg-[#F8F9FC] to bg-transparent so Aurora is visible */}
          <div className="flex-1 flex flex-col min-w-0 bg-transparent">

            <TopBar />

            <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 relative custom-scrollbar">
              <div className="mx-auto w-full max-w-[1400px] animate-in fade-in slide-in-from-bottom-4 duration-500 h-full">
                {children}
              </div>
            </main>
          </div>
        </div>

      </body>
    </html>
  );
}