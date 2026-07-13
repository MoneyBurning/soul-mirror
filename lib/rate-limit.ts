import { getSupabaseAdmin } from './supabase';

export const FREE_DAILY_READING_LIMIT = 3;
export const PREMIUM_DAILY_READING_LIMIT = 10;

// profiles 테이블에 is_premium 컬럼이 아직 없어 일단 항상 false로 처리.
// 컬럼이 추가되면 아래 주석 처리된 조회로 교체하면 된다.
export async function isPremiumUser(userId: string): Promise<boolean> {
  void userId;
  // const admin = getSupabaseAdmin();
  // const { data, error } = await admin
  //   .from('profiles')
  //   .select('is_premium')
  //   .eq('id', userId)
  //   .maybeSingle();
  // if (error) {
  //   console.error('isPremiumUser error:', error.message);
  //   return false;
  // }
  // return data?.is_premium ?? false;
  return false;
}

// windowMinutes 단위로 현재 시각이 속한 고정 버킷의 시작 시각(ISO)을 계산
function getWindowStart(windowMinutes: number): string {
  const windowMs = windowMinutes * 60 * 1000;
  const bucketStartMs = Math.floor(Date.now() / windowMs) * windowMs;
  return new Date(bucketStartMs).toISOString();
}

// 지정된 action을 windowMinutes 동안 limit 횟수까지만 허용.
// Supabase RPC(increment_rate_limit)를 통해 증가와 조회를 원자적으로 처리해
// 서버리스 환경의 동시 요청에서도 레이스 컨디션 없이 카운트됨.
export async function checkRateLimit(
  userId: string,
  action: string,
  limit: number,
  windowMinutes: number
): Promise<boolean> {
  try {
    const admin = getSupabaseAdmin();
    const windowStart = getWindowStart(windowMinutes);

    const { data, error } = await admin.rpc('increment_rate_limit', {
      p_user_id: userId,
      p_action: action,
      p_window_start: windowStart,
    });

    if (error) throw error;

    const count = data as number;
    return count <= limit;
  } catch (err) {
    console.error('checkRateLimit error:', err instanceof Error ? err.message : err);
    // DB 오류 시 fail-closed: AI API 비용 남용을 막기 위해 초과로 간주
    return false;
  }
}

// 오늘(UTC 기준) 생성된 리딩 수
export async function getDailyReadingCount(userId: string): Promise<number> {
  const admin = getSupabaseAdmin();
  const now = new Date();
  const startOfDayUTC = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  ).toISOString();

  const { count, error } = await admin
    .from('readings')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', startOfDayUTC);

  if (error) throw error;

  return count ?? 0;
}

// 오늘(UTC 기준) 생성된 리딩 수가 하루 한도(limit) 미만인지 확인.
// limit은 호출부에서 무료/프리미엄 여부에 따라 결정해 전달한다.
export async function checkDailyReadingLimit(userId: string, limit: number): Promise<boolean> {
  try {
    const count = await getDailyReadingCount(userId);
    return count < limit;
  } catch (err) {
    console.error('checkDailyReadingLimit error:', err instanceof Error ? err.message : err);
    // DB 오류 시 fail-closed: 초과로 간주
    return false;
  }
}
