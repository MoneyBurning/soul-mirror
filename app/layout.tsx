import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/AuthProvider';
import Navbar from '@/components/Navbar';
import MobileNav from '@/components/MobileNav';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Soul Mirror',
  description: 'AI 타로가 분석하는 당신의 삶',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${inter.className} min-h-screen bg-[#0f0a1e] text-purple-50`}>
        <AuthProvider>
          <Navbar />
          <main className="pb-20 sm:pb-0">{children}</main>
          <MobileNav />
        </AuthProvider>
      </body>
    </html>
  );
}
