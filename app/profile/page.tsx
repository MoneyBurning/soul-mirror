'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { getProfile, upsertProfile, signOut } from '@/lib/supabase';
import type { Profile } from '@/types';

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f0a1e]">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
    </div>
  );
}

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [profileLoading, setProfileLoading] = useState(true);
  const [nickname, setNickname] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      setProfileLoading(true);
      const data: Profile | null = await getProfile(user.id);
      if (cancelled) return;
      setNickname(data?.nickname ?? '');
      setProfileLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  async function handleSave() {
    if (!user) return;
    setIsSaving(true);
    setSaveMessage(null);
    const result = await upsertProfile({ id: user.id, nickname: nickname.trim() || undefined });
    setIsSaving(false);
    setSaveMessage(result ? '저장되었습니다!' : '저장에 실패했습니다. 다시 시도해주세요.');
  }

  async function handleSignOut() {
    await signOut();
    router.push('/');
    router.refresh();
  }

  if (loading || !user) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-[#0f0a1e] px-4 py-10 text-purple-50 sm:px-8">
      <div className="mx-auto flex max-w-md flex-col gap-6">
        <h1 className="text-center text-2xl font-bold text-amber-200">프로필</h1>

        <div className="rounded-xl border border-purple-500/30 bg-purple-900/30 p-4 text-sm text-purple-200">
          {user.email}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="nickname" className="text-sm font-medium text-purple-200">
            닉네임
          </label>
          <input
            id="nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value.slice(0, 20))}
            disabled={profileLoading}
            placeholder="닉네임을 입력하세요"
            className="rounded-lg border border-purple-500/30 bg-purple-900/30 p-3 text-sm text-purple-50 placeholder:text-purple-300/40 focus:border-amber-300 focus:outline-none disabled:opacity-50"
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || profileLoading}
            className="self-start rounded-full bg-amber-400 px-6 py-2 text-sm font-semibold text-purple-950 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSaving ? '저장 중...' : '저장'}
          </button>
          {saveMessage && <p className="text-xs text-purple-300/70">{saveMessage}</p>}
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          className="rounded-full border border-purple-400/40 px-6 py-3 text-sm font-medium text-purple-200 hover:bg-purple-800/40"
        >
          로그아웃
        </button>
      </div>
    </div>
  );
}
