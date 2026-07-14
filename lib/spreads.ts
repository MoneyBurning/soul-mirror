import type { SpreadType } from '@/types';

export interface SpreadDefinition {
  value: SpreadType;
  label: string;
  cardCount: number;
  // 카드별 자리 의미(과거/현재/미래 등) — 정의된 스프레드만 표시/AI 컨텍스트에 사용
  positions?: string[];
}

// /reading 페이지에서 사용자가 고를 수 있는 스프레드 목록.
// 'daily'는 대시보드의 오늘의 카드 전용이라 여기 포함하지 않는다.
export const READING_SPREADS: SpreadDefinition[] = [
  {
    value: 'one_card',
    label: '원카드 (1장) · 오늘의 한마디',
    cardCount: 1,
    positions: ['오늘의 한마디'],
  },
  {
    value: 'past_present_future',
    label: '과거 · 현재 · 미래 (3장)',
    cardCount: 3,
    positions: ['과거', '현재', '미래'],
  },
  {
    value: 'decision',
    label: '결정 스프레드 (3장)',
    cardCount: 3,
  },
  {
    value: 'love',
    label: '연애 스프레드 (5장)',
    cardCount: 5,
  },
  {
    value: 'career',
    label: '커리어 스프레드 (5장)',
    cardCount: 5,
  },
  {
    value: 'full_reading',
    label: '풀 리딩 (6장)',
    cardCount: 6,
    positions: ['상황', '장애', '조언', '결과', '과거', '미래'],
  },
];

export const SPREAD_CARD_COUNTS: Record<SpreadType, number> = {
  daily: 1,
  one_card: 1,
  past_present_future: 3,
  love: 5,
  career: 5,
  decision: 3,
  full_reading: 6,
};

export function getSpreadDefinition(value: SpreadType): SpreadDefinition | undefined {
  return READING_SPREADS.find((spread) => spread.value === value);
}
