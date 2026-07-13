'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase, getCurrentUser } from '@/lib/supabase';
import { getCategoryEmoji } from '@/components/CategorySelector';
import { getEmotionEmoji } from '@/components/EmotionPicker';
import RealityCheck from '@/components/RealityCheck';
import { getReadingSnippet, formatShortDate } from '@/lib/format';
import type { Category, Emotion } from '@/types';

const PAGE_SIZE = 10;

interface ReadingCardRow {
  position: number;
  orientation: 'normal' | 'reverse';
  tarot_cards: { name: string; kor_name: string | null } | null;
}

interface RealityCheckRow {
  id: string;
  score: number;
  memo: string | null;
  checked_at: string;
}

interface ReadingRow {
  id: string;
  question: string;
  category: Category | null;
  emotion: Emotion | null;
  ai_response: string;
  reality_check_due: string | null;
  created_at: string;
  reading_cards: ReadingCardRow[];
  reality_checks: RealityCheckRow[];
}

interface TimelineItem {
  id: string;
  question: string;
  category: Category | null;
  emotion: Emotion | null;
  snippet: string;
  cardNames: string[];
  createdAt: string;
  realityCheckDue: string | null;
  realityCheckScore: number | null;
}

function mapRow(row: ReadingRow): TimelineItem {
  const snippet = getReadingSnippet(row.ai_response);

  const cardNames = [...row.reading_cards]
    .sort((a, b) => a.position - b.position)
    .map((rc) => rc.tarot_cards?.kor_name ?? rc.tarot_cards?.name)
    .filter((name): name is string => Boolean(name));

  const realityCheck = row.reality_checks[0] ?? null;

  return {
    id: row.id,
    question: row.question,
    category: row.category,
    emotion: row.emotion,
    snippet,
    cardNames,
    createdAt: row.created_at,
    realityCheckDue: row.reality_check_due,
    realityCheckScore: realityCheck ? realityCheck.score : null,
  };
}

function groupByMonth(items: TimelineItem[]): { label: string; items: TimelineItem[] }[] {
  const groups: { label: string; items: TimelineItem[] }[] = [];

  for (const item of items) {
    const label = new Date(item.createdAt).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
    });
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && lastGroup.label === label) {
      lastGroup.items.push(item);
    } else {
      groups.push({ label, items: [item] });
    }
  }

  return groups;
}

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f0a1e]">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
    </div>
  );
}

function TimelineSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="h-24 animate-pulse rounded-xl bg-purple-900/30" />
      ))}
    </div>
  );
}

function RealityCheckChip({ item, onRateClick }: { item: TimelineItem; onRateClick: () => void }) {
  if (item.realityCheckScore !== null) {
    return <span className="text-xs font-medium text-amber-300">⭐ {item.realityCheckScore}/5</span>;
  }

  if (!item.realityCheckDue) return null;

  const dueTime = new Date(item.realityCheckDue).getTime();
  const now = Date.now();

  if (dueTime > now) {
    const daysLeft = Math.max(1, Math.ceil((dueTime - now) / (1000 * 60 * 60 * 24)));
    return (
      <span className="text-xs text-purple-300/70">
        ⏳ {daysLeft}일 후 체크 예정
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onRateClick}
      className="text-xs font-medium text-amber-300 underline-offset-2 hover:underline"
    >
      📝 이 리딩 평가하기
    </button>
  );
}

function ReadingRowCard({
  item,
  onRateClick,
}: {
  item: TimelineItem;
  onRateClick: () => void;
}) {
  return (
    <div className="rounded-xl border border-purple-500/30 bg-purple-900/30 p-4">
      <div className="flex items-center justify-between text-xs text-purple-300/70">
        <span>{formatShortDate(item.createdAt)}</span>
        <div className="flex items-center gap-2 text-base">
          {item.category && <span>{getCategoryEmoji(item.category)}</span>}
          {item.emotion && <span>{getEmotionEmoji(item.emotion)}</span>}
        </div>
      </div>
      <p className="mt-2 text-sm text-purple-50">{item.snippet}</p>
      {item.cardNames.length > 0 && (
        <p className="mt-1 text-[11px] text-purple-300/60">{item.cardNames.join(' · ')}</p>
      )}
      <div className="mt-3">
        <RealityCheckChip item={item} onRateClick={onRateClick} />
      </div>
    </div>
  );
}

export default function TimelinePage() {
  const router = useRouter();
  const [authState, setAuthState] = useState<'checking' | 'ready'>('checking');
  const [userId, setUserId] = useState<string | null>(null);

  const [items, setItems] = useState<TimelineItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const [activeReadingId, setActiveReadingId] = useState<string | null>(null);

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

  const fetchPage = useCallback(async (pageIndex: number, uid: string): Promise<ReadingRow[]> => {
    const from = pageIndex * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error: fetchError } = await supabase
      .from('readings')
      .select(
        `id, question, category, emotion, ai_response, reality_check_due, created_at,
         reading_cards ( position, orientation, tarot_cards ( name, kor_name ) ),
         reality_checks ( id, score, memo, checked_at )`
      )
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (fetchError) throw fetchError;
    return (data ?? []) as unknown as ReadingRow[];
  }, []);

  useEffect(() => {
    if (authState !== 'ready' || !userId) return;

    let cancelled = false;

    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const rows = await fetchPage(0, userId);
        if (cancelled) return;
        setItems(rows.map(mapRow));
        setHasMore(rows.length === PAGE_SIZE);
        setPage(0);
      } catch (err) {
        if (cancelled) return;
        console.error('timeline fetch error:', err);
        setError('리딩 목록을 불러오는 중 오류가 발생했습니다.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authState, userId, fetchPage]);

  async function handleLoadMore() {
    if (!userId || isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    setError(null);

    try {
      const nextPage = page + 1;
      const rows = await fetchPage(nextPage, userId);
      setItems((prev) => [...prev, ...rows.map(mapRow)]);
      setHasMore(rows.length === PAGE_SIZE);
      setPage(nextPage);
    } catch (err) {
      console.error('timeline load more error:', err);
      setError('추가 리딩을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoadingMore(false);
    }
  }

  function handleRealityCheckSuccess(readingId: string, score: number) {
    setItems((prev) =>
      prev.map((item) => (item.id === readingId ? { ...item, realityCheckScore: score } : item))
    );
    setActiveReadingId(null);
  }

  if (authState !== 'ready') {
    return <LoadingScreen />;
  }

  const groups = groupByMonth(items);
  const activeReading = items.find((item) => item.id === activeReadingId) ?? null;

  return (
    <div className="min-h-screen bg-[#0f0a1e] px-4 py-10 text-purple-50 sm:px-8">
      <div className="mx-auto flex max-w-2xl flex-col gap-8">
        <h1 className="text-center text-2xl font-bold text-amber-200 sm:text-3xl">타임라인</h1>

        {isLoading && <TimelineSkeleton />}

        {!isLoading && error && items.length === 0 && (
          <p className="rounded-lg border border-red-400/40 bg-red-400/10 px-4 py-3 text-center text-sm text-red-200">
            {error}
          </p>
        )}

        {!isLoading && !error && items.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <p className="text-4xl">🔮</p>
            <p className="text-sm text-purple-200">아직 저장된 리딩이 없어요.</p>
            <Link
              href="/reading"
              className="rounded-full bg-amber-400 px-6 py-3 text-sm font-semibold text-purple-950"
            >
              리딩 시작하기
            </Link>
          </div>
        )}

        {!isLoading &&
          groups.map((group) => (
            <section key={group.label} className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-purple-300/70">
                {group.label}
              </h2>
              <div className="flex flex-col gap-3">
                {group.items.map((item) => (
                  <ReadingRowCard
                    key={item.id}
                    item={item}
                    onRateClick={() => setActiveReadingId(item.id)}
                  />
                ))}
              </div>
            </section>
          ))}

        {!isLoading && items.length > 0 && error && (
          <p className="rounded-lg border border-red-400/40 bg-red-400/10 px-4 py-3 text-center text-sm text-red-200">
            {error}
          </p>
        )}

        {!isLoading && hasMore && items.length > 0 && (
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            className="mx-auto rounded-full border border-purple-400/40 px-6 py-2 text-sm text-purple-200 hover:bg-purple-800/40 disabled:opacity-50"
          >
            {isLoadingMore ? '불러오는 중...' : '더 보기'}
          </button>
        )}
      </div>

      {activeReading && (
        <RealityCheck
          readingId={activeReading.id}
          question={activeReading.question}
          onClose={() => setActiveReadingId(null)}
          onSuccess={(score) => handleRealityCheckSuccess(activeReading.id, score)}
        />
      )}
    </div>
  );
}
