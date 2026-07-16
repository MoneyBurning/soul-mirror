'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase, getCurrentUser } from '@/lib/supabase';
import TarotCard from '@/components/TarotCard';
import EmotionPicker from '@/components/EmotionPicker';
import { getCardByName } from '@/lib/tarot-data';
import { getSpreadDefinition } from '@/lib/spreads';
import { stripActionTipSection } from '@/lib/format';
import type { Category, Emotion, SpreadType, TarotCard as TarotCardData } from '@/types';

const TYPEWRITER_DURATION_MS = 2000;

interface ResultCard {
  position: number;
  card: TarotCardData;
  orientation: 'normal' | 'reverse';
}

interface ReadingDetail {
  id: string;
  question: string;
  category: Category | null;
  spreadType: SpreadType | null;
  aiResponse: string;
  actionTip: string | null;
  emotion: Emotion | null;
  cards: ResultCard[];
}

interface ReadingDetailRow {
  id: string;
  question: string;
  category: Category | null;
  spread_type: SpreadType | null;
  ai_response: string;
  action_tip: string | null;
  emotion: Emotion | null;
  reading_cards: {
    position: number;
    orientation: 'normal' | 'reverse';
    tarot_cards: { name: string } | null;
  }[];
}

function useTypewriter(text: string, active: boolean, durationMs = TYPEWRITER_DURATION_MS) {
  const [displayed, setDisplayed] = useState('');

  useEffect(() => {
    if (!active || !text) {
      setDisplayed('');
      return;
    }

    setDisplayed('');
    const totalTicks = 60;
    const intervalMs = durationMs / totalTicks;
    const charsPerTick = Math.max(1, Math.ceil(text.length / totalTicks));
    let index = 0;

    const id = setInterval(() => {
      index += charsPerTick;
      setDisplayed(text.slice(0, index));
      if (index >= text.length) clearInterval(id);
    }, intervalMs);

    return () => clearInterval(id);
  }, [text, active, durationMs]);

  return displayed;
}

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f0a1e]">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
    </div>
  );
}

function ResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const readingId = searchParams.get('id');

  const [authState, setAuthState] = useState<'checking' | 'ready'>('checking');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reading, setReading] = useState<ReadingDetail | null>(null);

  const [zoomCard, setZoomCard] = useState<ResultCard | null>(null);

  const [emotion, setEmotion] = useState<Emotion | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveComplete, setSaveComplete] = useState(false);

  const [isCapturing, setIsCapturing] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const [isPremium, setIsPremium] = useState(false);

  const captureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const user = await getCurrentUser();
      if (cancelled) return;
      if (!user) {
        router.replace('/');
        return;
      }
      setAuthState('ready');
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  // 프리미엄 여부 조회 (무료 유저에게만 업그레이드 CTA를 보여주기 위함)
  useEffect(() => {
    if (authState !== 'ready') return;

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch('/api/reading');
        if (cancelled || !res.ok) return;
        const data = await res.json();
        setIsPremium(Boolean(data.isPremium));
      } catch (err) {
        console.error('fetch isPremium error:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authState]);

  useEffect(() => {
    if (authState !== 'ready') return;

    if (!readingId) {
      setLoadError('잘못된 접근입니다.');
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      setIsLoading(true);
      setLoadError(null);

      const { data, error } = await supabase
        .from('readings')
        .select(
          `id, question, category, spread_type, ai_response, action_tip, emotion,
           reading_cards ( position, orientation, tarot_cards ( name ) )`
        )
        .eq('id', readingId)
        .maybeSingle();

      if (cancelled) return;

      if (error || !data) {
        console.error('reading result fetch error:', error?.message);
        setLoadError('리딩을 찾을 수 없습니다.');
        setIsLoading(false);
        return;
      }

      const row = data as unknown as ReadingDetailRow;

      const cards: ResultCard[] = row.reading_cards
        .map((rc) => {
          const card = rc.tarot_cards ? getCardByName(rc.tarot_cards.name) : undefined;
          return card ? { position: rc.position, card, orientation: rc.orientation } : null;
        })
        .filter((rc): rc is ResultCard => rc !== null)
        .sort((a, b) => a.position - b.position);

      setReading({
        id: row.id,
        question: row.question,
        category: row.category,
        spreadType: row.spread_type,
        aiResponse: row.ai_response,
        actionTip: row.action_tip,
        emotion: row.emotion,
        cards,
      });
      setEmotion(row.emotion ?? undefined);
      setSaveComplete(Boolean(row.emotion));
      setIsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [authState, readingId]);

  // "오늘의 행동"은 하단 박스에 별도로 표시되므로, 본문에는 그 앞부분만 노출한다.
  // (기존에 저장된 리딩의 ai_response에도 남아있을 수 있어 화면에서도 한 번 더 제거)
  const displayText = reading ? stripActionTipSection(reading.aiResponse) : '';
  const typedText = useTypewriter(displayText, !isLoading && reading !== null);
  const isTypingComplete =
    reading !== null && displayText.length > 0 && typedText.length >= displayText.length;

  async function handleSaveEmotion() {
    if (!emotion || !reading || isSaving) return;

    setSaveError(null);
    setIsSaving(true);

    try {
      const res = await fetch('/api/reading', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ readingId: reading.id, emotion }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          router.replace('/');
          return;
        }
        setSaveError(data.error ?? '저장 중 오류가 발생했습니다.');
        setIsSaving(false);
        return;
      }

      setIsSaving(false);
      setSaveComplete(true);
    } catch (err) {
      console.error('handleSaveEmotion error:', err);
      setSaveError('네트워크 오류가 발생했습니다. 다시 시도해주세요.');
      setIsSaving(false);
    }
  }

  async function handleSaveImage() {
    if (!captureRef.current || isCapturing) return;

    setCaptureError(null);
    setIsCapturing(true);

    try {
      await document.fonts.ready;

      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(captureRef.current, {
        backgroundColor: '#0f0a1e',
        useCORS: true,
        scale: 2,
        // html2canvas가 text-overflow: ellipsis를 자체적으로 다시 그리면서
        // 한글 마지막 글자(받침)를 잘라먹는 버그가 있어, 캡처용 복제 DOM에서만
        // truncate 관련 스타일을 제거해 실제 텍스트 그대로 렌더링되게 한다.
        onclone: (clonedDoc) => {
          clonedDoc.querySelectorAll('.truncate').forEach((el) => {
            const node = el as HTMLElement;
            node.style.overflow = 'visible';
            node.style.textOverflow = 'clip';
            node.style.whiteSpace = 'normal';
          });
        },
      });

      const link = document.createElement('a');
      link.download = `soul-mirror-${reading?.id ?? 'reading'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('handleSaveImage error:', err);
      setCaptureError('이미지를 저장하는 중 오류가 발생했습니다.');
    } finally {
      setIsCapturing(false);
    }
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      console.error('handleCopyLink error:', err);
    }
  }

  if (authState !== 'ready' || isLoading) {
    return <LoadingScreen />;
  }

  if (loadError || !reading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0f0a1e] px-4 text-center text-purple-50">
        <p className="text-sm text-red-200">{loadError ?? '리딩을 찾을 수 없습니다.'}</p>
        <Link
          href="/reading"
          className="rounded-full bg-amber-400 px-6 py-3 text-sm font-semibold text-purple-950"
        >
          새 리딩 시작하기
        </Link>
      </div>
    );
  }

  const spreadDefinition = reading.spreadType ? getSpreadDefinition(reading.spreadType) : undefined;

  return (
    <div className="min-h-screen bg-[#0f0a1e] px-4 py-10 text-purple-50 sm:px-8">
      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        <h1 className="text-center text-2xl font-bold text-amber-200 sm:text-3xl">리딩 결과</h1>

        {/* 캡처 대상 영역: 카드 + AI 해석만 (네비/버튼 제외) */}
        <div ref={captureRef} className="flex flex-col gap-6 rounded-2xl bg-[#0f0a1e] p-4">
          <p className="text-center text-sm text-purple-200">{reading.question}</p>

          <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
            {reading.cards.map((rc) => {
              const positionLabel = spreadDefinition?.positions?.[rc.position - 1];
              return (
                <div key={rc.position} className="flex flex-col items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setZoomCard(rc)}
                    className="cursor-zoom-in"
                    aria-label={`${rc.card.korName} 카드 확대`}
                  >
                    <TarotCard
                      position={rc.position}
                      card={rc.card}
                      orientation={rc.orientation}
                      isRevealed
                      size="lg"
                    />
                  </button>
                  {positionLabel && (
                    <span className="text-xs text-purple-300/70">{positionLabel}</span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex flex-col gap-4 rounded-xl border border-purple-500/30 bg-purple-900/30 p-5">
            <p className="min-h-[4rem] whitespace-pre-wrap text-sm leading-relaxed text-purple-50">
              {typedText}
              {!isTypingComplete && <span className="animate-pulse">▌</span>}
            </p>
            {isTypingComplete && reading.actionTip && (
              <div className="rounded-lg border border-amber-300/50 bg-amber-400/10 px-4 py-3 text-sm font-medium text-amber-200">
                ✦ {reading.actionTip}
              </div>
            )}
          </div>

          <p className="text-right text-[10px] tracking-wide text-purple-300/40">Soul Mirror</p>
        </div>

        {/* 감정 입력 */}
        {isTypingComplete && !saveComplete && (
          <section className="flex flex-col items-center gap-5">
            <h2 className="text-sm font-medium text-purple-200">
              이 리딩에 대해 어떤 감정이 드시나요?
            </h2>
            <EmotionPicker value={emotion} onChange={setEmotion} />
            {saveError && (
              <p className="rounded-lg border border-red-400/40 bg-red-400/10 px-4 py-2 text-center text-sm text-red-200">
                {saveError}
              </p>
            )}
            <button
              type="button"
              onClick={handleSaveEmotion}
              disabled={!emotion || isSaving}
              className="rounded-full bg-amber-400 px-8 py-3 text-sm font-semibold text-purple-950 transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isSaving ? '저장 중...' : '감정 저장'}
            </button>
          </section>
        )}

        {/* 프리미엄 업그레이드 CTA (무료 유저에게만 노출) */}
        {isTypingComplete && !isPremium && (
          <section className="flex justify-center">
            <Link
              href="/premium"
              className="rounded-full bg-gradient-to-r from-amber-400 to-amber-300 px-6 py-3 text-sm font-semibold text-purple-950 shadow-lg shadow-amber-400/20 transition-transform hover:scale-105"
            >
              🔮 프리미엄으로 전체 리딩 보기
            </Link>
          </section>
        )}

        {/* 액션 버튼 */}
        {isTypingComplete && (
          <section className="flex flex-col items-center gap-4">
            {captureError && (
              <p className="rounded-lg border border-red-400/40 bg-red-400/10 px-4 py-2 text-center text-sm text-red-200">
                {captureError}
              </p>
            )}
            <div className="flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={handleSaveImage}
                disabled={isCapturing}
                className="rounded-full border border-purple-400/40 px-5 py-3 text-sm font-semibold text-purple-100 transition-colors hover:bg-purple-800/40 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isCapturing ? '저장 중...' : '🖼 이미지 저장'}
              </button>
              <button
                type="button"
                onClick={handleCopyLink}
                className="rounded-full border border-purple-400/40 px-5 py-3 text-sm font-semibold text-purple-100 transition-colors hover:bg-purple-800/40"
              >
                {linkCopied ? '복사됨 ✓' : '🔗 링크 복사'}
              </button>
              <Link
                href="/timeline"
                className="rounded-full border border-amber-300/60 px-5 py-3 text-sm font-semibold text-amber-200 transition-colors hover:bg-amber-400/10"
              >
                타임라인에서 보기
              </Link>
              <button
                type="button"
                onClick={() => router.push('/reading')}
                className="rounded-full bg-amber-400 px-5 py-3 text-sm font-semibold text-purple-950"
              >
                🔄 다시 뽑기
              </button>
            </div>
          </section>
        )}
      </div>

      {zoomCard && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => setZoomCard(null)}
          onKeyDown={(e) => {
            if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') setZoomCard(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
        >
          <div
            role="presentation"
            onClick={(e) => e.stopPropagation()}
            className="flex flex-col items-center gap-4"
          >
            <TarotCard card={zoomCard.card} orientation={zoomCard.orientation} isRevealed size="xl" />
            <button
              type="button"
              onClick={() => setZoomCard(null)}
              className="rounded-full bg-amber-400 px-5 py-2 text-xs font-semibold text-purple-950"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReadingResultPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <ResultContent />
    </Suspense>
  );
}
