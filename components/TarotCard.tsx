'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useAnimationControls } from 'framer-motion';
import type { TarotCard as TarotCardData } from '@/types';

type CardSize = 'sm' | 'md' | 'lg';

interface TarotCardProps {
  card?: TarotCardData;
  orientation?: 'normal' | 'reverse';
  isRevealed?: boolean;
  onReveal?: () => void;
  position?: number;
  size?: CardSize;
}

const SIZE_CLASSES: Record<CardSize, string> = {
  sm: 'w-16 h-24 sm:w-20 sm:h-32',
  md: 'w-24 h-36 sm:w-32 sm:h-48',
  lg: 'w-32 h-48 sm:w-44 sm:h-64',
};

function getCardEmblem(card: TarotCardData): string {
  if (card.arcana === 'major') return '✨';
  switch (card.suit) {
    case 'wands':
      return '🔥';
    case 'cups':
      return '💧';
    case 'swords':
      return '⚔️';
    case 'pentacles':
      return '🪙';
    default:
      return '🔮';
  }
}

export default function TarotCard({
  card,
  orientation = 'normal',
  isRevealed = false,
  onReveal,
  position,
  size = 'md',
}: TarotCardProps) {
  const controls = useAnimationControls();
  const [displayRevealed, setDisplayRevealed] = useState(isRevealed);
  const [isFlipping, setIsFlipping] = useState(false);
  const isFirstRender = useRef(true);

  // isRevealed prop이 바뀔 때만 0 → 180 → 0으로 회전하고,
  // 회전이 180도에 도달한 중간 지점에서 실제 표시 내용(앞/뒷면)을 교체한다.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      setDisplayRevealed(isRevealed);
      return;
    }

    if (isRevealed === displayRevealed) return;

    let cancelled = false;

    async function flip() {
      setIsFlipping(true);

      await controls.start({
        rotateY: 180,
        opacity: 0.4,
        transition: { duration: 0.25, ease: 'easeIn' },
      });
      if (cancelled) return;

      setDisplayRevealed(isRevealed);

      await controls.start({
        rotateY: 0,
        opacity: 1,
        transition: { duration: 0.25, ease: 'easeOut' },
      });
      if (cancelled) return;

      setIsFlipping(false);
    }

    flip();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRevealed]);

  const handleClick = () => {
    if (isFlipping) return;
    onReveal?.();
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleClick();
    }
  };

  const showFront = displayRevealed && Boolean(card);

  return (
    <div className="relative inline-block">
      {position !== undefined && (
        <span className="absolute -left-2 -top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-[10px] font-bold text-purple-950 shadow sm:h-6 sm:w-6 sm:text-xs">
          {position}
        </span>
      )}

      <div className={`${SIZE_CLASSES[size]} [perspective:1000px]`}>
        <motion.div
          role="button"
          tabIndex={0}
          aria-label={showFront && card ? `${card.korName} 카드` : '뒷면 카드, 클릭해서 뒤집기'}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          animate={controls}
          initial={{ rotateY: 0, opacity: 1 }}
          className="h-full w-full cursor-pointer select-none outline-none"
        >
          {showFront && card ? (
            <div
              className={`flex h-full w-full flex-col items-center justify-between rounded-xl border-2 border-amber-300/60 bg-gradient-to-b from-indigo-950 to-purple-950 p-1.5 text-center shadow-lg shadow-purple-950/50 sm:p-2.5 ${
                orientation === 'reverse' ? 'rotate-180' : ''
              }`}
            >
              <div className="flex flex-1 items-center justify-center text-2xl sm:text-3xl">
                {getCardEmblem(card)}
              </div>
              <div className="w-full space-y-0.5 sm:space-y-1">
                <p className="truncate text-[9px] font-semibold text-amber-200 sm:text-xs">
                  {card.korName}
                </p>
                <p className="truncate text-[9px] text-purple-200/80 sm:text-xs">
                  {card.name}
                </p>
                <div className="flex flex-wrap justify-center gap-1 pt-0.5">
                  {card.korKeywords.slice(0, 3).map((keyword) => (
                    <span
                      key={keyword}
                      className="rounded-full bg-purple-800/60 px-1.5 py-0.5 text-[7px] text-purple-100 sm:text-[9px]"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full w-full items-center justify-center rounded-xl border-2 border-purple-400/40 bg-gradient-to-br from-purple-900 via-violet-800 to-purple-950 shadow-lg shadow-purple-950/50">
              <div className="flex h-[85%] w-[85%] items-center justify-center rounded-lg border border-purple-300/20 bg-[radial-gradient(circle_at_center,_rgba(216,180,254,0.25)_0%,_transparent_65%)]">
                <span className="text-xl text-purple-200/70 sm:text-2xl">✦</span>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
