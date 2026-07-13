'use client';

import { motion } from 'framer-motion';
import type { Emotion } from '@/types';

interface EmotionPickerProps {
  value?: Emotion;
  onChange: (emotion: Emotion) => void;
}

const EMOTIONS: { emotion: Emotion; emoji: string; label: string }[] = [
  { emotion: 'happy', emoji: '😊', label: '기분 좋음' },
  { emotion: 'neutral', emoji: '😐', label: '그저 그럼' },
  { emotion: 'sad', emoji: '😢', label: '우울함' },
  { emotion: 'angry', emoji: '😡', label: '화남' },
  { emotion: 'anxious', emoji: '😰', label: '불안함' },
];

// 다른 화면(예: timeline)에서도 같은 이모지 매핑을 쓰기 위해 export
export function getEmotionEmoji(emotion: Emotion): string {
  return EMOTIONS.find((item) => item.emotion === emotion)?.emoji ?? '😐';
}

export default function EmotionPicker({ value, onChange }: EmotionPickerProps) {
  const selected = EMOTIONS.find((item) => item.emotion === value);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex flex-row items-center justify-center gap-3 sm:gap-4">
        {EMOTIONS.map(({ emotion, emoji, label }) => {
          const isSelected = value === emotion;

          return (
            <motion.button
              key={emotion}
              type="button"
              aria-label={label}
              aria-pressed={isSelected}
              onClick={() => onChange(emotion)}
              animate={{ scale: isSelected ? 1.3 : 1 }}
              whileHover={{ scale: isSelected ? 1.4 : 1.15 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 10 }}
              className="select-none rounded-full p-1 text-3xl leading-none outline-none focus-visible:ring-2 focus-visible:ring-amber-300 sm:text-4xl"
            >
              {emoji}
            </motion.button>
          );
        })}
      </div>

      <p
        className={`text-xs text-purple-200/80 transition-opacity sm:text-sm ${
          selected ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {selected?.label ?? ' '}
      </p>
    </div>
  );
}
