'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';
import { signOut, signInWithGoogle } from '@/lib/supabase';

export default function Navbar() {
  const { user, loading } = useAuth();
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push('/');
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-purple-500/20 bg-[#0f0a1e]/90 backdrop-blur">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-8">
        <Link href="/" className="text-lg font-bold text-amber-200">
          Soul Mirror
        </Link>

        {!loading && (
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <div className="hidden items-center gap-5 text-sm sm:flex">
                  <Link href="/dashboard" className="text-purple-100 transition-colors hover:text-amber-200">
                    대시보드
                  </Link>
                  <Link href="/reading" className="text-purple-100 transition-colors hover:text-amber-200">
                    리딩
                  </Link>
                  <Link href="/timeline" className="text-purple-100 transition-colors hover:text-amber-200">
                    타임라인
                  </Link>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="text-purple-300 transition-colors hover:text-amber-200"
                  >
                    로그아웃
                  </button>
                </div>
              </>
            ) : (
              <button
                type="button"
                onClick={() => signInWithGoogle()}
                className="rounded-full bg-amber-400 px-5 py-2 text-sm font-semibold text-purple-950 transition-opacity hover:opacity-90"
              >
                시작하기
              </button>
            )}
          </div>
        )}
      </nav>
    </header>
  );
}
