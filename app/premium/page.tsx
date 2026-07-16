import Link from 'next/link';

export default function PremiumPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#0f0a1e] px-4 text-center text-purple-50">
      <span className="text-4xl">🔮</span>
      <h1 className="text-2xl font-bold text-amber-200 sm:text-3xl">프리미엄, 곧 만나요</h1>
      <p className="max-w-md text-sm leading-relaxed text-purple-200">
        더 깊고 구체적인 리딩, 하루 더 많은 리딩 횟수를 담은 프리미엄을 준비하고 있어요.
        조금만 기다려주세요.
      </p>
      <Link
        href="/dashboard"
        className="rounded-full bg-amber-400 px-6 py-3 text-sm font-semibold text-purple-950"
      >
        대시보드로 돌아가기
      </Link>
    </div>
  );
}
