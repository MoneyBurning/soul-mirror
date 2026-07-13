import TarotCard from './TarotCard';
import type { TarotCard as TarotCardData } from '@/types';

interface DailyCardProps {
  card: TarotCardData;
  orientation: 'normal' | 'reverse';
  message: string;
  date: string;
}

function formatDate(dateStr: string): string {
  // dateStr은 "YYYY-MM-DD" (UTC 기준) 형식으로 넘어오므로 시간대 오차 없이 파싱
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
    timeZone: 'UTC',
  });
}

export default function DailyCard({ card, orientation, message, date }: DailyCardProps) {
  return (
    <div className="flex flex-col items-center gap-5 rounded-2xl border border-purple-500/30 bg-purple-900/30 p-5 sm:flex-row sm:items-start sm:p-6">
      <TarotCard card={card} orientation={orientation} isRevealed size="lg" />
      <div className="flex flex-col items-center gap-2 text-center sm:items-start sm:text-left">
        <p className="text-xs uppercase tracking-wide text-purple-300/60">{formatDate(date)}</p>
        <h3 className="text-lg font-semibold text-amber-200">
          {card.korName} <span className="text-sm font-normal text-purple-300">({card.name})</span>
        </h3>
        <p className="text-sm leading-relaxed text-purple-100">{message}</p>
      </div>
    </div>
  );
}
