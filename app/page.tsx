'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { signInWithGoogle } from '@/lib/supabase';

// 서버/클라이언트 렌더 결과가 항상 같아야 해서(Math.random() 직접 사용 시
// hydration mismatch 발생) index 기반의 결정적 의사난수로 별 위치를 생성한다.
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

const STAR_COUNT = 60;

function StarField() {
  const stars = Array.from({ length: STAR_COUNT }, (_, i) => ({
    top: seededRandom(i * 1.7) * 100,
    left: seededRandom(i * 3.1 + 5) * 100,
    size: 1 + seededRandom(i * 5.3 + 2) * 2,
    delay: seededRandom(i * 2.9 + 8) * 4,
    duration: 2 + seededRandom(i * 4.4 + 1) * 3,
  }));

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {stars.map((star, i) => (
        <span
          key={i}
          className="star"
          style={{
            top: `${star.top}%`,
            left: `${star.left}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            animationDelay: `${star.delay}s`,
            animationDuration: `${star.duration}s`,
          }}
        />
      ))}
    </div>
  );
}

const FEATURES = [
  {
    icon: '🔮',
    title: 'AI 기반 리딩',
    description: '정해진 스크립트가 아니라, AI가 진짜 심리적 통찰을 담아 카드를 해석합니다.',
  },
  {
    icon: '📊',
    title: '삶의 패턴 분석',
    description: '리딩이 쌓이면서 질문과 선택 속 패턴을 보여주는 타임라인이 만들어집니다.',
  },
  {
    icon: '✅',
    title: '리얼리티 체크 시스템',
    description: '나중에 다시 돌아와서 리딩이 실제로 얼마나 맞았는지 평가해보세요.',
  },
];

function LoadingScreen() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
    </div>
  );
}

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [loading, user, router]);

  if (loading || user) {
    return <LoadingScreen />;
  }

  return (
    <div className="relative overflow-hidden">
      <StarField />

      <section className="relative flex flex-col items-center gap-6 px-4 py-24 text-center sm:py-32">
        <h1 className="max-w-2xl text-4xl font-bold leading-tight text-amber-100 sm:text-5xl">
          AI 타로가 분석하는 당신의 삶
        </h1>
        <p className="max-w-md text-sm text-purple-200 sm:text-base">
          단순한 운세가 아닙니다. 당신의 삶을 깊이 있게 분석합니다.
        </p>
        <button
          type="button"
          onClick={() => signInWithGoogle()}
          className="rounded-full bg-amber-400 px-8 py-3 text-sm font-semibold text-purple-950 transition-opacity hover:opacity-90 sm:text-base"
        >
          무료로 시작하기
        </button>
      </section>

      <section className="relative mx-auto grid max-w-4xl grid-cols-1 gap-4 px-4 pb-16 sm:grid-cols-3 sm:px-8">
        {FEATURES.map((feature) => (
          <div
            key={feature.title}
            className="flex flex-col items-center gap-2 rounded-2xl border border-purple-500/30 bg-purple-900/30 p-6 text-center"
          >
            <span className="text-3xl">{feature.icon}</span>
            <h3 className="text-sm font-semibold text-amber-200">{feature.title}</h3>
            <p className="text-xs leading-relaxed text-purple-300/70">{feature.description}</p>
          </div>
        ))}
      </section>

      <p className="relative pb-16 text-center text-xs text-purple-300/60">
        완전 무료로 시작할 수 있어요
      </p>
    </div>
  );
}
