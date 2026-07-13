import { NextRequest, NextResponse } from 'next/server';
import { getRouteHandlerSupabase } from '@/lib/supabase-server';
import {
  checkRateLimit,
  checkDailyReadingLimit,
  getDailyReadingCount,
  isPremiumUser,
  FREE_DAILY_READING_LIMIT,
  PREMIUM_DAILY_READING_LIMIT,
} from '@/lib/rate-limit';
import { ReadingRequestSchema, ReadingEmotionUpdateSchema } from '@/lib/validators';
import { generateReading, RATE_LIMIT_MESSAGE } from '@/lib/groq';
import { getRandomCards } from '@/lib/tarot-data';
import { errorResponse } from '@/lib/api-response';
import type { ReadingCard, SpreadType } from '@/types';

const SPREAD_CARD_COUNTS: Record<SpreadType, number> = {
  daily: 1,
  past_present_future: 3,
  love: 5,
  career: 5,
  decision: 3,
  celtic_cross: 10,
};

interface ReadingResponseBody {
  readingId: string;
  cards: ReadingCard[];
  aiResponse: string;
  actionTip: string;
}

interface ReadingUsageResponseBody {
  used: number;
  limit: number;
  remaining: number;
  isPremium: boolean;
}

// 오늘 리딩 사용량 조회 (대시보드의 "오늘 남은 리딩 횟수" 섹션에서 사용)
export async function GET() {
  try {
    const supabase = getRouteHandlerSupabase();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return errorResponse('로그인이 필요합니다.', 401);
    }

    const isPremium = await isPremiumUser(user.id);
    const limit = isPremium ? PREMIUM_DAILY_READING_LIMIT : FREE_DAILY_READING_LIMIT;
    const used = await getDailyReadingCount(user.id);

    const responseBody: ReadingUsageResponseBody = {
      used,
      limit,
      remaining: Math.max(0, limit - used),
      isPremium,
    };

    return NextResponse.json(responseBody, { status: 200 });
  } catch (err) {
    console.error('GET /api/reading error:', err instanceof Error ? err.message : err);
    return errorResponse('서버 오류가 발생했습니다.', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getRouteHandlerSupabase();

    // 2. 로그인 확인
    // (rate limit이 user_id 기준으로 설계돼 있어, 유효한 세션 확인을 먼저 수행한 뒤
    //  바로 이어서 1번 rate limit 체크를 진행합니다.)
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return errorResponse('로그인이 필요합니다.', 401);
    }

    // 1. Rate Limit 체크 (분당 10회 초과 시 429)
    const withinRateLimit = await checkRateLimit(user.id, 'reading', 10, 1);
    if (!withinRateLimit) {
      return errorResponse('요청이 너무 많습니다. 잠시 후 다시 시도해주세요.', 429);
    }

    // 3. Zod로 입력값 검증
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse('잘못된 요청 본문입니다.', 400);
    }

    const parsed = ReadingRequestSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues.map((issue) => issue.message).join(' '), 400);
    }

    const { question, category, spreadType } = parsed.data;

    if (spreadType === 'celtic_cross') {
      return errorResponse('Celtic Cross 스프레드는 프리미엄 기능으로 준비 중입니다.', 403);
    }

    // 4. 오늘 리딩 횟수 확인 (무료 3회 / 프리미엄 10회 초과 시 429)
    const isPremium = await isPremiumUser(user.id);
    const dailyLimit = isPremium ? PREMIUM_DAILY_READING_LIMIT : FREE_DAILY_READING_LIMIT;

    const withinDailyLimit = await checkDailyReadingLimit(user.id, dailyLimit);
    if (!withinDailyLimit) {
      return errorResponse(`오늘의 리딩 횟수(${dailyLimit}회)를 모두 사용했습니다.`, 429);
    }

    // 5. 랜덤 카드 뽑기
    const cardCount = SPREAD_CARD_COUNTS[spreadType];
    const drawnCards: ReadingCard[] = getRandomCards(cardCount).map((card, index) => ({
      position: index + 1,
      card,
      orientation: Math.random() < 0.5 ? 'normal' : 'reverse',
    }));

    // 6. Groq AI 호출
    let aiResult: { response: string; actionTip: string };
    try {
      aiResult = await generateReading({
        question,
        category,
        spreadType,
        cards: drawnCards.map((rc) => ({
          name: rc.card.korName,
          orientation: rc.orientation,
          position: rc.position,
        })),
      });
    } catch (err) {
      console.error('generateReading error:', err instanceof Error ? err.message : err);
      return errorResponse('AI 응답 생성 중 오류가 발생했습니다.', 502);
    }

    if (aiResult.response === RATE_LIMIT_MESSAGE) {
      return errorResponse(RATE_LIMIT_MESSAGE, 429);
    }

    // 7. readings 테이블에 저장
    const { data: readingRow, error: readingInsertError } = await supabase
      .from('readings')
      .insert({
        user_id: user.id,
        question,
        category,
        spread_type: spreadType,
        ai_response: aiResult.response,
        action_tip: aiResult.actionTip,
      })
      .select()
      .single();

    if (readingInsertError || !readingRow) {
      console.error('readings insert error:', readingInsertError?.message);
      return errorResponse('리딩 저장 중 오류가 발생했습니다.', 500);
    }

    // 8. reading_cards 테이블에 카드 저장
    // tarot_cards는 name이 UNIQUE라 이름으로 실제 DB UUID(card_id)를 조회
    const cardNames = drawnCards.map((rc) => rc.card.name);
    const { data: dbCards, error: tarotLookupError } = await supabase
      .from('tarot_cards')
      .select('id, name')
      .in('name', cardNames);

    if (tarotLookupError) {
      console.error('tarot_cards lookup error:', tarotLookupError.message);
    }

    const cardIdByName = new Map<string, string>(
      (dbCards ?? []).map((row: { id: string; name: string }) => [row.name, row.id])
    );

    if (cardIdByName.size < cardNames.length) {
      console.warn(
        'tarot_cards 테이블에서 일부 카드를 찾지 못했습니다. 시드 데이터가 반영되었는지 확인하세요.'
      );
    }

    const readingCardRows = drawnCards.map((rc) => ({
      reading_id: readingRow.id as string,
      card_id: cardIdByName.get(rc.card.name) ?? null,
      position: rc.position,
      orientation: rc.orientation,
    }));

    const { error: cardsInsertError } = await supabase.from('reading_cards').insert(readingCardRows);

    if (cardsInsertError) {
      console.error('reading_cards insert error:', cardsInsertError.message);
      return errorResponse('카드 저장 중 오류가 발생했습니다.', 500);
    }

    // 9. 성공 응답 반환
    const responseBody: ReadingResponseBody = {
      readingId: readingRow.id as string,
      cards: drawnCards,
      aiResponse: aiResult.response,
      actionTip: aiResult.actionTip,
    };

    return NextResponse.json(responseBody, { status: 201 });
  } catch (err) {
    console.error('POST /api/reading error:', err instanceof Error ? err.message : err);
    return errorResponse('서버 오류가 발생했습니다.', 500);
  }
}

// reading 페이지 "Save Reading" 단계에서 사용자가 고른 감정을 기존 리딩에 기록
export async function PATCH(request: NextRequest) {
  try {
    const supabase = getRouteHandlerSupabase();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return errorResponse('로그인이 필요합니다.', 401);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse('잘못된 요청 본문입니다.', 400);
    }

    const parsed = ReadingEmotionUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues.map((issue) => issue.message).join(' '), 400);
    }

    const { readingId, emotion } = parsed.data;

    const { data: updatedRow, error: updateError } = await supabase
      .from('readings')
      .update({ emotion })
      .eq('id', readingId)
      .eq('user_id', user.id)
      .select('id')
      .maybeSingle();

    if (updateError) {
      console.error('readings emotion update error:', updateError.message);
      return errorResponse('감정 저장 중 오류가 발생했습니다.', 500);
    }
    if (!updatedRow) {
      return errorResponse('리딩을 찾을 수 없습니다.', 404);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error('PATCH /api/reading error:', err instanceof Error ? err.message : err);
    return errorResponse('서버 오류가 발생했습니다.', 500);
  }
}
