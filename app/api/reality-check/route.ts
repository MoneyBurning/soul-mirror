import { NextRequest, NextResponse } from 'next/server';
import { getRouteHandlerSupabase } from '@/lib/supabase-server';
import { RealityCheckSchema } from '@/lib/validators';
import { errorResponse } from '@/lib/api-response';

interface RealityCheckResponseBody {
  success: true;
  checkId: string;
}

interface PendingCheck {
  readingId: string;
  question: string;
  createdAt: string;
  dueDate: string;
}

interface PendingChecksResponseBody {
  pendingChecks: PendingCheck[];
}

export async function POST(request: NextRequest) {
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

    // 2. Zod로 입력값 검증
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse('잘못된 요청 본문입니다.', 400);
    }

    const parsed = RealityCheckSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues.map((issue) => issue.message).join(' '), 400);
    }

    const { readingId, score, memo } = parsed.data;

    // 3. 해당 readingId가 본인 것인지 확인
    const { data: reading, error: readingError } = await supabase
      .from('readings')
      .select('id')
      .eq('id', readingId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (readingError) {
      console.error('reading lookup error:', readingError.message);
      return errorResponse('리딩 조회 중 오류가 발생했습니다.', 500);
    }
    if (!reading) {
      return errorResponse('리딩을 찾을 수 없습니다.', 404);
    }

    // 4. 이미 reality_check가 있는지 확인 (중복 방지)
    const { data: existingCheck, error: existingCheckError } = await supabase
      .from('reality_checks')
      .select('id')
      .eq('reading_id', readingId)
      .maybeSingle();

    if (existingCheckError) {
      console.error('reality_check lookup error:', existingCheckError.message);
      return errorResponse('리얼리티 체크 조회 중 오류가 발생했습니다.', 500);
    }
    if (existingCheck) {
      return errorResponse('이미 리얼리티 체크를 완료한 리딩입니다.', 409);
    }

    // 5. reality_checks 테이블에 저장
    const { data: checkRow, error: insertError } = await supabase
      .from('reality_checks')
      .insert({
        reading_id: readingId,
        user_id: user.id,
        score,
        memo: memo ?? null,
      })
      .select('id')
      .single();

    if (insertError || !checkRow) {
      console.error('reality_checks insert error:', insertError?.message);
      return errorResponse('리얼리티 체크 저장 중 오류가 발생했습니다.', 500);
    }

    // 6. 성공 응답 반환
    const responseBody: RealityCheckResponseBody = {
      success: true,
      checkId: checkRow.id as string,
    };

    return NextResponse.json(responseBody, { status: 201 });
  } catch (err) {
    console.error('POST /api/reality-check error:', err instanceof Error ? err.message : err);
    return errorResponse('서버 오류가 발생했습니다.', 500);
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getRouteHandlerSupabase();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return errorResponse('로그인이 필요합니다.', 401);
    }

    const due = request.nextUrl.searchParams.get('due');
    if (due !== 'true') {
      return errorResponse('due=true 쿼리 파라미터가 필요합니다.', 400);
    }

    // 이미 체크된 reading_id 목록 (제외용)
    const { data: checkedRows, error: checkedError } = await supabase
      .from('reality_checks')
      .select('reading_id')
      .eq('user_id', user.id);

    if (checkedError) {
      console.error('reality_checks lookup error:', checkedError.message);
      return errorResponse('리얼리티 체크 조회 중 오류가 발생했습니다.', 500);
    }

    const checkedIds = (checkedRows ?? []).map((row: { reading_id: string }) => row.reading_id);
    // 체크된 reading이 없을 때도 단일 쿼리 형태를 유지하기 위해, 실제로 존재할 수 없는
    // 더미 UUID를 넣어 "제외할 게 없음"을 표현 (조건부로 .not()을 붙였다 뗐다 하면
    // supabase-js 필터 빌더 제네릭이 과도하게 깊어져 TS2589가 발생함)
    const excludeIds = checkedIds.length > 0 ? checkedIds : ['00000000-0000-0000-0000-000000000000'];

    const { data: pendingRows, error: pendingError } = await supabase
      .from('readings')
      .select('id, question, created_at, reality_check_due')
      .eq('user_id', user.id)
      .not('reality_check_due', 'is', null)
      .lt('reality_check_due', new Date().toISOString())
      .not('id', 'in', `(${excludeIds.join(',')})`)
      .order('reality_check_due', { ascending: true })
      .limit(5);

    if (pendingError) {
      console.error('pending readings lookup error:', pendingError.message);
      return errorResponse('대기 중인 리얼리티 체크 조회 중 오류가 발생했습니다.', 500);
    }

    const pendingChecks: PendingCheck[] = (pendingRows ?? []).map(
      (row: {
        id: string;
        question: string;
        created_at: string;
        reality_check_due: string;
      }) => ({
        readingId: row.id,
        question: row.question,
        createdAt: row.created_at,
        dueDate: row.reality_check_due,
      })
    );

    const responseBody: PendingChecksResponseBody = { pendingChecks };

    return NextResponse.json(responseBody, { status: 200 });
  } catch (err) {
    console.error('GET /api/reality-check error:', err instanceof Error ? err.message : err);
    return errorResponse('서버 오류가 발생했습니다.', 500);
  }
}
