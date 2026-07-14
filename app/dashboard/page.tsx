'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase, getCurrentUser } from '@/lib/supabase';
import { getCategoryEmoji } from '@/components/CategorySelector';
import { getEmotionEmoji } from '@/components/EmotionPicker';
import DailyCard from '@/components/DailyCard';
import RealityCheck from '@/components/RealityCheck';
import { getReadingSnippet, formatShortDate } from '@/lib/format';
import type { Category, Emotion, TarotCard as TarotCardData } from '@/types';

interface DailyCardData {
  card: TarotCardData;
  orientation: 'normal' | 'reverse';
  message: string;
  date: string;
}

interface UsageInfo {
  used: number;
  limit: number;
  remaining: number;
  isPremium: boolean;
}

interface TopCard {
  name: string;
  korName: string | null;
  count: number;
}

interface MonthlyStats {
  totalReadings: number;
  positivePercent: number | null;
  avgScore: number | null;
  topCards: TopCard[];
}

interface RecentReading {
  id: string;
  question: string;
  category: Category | null;
  emotion: Emotion | null;
  snippet: string;
  createdAt: string;
}

interface PendingCheck {
  readingId: string;
  question: string;
  createdAt: string;
  dueDate: string;
}

interface StatsRow {
  id: string;
  reading_cards: { orientation: 'normal' | 'reverse'; tarot_cards: { name: string; kor_name: string | null } | null }[];
  reality_checks: { score: number }[];
}

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f0a1e]">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
    </div>
  );
}

function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-xl bg-purple-900/30 ${className}`} />;
}

function ErrorNotice({ message }: { message: string }) {
  return (
    <p className="rounded-lg border border-red-400/40 bg-red-400/10 px-4 py-2 text-sm text-red-200">
      {message}
    </p>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-purple-500/30 bg-purple-900/30 p-4 text-center">
      <p className="text-2xl font-bold text-amber-200">{value}</p>
      <p className="mt-1 text-xs text-purple-300/70">{label}</p>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [authState, setAuthState] = useState<'checking' | 'ready'>('checking');
  const [userId, setUserId] = useState<string | null>(null);

  const [dailyCard, setDailyCard] = useState<DailyCardData | null>(null);
  const [dailyCardLoading, setDailyCardLoading] = useState(true);
  const [dailyCardError, setDailyCardError] = useState<string | null>(null);

  const [stats, setStats] = useState<MonthlyStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [usageLoading, setUsageLoading] = useState(true);
  const [usageError, setUsageError] = useState<string | null>(null);

  const [recentReadings, setRecentReadings] = useState<RecentReading[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);
  const [recentError, setRecentError] = useState<string | null>(null);

  const [pendingChecks, setPendingChecks] = useState<PendingCheck[]>([]);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [pendingError, setPendingError] = useState<string | null>(null);

  const [activeCheck, setActiveCheck] = useState<PendingCheck | null>(null);

  // 로그인 확인
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const user = await getCurrentUser();
      if (cancelled) return;
      if (!user) {
        router.replace('/');
        return;
      }
      setUserId(user.id);
      setAuthState('ready');
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  // 1. Daily Card
  useEffect(() => {
    if (authState !== 'ready') return;
    let cancelled = false;

    (async () => {
      setDailyCardLoading(true);
      setDailyCardError(null);
      try {
        const res = await fetch('/api/daily-card');
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setDailyCardError(data.error ?? '오늘의 카드를 불러오지 못했습니다.');
          return;
        }
        setDailyCard(data);
      } catch (err) {
        if (cancelled) return;
        console.error('daily card fetch error:', err);
        setDailyCardError('네트워크 오류가 발생했습니다.');
      } finally {
        if (!cancelled) setDailyCardLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authState]);

  // 3. 오늘 남은 리딩 횟수
  useEffect(() => {
    if (authState !== 'ready') return;
    let cancelled = false;

    (async () => {
      setUsageLoading(true);
      setUsageError(null);
      try {
        const res = await fetch('/api/reading');
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setUsageError(data.error ?? '사용량 정보를 불러오지 못했습니다.');
          return;
        }
        setUsage(data);
      } catch (err) {
        if (cancelled) return;
        console.error('usage fetch error:', err);
        setUsageError('네트워크 오류가 발생했습니다.');
      } finally {
        if (!cancelled) setUsageLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authState]);

  // 6. Pending Reality Checks
  useEffect(() => {
    if (authState !== 'ready') return;
    let cancelled = false;

    (async () => {
      setPendingLoading(true);
      setPendingError(null);
      try {
        const res = await fetch('/api/reality-check?due=true');
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setPendingError(data.error ?? '대기 중인 리얼리티 체크를 불러오지 못했습니다.');
          return;
        }
        setPendingChecks(data.pendingChecks ?? []);
      } catch (err) {
        if (cancelled) return;
        console.error('pending checks fetch error:', err);
        setPendingError('네트워크 오류가 발생했습니다.');
      } finally {
        if (!cancelled) setPendingLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authState]);

  // 2. 이번 달 통계 + 5. 최근 리딩 3개 — Supabase에서 직접 조회
  const fetchStats = useCallback(async (uid: string) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const { data, error } = await supabase
      .from('readings')
      .select(
        `id,
         reading_cards ( orientation, tarot_cards ( name, kor_name ) ),
         reality_checks ( score )`
      )
      .eq('user_id', uid)
      .gte('created_at', startOfMonth);

    if (error) throw error;

    const rows = (data ?? []) as unknown as StatsRow[];

    const allCards = rows.flatMap((row) => row.reading_cards);
    const positiveCount = allCards.filter((c) => c.orientation === 'normal').length;
    const positivePercent =
      allCards.length > 0 ? Math.round((positiveCount / allCards.length) * 100) : null;

    const allScores = rows.flatMap((row) => row.reality_checks.map((rc) => rc.score));
    const avgScore =
      allScores.length > 0
        ? Math.round((allScores.reduce((sum, s) => sum + s, 0) / allScores.length) * 10) / 10
        : null;

    const cardCounts = new Map<string, TopCard>();
    for (const c of allCards) {
      if (!c.tarot_cards) continue;
      const key = c.tarot_cards.name;
      const existing = cardCounts.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        cardCounts.set(key, { name: key, korName: c.tarot_cards.kor_name, count: 1 });
      }
    }
    const topCards = Array.from(cardCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    const result: MonthlyStats = {
      totalReadings: rows.length,
      positivePercent,
      avgScore,
      topCards,
    };
    return result;
  }, []);

  const fetchRecentReadings = useCallback(async (uid: string) => {
    const { data, error } = await supabase
      .from('readings')
      .select('id, question, category, emotion, ai_response, created_at')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(3);

    if (error) throw error;

    return (data ?? []).map(
      (row: {
        id: string;
        question: string;
        category: Category | null;
        emotion: Emotion | null;
        ai_response: string;
        created_at: string;
      }): RecentReading => ({
        id: row.id,
        question: row.question,
        category: row.category,
        emotion: row.emotion,
        snippet: getReadingSnippet(row.ai_response),
        createdAt: row.created_at,
      })
    );
  }, []);

  useEffect(() => {
    if (authState !== 'ready' || !userId) return;
    let cancelled = false;

    (async () => {
      setStatsLoading(true);
      setStatsError(null);
      try {
        const result = await fetchStats(userId);
        if (!cancelled) setStats(result);
      } catch (err) {
        if (cancelled) return;
        console.error('stats fetch error:', err);
        setStatsError('통계를 불러오는 중 오류가 발생했습니다.');
      } finally {
        if (!cancelled) setStatsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authState, userId, fetchStats]);

  useEffect(() => {
    if (authState !== 'ready' || !userId) return;
    let cancelled = false;

    (async () => {
      setRecentLoading(true);
      setRecentError(null);
      try {
        const result = await fetchRecentReadings(userId);
        if (!cancelled) setRecentReadings(result);
      } catch (err) {
        if (cancelled) return;
        console.error('recent readings fetch error:', err);
        setRecentError('최근 리딩을 불러오는 중 오류가 발생했습니다.');
      } finally {
        if (!cancelled) setRecentLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authState, userId, fetchRecentReadings]);

  function handleRealityCheckSuccess(readingId: string) {
    setPendingChecks((prev) => prev.filter((check) => check.readingId !== readingId));
    setActiveCheck(null);
  }

  if (authState !== 'ready') {
    return <LoadingScreen />;
  }

  const usagePercent = usage ? Math.min(100, Math.round((usage.used / usage.limit) * 100)) : 0;

  return (
    <div className="min-h-screen bg-[#0f0a1e] px-4 py-10 text-purple-50 sm:px-8">
      <div className="mx-auto flex max-w-2xl flex-col gap-10">
        <h1 className="text-center text-2xl font-bold text-amber-200 sm:text-3xl">대시보드</h1>

        {/* 1. Daily Card */}
        <section>
          <h2 className="mb-4 bg-gradient-to-r from-purple-400 via-fuchsia-300 to-amber-300 bg-clip-text text-center text-xl font-bold text-transparent sm:text-2xl">
            ✨ 오늘 당신의 행운카드는?
          </h2>
          {dailyCardLoading && <SkeletonBlock className="h-40" />}
          {!dailyCardLoading && dailyCardError && <ErrorNotice message={dailyCardError} />}
          {!dailyCardLoading && !dailyCardError && dailyCard && (
            <DailyCard
              card={dailyCard.card}
              orientation={dailyCard.orientation}
              message={dailyCard.message}
              date={dailyCard.date}
            />
          )}
        </section>

        {/* 2. 이번 달 통계 */}
        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-purple-300/70">
            이번 달
          </h2>
          {statsLoading && (
            <div className="grid grid-cols-3 gap-3">
              <SkeletonBlock className="h-20" />
              <SkeletonBlock className="h-20" />
              <SkeletonBlock className="h-20" />
            </div>
          )}
          {!statsLoading && statsError && <ErrorNotice message={statsError} />}
          {!statsLoading && !statsError && stats && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <StatTile label="총 리딩 수" value={String(stats.totalReadings)} />
                <StatTile
                  label="긍정 카드 비율"
                  value={stats.positivePercent === null ? '—' : `${stats.positivePercent}%`}
                />
                <StatTile
                  label="평균 리얼리티 점수"
                  value={stats.avgScore === null ? '—' : `${stats.avgScore}/5`}
                />
              </div>
              <div className="rounded-xl border border-purple-500/30 bg-purple-900/30 p-4">
                <p className="text-xs font-medium text-purple-300/70">가장 많이 나온 카드</p>
                {stats.topCards.length === 0 ? (
                  <p className="mt-2 text-sm text-purple-300/60">이번 달에는 아직 뽑은 카드가 없어요.</p>
                ) : (
                  <ol className="mt-2 flex flex-col gap-1">
                    {stats.topCards.map((card, index) => (
                      <li key={card.name} className="flex items-center justify-between text-sm">
                        <span className="text-purple-100">
                          {index + 1}. {card.korName ?? card.name}
                          {card.korName ? ` (${card.name})` : ''}
                        </span>
                        <span className="text-purple-300/70">×{card.count}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </>
          )}
        </section>

        {/* 3. 오늘 남은 리딩 횟수 */}
        <section className="flex flex-col gap-2">
          {usageLoading && <SkeletonBlock className="h-16" />}
          {!usageLoading && usageError && <ErrorNotice message={usageError} />}
          {!usageLoading && !usageError && usage && (
            <div className="rounded-xl border border-purple-500/30 bg-purple-900/30 p-4">
              <p className="text-sm text-purple-100">
                오늘 {usage.remaining}회 남았어요
              </p>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-purple-950">
                <div
                  className="h-full rounded-full bg-amber-400 transition-all"
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
              <p className="mt-1 text-right text-[11px] text-purple-300/60">
                {usage.used}/{usage.limit}회 사용{usage.isPremium ? ' · 프리미엄' : ''}
              </p>
            </div>
          )}
        </section>

        {/* 4. 빠른 리딩 버튼 */}
        <Link
          href="/reading"
          className="rounded-full bg-amber-400 px-8 py-3 text-center text-sm font-semibold text-purple-950"
        >
          리딩 시작하기
        </Link>

        {/* 5. 최근 리딩 3개 미리보기 */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-purple-300/70">
              최근 리딩
            </h2>
            <Link href="/timeline" className="text-xs font-medium text-amber-300 hover:underline">
              전체 보기
            </Link>
          </div>
          {recentLoading && (
            <div className="flex flex-col gap-3">
              <SkeletonBlock className="h-16" />
              <SkeletonBlock className="h-16" />
              <SkeletonBlock className="h-16" />
            </div>
          )}
          {!recentLoading && recentError && <ErrorNotice message={recentError} />}
          {!recentLoading && !recentError && recentReadings.length === 0 && (
            <p className="text-sm text-purple-300/60">아직 리딩이 없어요.</p>
          )}
          {!recentLoading &&
            !recentError &&
            recentReadings.map((reading) => (
              <div
                key={reading.id}
                className="rounded-xl border border-purple-500/30 bg-purple-900/30 p-4"
              >
                <div className="flex items-center justify-between text-xs text-purple-300/70">
                  <span>{formatShortDate(reading.createdAt)}</span>
                  <div className="flex items-center gap-2 text-base">
                    {reading.category && <span>{getCategoryEmoji(reading.category)}</span>}
                    {reading.emotion && <span>{getEmotionEmoji(reading.emotion)}</span>}
                  </div>
                </div>
                <p className="mt-2 text-sm text-purple-50">{reading.snippet}</p>
              </div>
            ))}
        </section>

        {/* 6. Pending Reality Checks */}
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-purple-300/70">
            대기 중인 리얼리티 체크
          </h2>
          {pendingLoading && (
            <div className="flex flex-col gap-3">
              <SkeletonBlock className="h-14" />
              <SkeletonBlock className="h-14" />
            </div>
          )}
          {!pendingLoading && pendingError && <ErrorNotice message={pendingError} />}
          {!pendingLoading && !pendingError && pendingChecks.length === 0 && (
            <p className="text-sm text-purple-300/60">지금 체크할 리딩이 없어요.</p>
          )}
          {!pendingLoading &&
            !pendingError &&
            pendingChecks.map((check) => (
              <button
                key={check.readingId}
                type="button"
                onClick={() => setActiveCheck(check)}
                className="flex flex-col items-start gap-1 rounded-xl border border-amber-300/40 bg-amber-400/10 p-4 text-left transition-colors hover:bg-amber-400/20"
              >
                <span className="text-sm font-medium text-amber-200">📝 {check.question}</span>
                <span className="text-xs text-purple-300/60">
                  {formatShortDate(check.createdAt)}에 뽑음
                </span>
              </button>
            ))}
        </section>
      </div>

      {activeCheck && (
        <RealityCheck
          readingId={activeCheck.readingId}
          question={activeCheck.question}
          onClose={() => setActiveCheck(null)}
          onSuccess={() => handleRealityCheckSuccess(activeCheck.readingId)}
        />
      )}
    </div>
  );
}
