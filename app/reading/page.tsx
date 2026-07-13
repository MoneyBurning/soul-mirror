'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import TarotCard from '@/components/TarotCard';
import CategorySelector from '@/components/CategorySelector';
import EmotionPicker from '@/components/EmotionPicker';
import { getCurrentUser } from '@/lib/supabase';
import type { Category, SpreadType, Emotion, ReadingCard } from '@/types';

const QUESTION_MAX_LENGTH = 200;

const SPREAD_OPTIONS: { value: SpreadType; label: string; cardCount: number }[] = [
  { value: 'past_present_future', label: '과거 · 현재 · 미래 (3장)', cardCount: 3 },
  { value: 'love', label: '연애 스프레드 (5장)', cardCount: 5 },
  { value: 'career', label: '커리어 스프레드 (5장)', cardCount: 5 },
  { value: 'decision', label: '결정 스프레드 (3장)', cardCount: 3 },
];

const CARD_FLIP_INTERVAL_MS = 500;
const TYPEWRITER_DURATION_MS = 2500;

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
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

export default function ReadingPage() {
  const router = useRouter();
  const [authState, setAuthState] = useState<'checking' | 'ready'>('checking');

  const [question, setQuestion] = useState('');
  const [category, setCategory] = useState<Category | undefined>(undefined);
  const [spreadType, setSpreadType] = useState<SpreadType | undefined>(undefined);

  const [isDrawing, setIsDrawing] = useState(false);
  const [drawError, setDrawError] = useState<string | null>(null);
  const [limitNotice, setLimitNotice] = useState<string | null>(null);

  const [readingId, setReadingId] = useState<string | null>(null);
  const [drawnCards, setDrawnCards] = useState<ReadingCard[] | null>(null);
  const [aiResponse, setAiResponse] = useState('');
  const [actionTip, setActionTip] = useState('');

  const [revealedCount, setRevealedCount] = useState(0);
  const [interpretationVisible, setInterpretationVisible] = useState(false);

  const [emotion, setEmotion] = useState<Emotion | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveComplete, setSaveComplete] = useState(false);

  const sequenceCancelledRef = useRef(false);

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

  useEffect(() => {
    return () => {
      sequenceCancelledRef.current = true;
    };
  }, []);

  const typedText = useTypewriter(aiResponse, interpretationVisible);
  const isTypingComplete =
    interpretationVisible && aiResponse.length > 0 && typedText.length >= aiResponse.length;

  const formValid =
    question.trim().length >= 2 &&
    question.trim().length <= QUESTION_MAX_LENGTH &&
    category !== undefined &&
    spreadType !== undefined;

  const selectedSpread = SPREAD_OPTIONS.find((option) => option.value === spreadType);
  const cardCount = selectedSpread?.cardCount ?? 0;

  async function revealCardsSequentially(count: number) {
    sequenceCancelledRef.current = false;
    for (let i = 0; i < count; i++) {
      if (sequenceCancelledRef.current) return;
      setRevealedCount(i + 1);
      await delay(CARD_FLIP_INTERVAL_MS);
    }
    if (sequenceCancelledRef.current) return;
    await delay(400);
    if (sequenceCancelledRef.current) return;
    setInterpretationVisible(true);
  }

  async function handleDrawCards() {
    if (!formValid || isDrawing || drawnCards) return;

    setDrawError(null);
    setLimitNotice(null);
    setIsDrawing(true);

    try {
      const res = await fetch('/api/reading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: question.trim(),
          category,
          spreadType,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          router.replace('/');
          return;
        }
        if (res.status === 429) {
          setLimitNotice(data.error ?? '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.');
        } else {
          setDrawError(data.error ?? '리딩을 생성하는 중 오류가 발생했습니다.');
        }
        setIsDrawing(false);
        return;
      }

      setReadingId(data.readingId);
      setDrawnCards(data.cards);
      setAiResponse(data.aiResponse);
      setActionTip(data.actionTip);
      setIsDrawing(false);

      void revealCardsSequentially(data.cards.length);
    } catch (err) {
      console.error('handleDrawCards error:', err);
      setDrawError('네트워크 오류가 발생했습니다. 다시 시도해주세요.');
      setIsDrawing(false);
    }
  }

  async function handleSaveReading() {
    if (!emotion || !readingId || isSaving) return;

    setSaveError(null);
    setIsSaving(true);

    try {
      const res = await fetch('/api/reading', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ readingId, emotion }),
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
      console.error('handleSaveReading error:', err);
      setSaveError('네트워크 오류가 발생했습니다. 다시 시도해주세요.');
      setIsSaving(false);
    }
  }

  function resetAll() {
    sequenceCancelledRef.current = true;
    setQuestion('');
    setCategory(undefined);
    setSpreadType(undefined);
    setIsDrawing(false);
    setDrawError(null);
    setLimitNotice(null);
    setReadingId(null);
    setDrawnCards(null);
    setAiResponse('');
    setActionTip('');
    setRevealedCount(0);
    setInterpretationVisible(false);
    setEmotion(undefined);
    setIsSaving(false);
    setSaveError(null);
    setSaveComplete(false);
  }

  if (authState !== 'ready') {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-[#0f0a1e] px-4 py-10 text-purple-50 sm:px-8">
      <div className="mx-auto flex max-w-2xl flex-col gap-10">
        <h1 className="text-center text-2xl font-bold text-amber-200 sm:text-3xl">새 리딩</h1>

        {/* 단계 1~3: 질문 / 카테고리 / 스프레드 (카드를 뽑고 나면 잠금) */}
        <fieldset disabled={isDrawing || drawnCards !== null} className="flex flex-col gap-8">
          <section className="flex flex-col gap-2">
            <label htmlFor="question" className="text-sm font-medium text-purple-200">
              무엇이 궁금하신가요?
            </label>
            <textarea
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value.slice(0, QUESTION_MAX_LENGTH))}
              maxLength={QUESTION_MAX_LENGTH}
              rows={3}
              placeholder="질문을 입력하세요..."
              className="w-full resize-none rounded-lg border border-purple-500/30 bg-purple-900/30 p-3 text-sm text-purple-50 placeholder:text-purple-300/40 focus:border-amber-300 focus:outline-none disabled:opacity-50"
            />
            <span className="self-end text-xs text-purple-300/60">
              {question.length}/{QUESTION_MAX_LENGTH}
            </span>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-medium text-purple-200">카테고리를 선택하세요</h2>
            <CategorySelector value={category} onChange={setCategory} />
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-medium text-purple-200">스프레드를 선택하세요</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {SPREAD_OPTIONS.map((option) => {
                const isSelected = spreadType === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSpreadType(option.value)}
                    className={`rounded-lg border-2 px-4 py-3 text-left text-sm transition-colors ${
                      isSelected
                        ? 'border-amber-300 bg-purple-700/70 text-amber-100'
                        : 'border-purple-500/30 bg-purple-900/40 text-purple-100 hover:border-purple-400/50'
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </section>
        </fieldset>

        {/* 단계 4: 카드 뽑기 */}
        {spreadType && (
          <section className="flex flex-col items-center gap-5">
            <div className="flex flex-wrap justify-center gap-4">
              {Array.from({ length: cardCount }).map((_, index) => (
                <TarotCard
                  key={index}
                  position={index + 1}
                  card={drawnCards ? drawnCards[index].card : undefined}
                  orientation={drawnCards ? drawnCards[index].orientation : 'normal'}
                  isRevealed={drawnCards !== null && index < revealedCount}
                />
              ))}
            </div>

            {limitNotice && (
              <p className="rounded-lg border border-amber-400/40 bg-amber-400/10 px-4 py-2 text-center text-sm text-amber-200">
                {limitNotice}
              </p>
            )}
            {drawError && (
              <p className="rounded-lg border border-red-400/40 bg-red-400/10 px-4 py-2 text-center text-sm text-red-200">
                {drawError}
              </p>
            )}

            {!drawnCards && (
              <button
                type="button"
                onClick={handleDrawCards}
                disabled={!formValid || isDrawing}
                className="rounded-full bg-amber-400 px-8 py-3 text-sm font-semibold text-purple-950 transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isDrawing ? '뽑는 중...' : '카드 뽑기'}
              </button>
            )}
          </section>
        )}

        {/* 단계 5: AI 해석 (타이핑 효과) */}
        {interpretationVisible && (
          <section className="flex flex-col gap-4 rounded-xl border border-purple-500/30 bg-purple-900/30 p-5">
            <p className="min-h-[6rem] whitespace-pre-wrap text-sm leading-relaxed text-purple-50">
              {typedText}
              {!isTypingComplete && <span className="animate-pulse">▌</span>}
            </p>
            {isTypingComplete && actionTip && (
              <div className="rounded-lg border border-amber-300/50 bg-amber-400/10 px-4 py-3 text-sm font-medium text-amber-200">
                ✦ {actionTip}
              </div>
            )}
          </section>
        )}

        {/* 단계 6: 감정 입력 */}
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
              onClick={handleSaveReading}
              disabled={!emotion || isSaving}
              className="rounded-full bg-amber-400 px-8 py-3 text-sm font-semibold text-purple-950 transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isSaving ? '저장 중...' : '리딩 저장'}
            </button>
          </section>
        )}

        {/* 단계 7: 저장 완료 */}
        {saveComplete && (
          <section className="flex flex-col items-center gap-4">
            <p className="text-sm font-medium text-amber-200">리딩이 저장되었습니다 ✦</p>
            <div className="flex gap-3">
              <Link
                href="/timeline"
                className="rounded-full border border-amber-300/60 px-6 py-3 text-sm font-semibold text-amber-200 transition-colors hover:bg-amber-400/10"
              >
                타임라인에서 보기
              </Link>
              <button
                type="button"
                onClick={resetAll}
                className="rounded-full bg-amber-400 px-6 py-3 text-sm font-semibold text-purple-950"
              >
                새 리딩
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
