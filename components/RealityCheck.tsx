'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

const MEMO_MAX_LENGTH = 100;
const SCORES = [1, 2, 3, 4, 5] as const;

interface RealityCheckProps {
  readingId: string;
  question: string;
  onClose: () => void;
  onSuccess: (score: number) => void;
}

export default function RealityCheck({ readingId, question, onClose, onSuccess }: RealityCheckProps) {
  const [score, setScore] = useState<number | null>(null);
  const [memo, setMemo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!score || isSubmitting) return;

    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/reality-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ readingId, score, memo: memo.trim() || undefined }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? '저장 중 오류가 발생했습니다.');
        setIsSubmitting(false);
        return;
      }

      onSuccess(score);
    } catch (err) {
      console.error('RealityCheck submit error:', err);
      setError('네트워크 오류가 발생했습니다. 다시 시도해주세요.');
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-purple-500/30 bg-[#160f28] p-6 shadow-xl"
      >
        <h2 className="text-sm font-semibold text-amber-200">리얼리티 체크</h2>
        <p className="mt-1 line-clamp-2 text-xs text-purple-300/70">{question}</p>

        <p className="mt-5 text-center text-xs text-purple-200">
          이 리딩이 실제로 얼마나 맞았나요?
        </p>
        <div className="mt-3 flex justify-center gap-2">
          {SCORES.map((value) => {
            const isSelected = score !== null && value <= score;
            return (
              <motion.button
                key={value}
                type="button"
                aria-label={`${value}점`}
                aria-pressed={score === value}
                onClick={() => setScore(value)}
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
                className={`text-2xl transition-opacity ${isSelected ? 'opacity-100' : 'opacity-30'}`}
              >
                ⭐
              </motion.button>
            );
          })}
        </div>

        <label htmlFor="reality-check-memo" className="mt-5 block text-xs text-purple-200">
          메모 (선택)
        </label>
        <textarea
          id="reality-check-memo"
          value={memo}
          onChange={(e) => setMemo(e.target.value.slice(0, MEMO_MAX_LENGTH))}
          maxLength={MEMO_MAX_LENGTH}
          rows={3}
          placeholder="실제로 어떻게 되었나요?"
          className="mt-1 w-full resize-none rounded-lg border border-purple-500/30 bg-purple-900/30 p-2 text-xs text-purple-50 placeholder:text-purple-300/40 focus:border-amber-300 focus:outline-none"
        />
        <span className="mt-1 block text-right text-[10px] text-purple-300/60">
          {memo.length}/{MEMO_MAX_LENGTH}
        </span>

        {error && (
          <p className="mt-2 rounded-lg border border-red-400/40 bg-red-400/10 px-3 py-2 text-xs text-red-200">
            {error}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-purple-400/40 px-4 py-2 text-xs font-medium text-purple-200 hover:bg-purple-800/40"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!score || isSubmitting}
            className="rounded-full bg-amber-400 px-4 py-2 text-xs font-semibold text-purple-950 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSubmitting ? '저장 중...' : '제출'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
