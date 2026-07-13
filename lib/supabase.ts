import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/auth-helpers-nextjs';
import type { Profile } from '@/types';

const rawSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const rawSupabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!rawSupabaseUrl || !rawSupabaseAnonKey) {
  throw new Error(
    'Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY'
  );
}

const supabaseUrl: string = rawSupabaseUrl;
const supabaseAnonKey: string = rawSupabaseAnonKey;

// 클라이언트 사이드용 (브라우저에서 사용, RLS 적용됨)
// 세션을 쿠키에 저장해 app/api/**/route.ts의 getRouteHandlerSupabase()(서버, 쿠키 기반)와
// 로그인 상태를 공유한다. 여기서 createClient(로컬스토리지 저장)를 쓰면 브라우저에서는
// 로그인된 것처럼 보여도 서버 라우트는 쿠키가 없어 항상 401을 반환하게 된다.
export const supabase: SupabaseClient = createBrowserClient(supabaseUrl, supabaseAnonKey);

// 서버 사이드 전용 (RLS 우회, service role key는 절대 클라이언트에 노출 금지)
let _supabaseAdmin: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (typeof window !== 'undefined') {
    throw new Error('supabaseAdmin은 서버에서만 사용할 수 있습니다.');
  }

  if (_supabaseAdmin) return _supabaseAdmin;

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error('Missing Supabase env var: SUPABASE_SERVICE_ROLE_KEY');
  }

  _supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return _supabaseAdmin;
}

// Google 소셜 로그인
export async function signInWithGoogle(): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });

    if (error) throw error;
    return { error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : '구글 로그인 중 오류가 발생했습니다.';
    console.error('signInWithGoogle error:', message);
    return { error: message };
  }
}

// 로그아웃
export async function signOut(): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : '로그아웃 중 오류가 발생했습니다.';
    console.error('signOut error:', message);
    return { error: message };
  }
}

// 현재 로그인된 유저 가져오기
export async function getCurrentUser(): Promise<User | null> {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return data.user;
  } catch (err) {
    console.error('getCurrentUser error:', err instanceof Error ? err.message : err);
    return null;
  }
}

// 프로필 조회
export async function getProfile(userId: string): Promise<Profile | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data as Profile;
  } catch (err) {
    console.error('getProfile error:', err instanceof Error ? err.message : err);
    return null;
  }
}

// 프로필 생성/업데이트
export async function upsertProfile(
  profile: Partial<Profile> & { id: string }
): Promise<Profile | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .upsert(profile, { onConflict: 'id' })
      .select()
      .single();

    if (error) throw error;
    return data as Profile;
  } catch (err) {
    console.error('upsertProfile error:', err instanceof Error ? err.message : err);
    return null;
  }
}
