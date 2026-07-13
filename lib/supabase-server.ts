import { createServerClient, type CookieOptions } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';

const rawSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const rawSupabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!rawSupabaseUrl || !rawSupabaseAnonKey) {
  throw new Error(
    'Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY'
  );
}

const supabaseUrl: string = rawSupabaseUrl;
const supabaseAnonKey: string = rawSupabaseAnonKey;

// Route Handler / Server Action 전용: 요청 쿠키에서 세션을 읽어 로그인한 유저로서
// RLS가 적용된 채로 Supabase에 접근하는 클라이언트. (next/headers를 import하므로
// 반드시 서버에서만 사용 — 클라이언트 컴포넌트에서는 lib/supabase.ts의 supabase를 사용할 것)
export function getRouteHandlerSupabase(): SupabaseClient {
  const cookieStore = cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });
}
