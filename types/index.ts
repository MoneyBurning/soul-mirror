export type Category =
  | 'love'
  | 'career'
  | 'money'
  | 'health'
  | 'family'
  | 'friendship'
  | 'study'
  | 'general';

export type SpreadType =
  | 'daily'
  | 'past_present_future'
  | 'love'
  | 'career'
  | 'decision'
  | 'celtic_cross';

export type Emotion = 'happy' | 'neutral' | 'sad' | 'angry' | 'anxious';

export interface TarotCard {
  id: string;
  name: string;
  korName: string;
  arcana: 'major' | 'minor';
  suit?: 'wands' | 'cups' | 'swords' | 'pentacles';
  number?: number;
  normalMeaning: string;
  reverseMeaning: string;
  keywords: string[];
  korNormalMeaning: string;
  korReverseMeaning: string;
  korKeywords: string[];
  imageUrl?: string;
}

export interface ReadingCard {
  position: number;
  card: TarotCard;
  orientation: 'normal' | 'reverse';
}

export interface Reading {
  id: string;
  userId: string;
  question: string;
  category: Category;
  spreadType: SpreadType;
  cards: ReadingCard[];
  aiResponse: string;
  actionTip: string;
  emotion: Emotion;
  createdAt: string;
}

export interface RealityCheck {
  id: string;
  readingId: string;
  score: 1 | 2 | 3 | 4 | 5;
  memo?: string;
  checkedAt: string;
}

export interface Profile {
  id: string;
  nickname?: string;
  avatarType?: string;
  createdAt: string;
}
