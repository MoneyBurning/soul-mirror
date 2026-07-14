-- ============================================================
-- Soul Mirror — Supabase Schema
-- Supabase SQL Editor에서 순서대로 실행
-- ============================================================

create extension if not exists pgcrypto;

-- ============================================================
-- 1. profiles
-- ============================================================
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text,
  avatar_type text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 2. tarot_cards (78장 마스터 데이터)
-- ============================================================
create table if not exists tarot_cards (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  kor_name text,
  arcana text not null check (arcana in ('major', 'minor')),
  suit text check (suit in ('wands', 'cups', 'swords', 'pentacles')),
  number integer,
  normal_meaning text not null,
  reverse_meaning text not null,
  keywords text[] not null default '{}',
  image_url text,
  created_at timestamptz not null default now()
);

-- 한국어 카드 의미/키워드 (기존에 생성된 테이블에도 안전하게 컬럼 추가)
alter table tarot_cards add column if not exists kor_normal_meaning text;
alter table tarot_cards add column if not exists kor_reverse_meaning text;
alter table tarot_cards add column if not exists kor_keywords text[] not null default '{}';

-- ============================================================
-- 3. readings
-- ============================================================
create table if not exists readings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  question text not null,
  category text check (category in (
    'love', 'career', 'money', 'health',
    'family', 'friendship', 'study', 'general'
  )),
  spread_type text check (spread_type in (
    'daily', 'one_card', 'past_present_future',
    'love', 'career', 'decision', 'full_reading'
  )),
  ai_response text not null,
  action_tip text,
  emotion text check (emotion in ('happy', 'neutral', 'sad', 'angry', 'anxious')),
  reality_check_due timestamptz,
  created_at timestamptz not null default now()
);

-- 스프레드 정리(원카드/풀 리딩 추가, 켈틱크로스 제거)로 허용값이 바뀌어
-- 기존에 생성된 테이블에도 반영되도록 제약을 재생성
alter table readings drop constraint if exists readings_spread_type_check;
alter table readings add constraint readings_spread_type_check check (spread_type in (
  'daily', 'one_card', 'past_present_future',
  'love', 'career', 'decision', 'full_reading'
));

-- ============================================================
-- 4. reading_cards
-- ============================================================
create table if not exists reading_cards (
  id uuid primary key default gen_random_uuid(),
  reading_id uuid references readings(id) on delete cascade,
  card_id uuid references tarot_cards(id),
  position integer not null,
  orientation text check (orientation in ('normal', 'reverse')),
  unique (reading_id, position)
);

-- ============================================================
-- 5. reality_checks
-- ============================================================
create table if not exists reality_checks (
  id uuid primary key default gen_random_uuid(),
  reading_id uuid references readings(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  score integer check (score between 1 and 5),
  memo text,
  checked_at timestamptz not null default now()
);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table profiles enable row level security;
alter table tarot_cards enable row level security;
alter table readings enable row level security;
alter table reading_cards enable row level security;
alter table reality_checks enable row level security;

-- profiles: 본인만 읽기/쓰기
drop policy if exists "profiles_select_own" on profiles;
create policy "profiles_select_own" on profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on profiles;
create policy "profiles_insert_own" on profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on profiles;
create policy "profiles_update_own" on profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- ============================================================
-- auth.users 신규 가입 시 profiles 행 자동 생성
-- (Google OAuth 로그인만으로는 profiles가 생기지 않아서, 유저가 /profile을
--  직접 방문해 저장하기 전까지 readings/reality_checks/rate_limits의
--  "user_id references profiles(id)" 외래키 제약이 위반되어 저장이 실패하던 버그를 수정)
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, nickname, avatar_type)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture')
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 이미 가입했지만 profiles가 없는 기존 유저를 위한 1회성 백필
insert into public.profiles (id)
select u.id
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;

-- readings: 본인만 읽기/쓰기
drop policy if exists "readings_select_own" on readings;
create policy "readings_select_own" on readings
  for select using (auth.uid() = user_id);

drop policy if exists "readings_insert_own" on readings;
create policy "readings_insert_own" on readings
  for insert with check (auth.uid() = user_id);

drop policy if exists "readings_update_own" on readings;
create policy "readings_update_own" on readings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- reading_cards: 본인 readings의 카드만 읽기/쓰기
drop policy if exists "reading_cards_select_own" on reading_cards;
create policy "reading_cards_select_own" on reading_cards
  for select using (
    exists (
      select 1 from readings
      where readings.id = reading_cards.reading_id
        and readings.user_id = auth.uid()
    )
  );

drop policy if exists "reading_cards_insert_own" on reading_cards;
create policy "reading_cards_insert_own" on reading_cards
  for insert with check (
    exists (
      select 1 from readings
      where readings.id = reading_cards.reading_id
        and readings.user_id = auth.uid()
    )
  );

drop policy if exists "reading_cards_update_own" on reading_cards;
create policy "reading_cards_update_own" on reading_cards
  for update using (
    exists (
      select 1 from readings
      where readings.id = reading_cards.reading_id
        and readings.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from readings
      where readings.id = reading_cards.reading_id
        and readings.user_id = auth.uid()
    )
  );

-- reality_checks: 본인만 읽기/쓰기
drop policy if exists "reality_checks_select_own" on reality_checks;
create policy "reality_checks_select_own" on reality_checks
  for select using (auth.uid() = user_id);

drop policy if exists "reality_checks_insert_own" on reality_checks;
create policy "reality_checks_insert_own" on reality_checks
  for insert with check (auth.uid() = user_id);

drop policy if exists "reality_checks_update_own" on reality_checks;
create policy "reality_checks_update_own" on reality_checks
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- tarot_cards: 모든 로그인 유저 읽기 가능 (쓰기는 service_role만 — service_role은 RLS를 우회하므로 별도 정책 불필요)
drop policy if exists "tarot_cards_select_authenticated" on tarot_cards;
create policy "tarot_cards_select_authenticated" on tarot_cards
  for select
  to authenticated
  using (true);

-- ============================================================
-- reality_check_due 자동 계산 트리거
-- ============================================================
create or replace function set_reality_check_due()
returns trigger as $$
begin
  if new.spread_type = 'daily' then
    new.reality_check_due := new.created_at + interval '1 day';
  elsif new.category in ('love', 'health') then
    new.reality_check_due := new.created_at + interval '14 days';
  elsif new.category in ('career', 'money') then
    new.reality_check_due := new.created_at + interval '30 days';
  else
    new.reality_check_due := new.created_at + interval '7 days';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_set_reality_check_due on readings;
create trigger trg_set_reality_check_due
  before insert on readings
  for each row
  execute function set_reality_check_due();

-- ============================================================
-- 6. rate_limits (Vercel Serverless는 인스턴스 간 메모리 공유가 안 되므로
--    Map() 대신 Supabase에 카운트를 저장해 고정 윈도우 방식으로 제한)
-- ============================================================
create table if not exists rate_limits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  action text not null,
  count integer not null default 1,
  window_start timestamptz not null default now(),
  unique (user_id, action, window_start)
);

alter table rate_limits enable row level security;
-- 정책을 추가하지 않음: service_role(admin 클라이언트)만 RLS를 우회해 접근 가능,
-- anon/authenticated는 전부 차단됨 (rate_limits는 서버에서만 다룸)

-- user_id + action + window_start(버킷) 조합을 원자적으로 upsert & 증가.
-- INSERT ... ON CONFLICT DO UPDATE는 Postgres에서 행 단위로 원자적으로 실행되므로
-- 서버리스 동시 요청에도 카운트 유실/레이스 컨디션이 발생하지 않음.
create or replace function increment_rate_limit(
  p_user_id uuid,
  p_action text,
  p_window_start timestamptz
)
returns integer as $$
declare
  new_count integer;
begin
  insert into rate_limits (user_id, action, window_start, count)
  values (p_user_id, p_action, p_window_start, 1)
  on conflict (user_id, action, window_start)
  do update set count = rate_limits.count + 1
  returning count into new_count;

  return new_count;
end;
$$ language plpgsql;
