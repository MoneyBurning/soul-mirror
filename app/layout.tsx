import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/AuthProvider';
import Navbar from '@/components/Navbar';
import MobileNav from '@/components/MobileNav';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Soul Mirror - AI 타로 리딩',
  description: 'AI가 분석하는 나의 운세. 78장 타로카드로 오늘의 운을 확인하세요.',
  openGraph: {
    title: 'Soul Mirror - AI 타로 리딩',
    description: 'AI가 분석하는 나의 운세. 78장 타로카드로 오늘의 운을 확인하세요.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Soul Mirror - AI 타로 리딩',
    description: 'AI가 분석하는 나의 운세. 78장 타로카드로 오늘의 운을 확인하세요.',
    images: ['/og-image.png'],
  },
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
