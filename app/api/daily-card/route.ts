import { NextResponse } from 'next/server';
import { getRouteHandlerSupabase } from '@/lib/supabase-server';
import { generateDailyCard, RATE_LIMIT_MESSAGE } from '@/lib/groq';
import { getRandomCards, getCardByName } from '@/lib/tarot-data';
import { errorResponse } from '@/lib/api-response';
import type { TarotCard } from '@/types';

interface DailyCardResponseBody {
  card: TarotCard;
  orientation: 'normal' | 'reverse';
  message: string;
  date: string;
}

export async function GET() {
  try {
    const supabase = getRouteHandlerSupabase();

    // 1. 로그인 확인
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return errorResponse('로그인이 필요합니다.', 401);
    }

    const now = new Date();
    const startOfDayUTC = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    ).toISOString();
    const dateStr = startOfDayUTC.slice(0, 10);

    // 2. 오늘 날짜로 readings 테이블에서 spread_type = 'daily' 조회
    const { data: existingReading, error: existingError } = await supabase
      .from('readings')
      .select('id, ai_response')
      .eq('user_id', user.id)
      .eq('spread_type', 'daily')
      .gte('created_at', startOfDayUTC)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingError) {
      console.error('daily reading lookup error:', existingError.message);
      return errorResponse('오늘의 카드를 조회하는 중 오류가 발생했습니다.', 500);
    }

    // 3. 이미 있으면 기존 데이터 반환
    if (existingReading) {
      const { data: existingCardRow, error: existingCardError } = await supabase
        .from('reading_cards')
        .select('orientation, tarot_cards ( name )')
        .eq('reading_id', existingReading.id)
        .maybeSingle<{
          orientation: 'normal' | 'reverse';
          tarot_cards: { name: string } | null;
        }>();

      if (existingCardError || !existingCardRow?.tarot_cards) {
        console.error('daily reading card lookup error:', existingCardError?.message);
        return errorResponse('오늘의 카드를 조회하는 중 오류가 발생했습니다.', 500);
      }

      const card = getCardByName(existingCardRow.tarot_cards.name);
      if (!card) {
        return errorResponse('카드 데이터를 찾을 수 없습니다.', 500);
      }

      const responseBody: DailyCardResponseBody = {
        card,
        orientation: existingCardRow.orientation,
        message: existingReading.ai_response,
        date: dateStr,
      };

      return NextResponse.json(responseBody, { status: 200 });
    }

    // 4. 없으면 새로 생성
    const card = getRandomCards(1)[0];
    const orientation: 'normal' | 'reverse' = Math.random() < 0.5 ? 'normal' : 'reverse';

    let message: string;
    try {
      message = await generateDailyCard({ cardName: card.korName, orientation });
    } catch (err) {
      console.error('generateDailyCard error:', err instanceof Error ? err.message : err);
      return errorResponse('AI 메시지 생성 중 오류가 발생했습니다.', 502);
    }

    if (message === RATE_LIMIT_MESSAGE) {
      return errorResponse(RATE_LIMIT_MESSAGE, 429);
    }

    const { data: readingRow, error: readingInsertError } = await supabase
      .from('readings')
      .insert({
        user_id: user.id,
        question: "Today's daily card",
        category: 'general',
        spread_type: 'daily',
        ai_response: message,
      })
      .select()
      .single();

    if (readingInsertError || !readingRow) {
      console.error('daily reading insert error:', readingInsertError?.message);
      return errorResponse('오늘의 카드를 저장하는 중 오류가 발생했습니다.', 500);
    }

    const { data: dbCard, error: tarotLookupError } = await supabase
      .from('tarot_cards')
      .select('id')
      .eq('name', card.name)
      .maybeSingle();

    if (tarotLookupError) {
      console.error('tarot_cards lookup error:', tarotLookupError.message);
    }
    if (!dbCard) {
      console.warn(
        'tarot_cards 테이블에서 카드를 찾지 못했습니다. 시드 데이터가 반영되었는지 확인하세요.'
      );
    }

    const { error: cardInsertError } = await supabase.from('reading_cards').insert({
      reading_id: readingRow.id as string,
      card_id: dbCard?.id ?? null,
      position: 1,
      orientation,
    });

    if (cardInsertError) {
      console.error('daily reading_cards insert error:', cardInsertError.message);
      return errorResponse('오늘의 카드를 저장하는 중 오류가 발생했습니다.', 500);
    }

    // 5. 응답 반환
    const responseBody: DailyCardResponseBody = {
      card,
      orientation,
      message,
      date: dateStr,
    };

    return NextResponse.json(responseBody, { status: 201 });
  } catch (err) {
    console.error('GET /api/daily-card error:', err instanceof Error ? err.message : err);
    return errorResponse('서버 오류가 발생했습니다.', 500);
  }
}
