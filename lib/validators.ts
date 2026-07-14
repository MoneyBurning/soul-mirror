import { z } from 'zod';
import type { Category, SpreadType, Emotion } from '@/types';

// types/index.ts의 union 타입과 어긋나면 TS 컴파일 에러가 나도록 satisfies로 고정
const categoryValues = [
  'love',
  'career',
  'money',
  'health',
  'family',
  'friendship',
  'study',
  'general',
] as const satisfies readonly Category[];

const spreadTypeValues = [
  'daily',
  'one_card',
  'past_present_future',
  'love',
  'career',
  'decision',
  'full_reading',
] as const satisfies readonly SpreadType[];

const emotionValues = [
  'happy',
  'neutral',
  'sad',
  'angry',
  'anxious',
] as const satisfies readonly Emotion[];

// 1. 타로 리딩 요청
export const ReadingRequestSchema = z.object({
  question: z
    .string()
    .min(2, '질문은 최소 2자 이상이어야 합니다.')
    .max(200, '질문은 최대 200자까지 가능합니다.'),
  category: z.enum(categoryValues),
  spreadType: z.enum(spreadTypeValues),
});
export type ReadingRequest = z.infer<typeof ReadingRequestSchema>;

// 2. 리얼리티 체크 (readings.id, RealityCheck 타로 결과 검증 요청)
export const RealityCheckSchema = z.object({
  readingId: z.uuid('올바른 UUID 형식이 아닙니다.'),
  score: z
    .number()
    .int('점수는 정수여야 합니다.')
    .min(1, '점수는 1 이상이어야 합니다.')
    .max(5, '점수는 5 이하여야 합니다.'),
  memo: z.string().max(100, '메모는 최대 100자까지 가능합니다.').optional(),
});
export type RealityCheckInput = z.infer<typeof RealityCheckSchema>;

// 3. 감정 선택
export const EmotionSchema = z.object({
  emotion: z.enum(emotionValues),
});
export type EmotionInput = z.infer<typeof EmotionSchema>;

// 3-1. 리딩에 감정 기록 (reading 페이지의 "Save Reading" 단계에서 사용)
export const ReadingEmotionUpdateSchema = z.object({
  readingId: z.uuid('올바른 UUID 형식이 아닙니다.'),
  emotion: EmotionSchema.shape.emotion,
});
export type ReadingEmotionUpdate = z.infer<typeof ReadingEmotionUpdateSchema>;

// 4. 프로필 업데이트
export const ProfileUpdateSchema = z.object({
  nickname: z
    .string()
    .min(1, '닉네임은 최소 1자 이상이어야 합니다.')
    .max(20, '닉네임은 최대 20자까지 가능합니다.')
    .optional(),
  avatarType: z.string().optional(),
});
export type ProfileUpdate = z.infer<typeof ProfileUpdateSchema>;
