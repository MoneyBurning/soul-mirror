'use client';

import { motion } from 'framer-motion';
import type { Category } from '@/types';

interface CategorySelectorProps {
  value?: Category;
  onChange: (category: Category) => void;
}

const CATEGORIES: { category: Category; emoji: string; label: string }[] = [
  { category: 'love', emoji: '❤️', label: '연애' },
  { category: 'career', emoji: '💼', label: '커리어' },
  { category: 'money', emoji: '💰', label: '금전' },
  { category: 'health', emoji: '💚', label: '건강' },
  { category: 'family', emoji: '👨‍👩‍👧', label: '가족' },
  { category: 'friendship', emoji: '🤝', label: '우정' },
  { category: 'study', emoji: '📚', label: '학업' },
  { category: 'general', emoji: '✨', label: '일반' },
];

// 다른 화면(예: timeline)에서도 같은 이모지 매핑을 쓰기 위해 export
export function getCategoryEmoji(category: Category): string {
  return CATEGORIES.find((item) => item.category === category)?.emoji ?? '✨';
}

export default function CategorySelector({ value, onChange }: CategorySelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {CATEGORIES.map(({ category, emoji, label }) => {
        const isSelected = value === category;

        return (
          <motion.button
            key={category}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onChange(category)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            className={`flex flex-col items-center justify-center gap-1 rounded-xl border-2 px-3 py-3 text-center transition-colors sm:py-4 ${
              isSelected
                ? 'border-amber-300 bg-purple-700/70 text-amber-100 shadow-md shadow-amber-500/20'
                : 'border-purple-500/30 bg-purple-900/40 text-purple-100 hover:border-purple-400/50'
            }`}
          >
            <span className="text-2xl sm:text-3xl">{emoji}</span>
            <span className="text-xs font-medium sm:text-sm">{label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
