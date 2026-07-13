# Soul Mirror AI — Claude Code 마스터 프롬프트
> 이 파일을 Claude Code에 복붙해서 단계별로 실행하세요.
> 각 STEP을 순서대로 진행하세요. 절대 건너뛰지 마세요.

---

# ━━━━━━━━━━━━━━━━━━━━━━━━
# STEP 0 — 프로젝트 초기 세팅
# ━━━━━━━━━━━━━━━━━━━━━━━━

```
Next.js 14 프로젝트를 생성해줘.

조건:
- 프로젝트명: soul-mirror
- TypeScript 사용
- Tailwind CSS 사용
- App Router 사용 (pages 아님)
- src 폴더 사용 안 함
- ESLint 포함

생성 후 아래 패키지도 설치해줘:
- groq-sdk
- @supabase/supabase-js
- @supabase/auth-helpers-nextjs
- framer-motion
- zod
- next-i18next
- react-i18next

설치 완료 후 폴더 구조를 보여줘.
```

---

# ━━━━━━━━━━━━━━━━━━━━━━━━
# STEP 1 — 폴더 구조 생성
# ━━━━━━━━━━━━━━━━━━━━━━━━

```
soul-mirror 프로젝트에 아래 폴더와 빈 파일들을 전부 생성해줘.

app/
  page.tsx
  layout.tsx
  dashboard/
    page.tsx
  reading/
    page.tsx
  timeline/
    page.tsx
  api/
    reading/
      route.ts
    daily-card/
      route.ts
    reality-check/
      route.ts

components/
  TarotCard.tsx
  Timeline.tsx
  EmotionPicker.tsx
  DailyCard.tsx
  RealityCheck.tsx
  CategorySelector.tsx

lib/
  groq.ts
  supabase.ts
  tarot-data.ts
  rate-limit.ts
  validators.ts

types/
  index.ts

locales/
  en/
    common.json
  ko/
    common.json

각 파일은 빈 파일로 생성해도 됨.
생성 완료 후 트리 구조로 보여줘.
```

---

# ━━━━━━━━━━━━━━━━━━━━━━━━
# STEP 2 — 환경변수 파일 생성
# ━━━━━━━━━━━━━━━━━━━━━━━━

```
프로젝트 루트에 아래 두 파일을 생성해줘.

파일 1: .env.local
내용:
GROQ_API_KEY=여기에_Groq_키_입력
NEXT_PUBLIC_SUPABASE_URL=여기에_Supabase_URL_입력
NEXT_PUBLIC_SUPABASE_ANON_KEY=여기에_Supabase_Anon_Key_입력
SUPABASE_SERVICE_ROLE_KEY=여기에_Service_Role_Key_입력
NEXTAUTH_SECRET=여기에_32자_랜덤_문자열_입력
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=여기에_Google_Client_ID_입력
GOOGLE_CLIENT_SECRET=여기에_Google_Client_Secret_입력

파일 2: .gitignore 에 아래 줄 추가
.env.local
.env*.local

완료 후 확인해줘.
```

---

# ━━━━━━━━━━━━━━━━━━━━━━━━
# STEP 3 — TypeScript 타입 정의
# ━━━━━━━━━━━━━━━━━━━━━━━━

```
types/index.ts 파일을 아래 내용으로 작성해줘.

포함할 타입:
1. TarotCard 타입
   - id: string
   - name: string
   - korName: string
   - arcana: 'major' | 'minor'
   - suit?: 'wands' | 'cups' | 'swords' | 'pentacles'
   - number?: number
   - normalMeaning: string
   - reverseMeaning: string
   - keywords: string[]
   - imageUrl?: string

2. ReadingCard 타입
   - position: number
   - card: TarotCard
   - orientation: 'normal' | 'reverse'

3. Reading 타입
   - id: string
   - userId: string
   - question: string
   - category: Category 타입 (아래 참고)
   - spreadType: SpreadType 타입 (아래 참고)
   - cards: ReadingCard[]
   - aiResponse: string
   - actionTip: string
   - emotion: Emotion 타입 (아래 참고)
   - createdAt: string

4. Category 타입 (union)
   'love' | 'career' | 'money' | 'health' |
   'family' | 'friendship' | 'study' | 'general'

5. SpreadType 타입 (union)
   'daily' | 'past_present_future' |
   'love' | 'career' | 'decision' | 'celtic_cross'

6. Emotion 타입 (union)
   'happy' | 'neutral' | 'sad' | 'angry' | 'anxious'

7. RealityCheck 타입
   - id: string
   - readingId: string
   - score: 1 | 2 | 3 | 4 | 5
   - memo?: string
   - checkedAt: string

8. Profile 타입
   - id: string
   - nickname?: string
   - avatarType?: string
   - createdAt: string

전부 export 해줘.
```

---

# ━━━━━━━━━━━━━━━━━━━━━━━━
# STEP 4 — Supabase DB 테이블 SQL
# ━━━━━━━━━━━━━━━━━━━━━━━━

```
Supabase SQL Editor에 실행할 SQL을 작성해줘.
파일명: supabase-schema.sql 로 프로젝트 루트에 저장해줘.

포함할 테이블 (순서대로):

1. profiles 테이블
   - id: UUID (auth.users.id 참조, CASCADE)
   - nickname: TEXT
   - avatar_type: TEXT
   - created_at: TIMESTAMPTZ DEFAULT NOW()
   - PRIMARY KEY: id

2. tarot_cards 테이블 (78장 마스터 데이터)
   - id: UUID PRIMARY KEY DEFAULT gen_random_uuid()
   - name: TEXT UNIQUE NOT NULL (영문 카드명)
   - kor_name: TEXT (한국어 카드명)
   - arcana: TEXT CHECK IN ('major','minor')
   - suit: TEXT CHECK IN ('wands','cups','swords','pentacles') NULLABLE
   - number: INTEGER NULLABLE
   - normal_meaning: TEXT NOT NULL
   - reverse_meaning: TEXT NOT NULL
   - keywords: TEXT[] DEFAULT '{}'
   - image_url: TEXT NULLABLE
   - created_at: TIMESTAMPTZ DEFAULT NOW()

3. readings 테이블
   - id: UUID PRIMARY KEY DEFAULT gen_random_uuid()
   - user_id: UUID REFERENCES profiles(id) ON DELETE CASCADE
   - question: TEXT NOT NULL
   - category: TEXT CHECK IN ('love','career','money','health','family','friendship','study','general')
   - spread_type: TEXT CHECK IN ('daily','past_present_future','love','career','decision','celtic_cross')
   - ai_response: TEXT NOT NULL
   - action_tip: TEXT
   - emotion: TEXT CHECK IN ('happy','neutral','sad','angry','anxious')
   - reality_check_due: TIMESTAMPTZ (카테고리별 자동 계산)
   - created_at: TIMESTAMPTZ DEFAULT NOW()

4. reading_cards 테이블
   - id: UUID PRIMARY KEY DEFAULT gen_random_uuid()
   - reading_id: UUID REFERENCES readings(id) ON DELETE CASCADE
   - card_id: UUID REFERENCES tarot_cards(id)
   - position: INTEGER NOT NULL
   - orientation: TEXT CHECK IN ('normal','reverse')
   - UNIQUE(reading_id, position)

5. reality_checks 테이블
   - id: UUID PRIMARY KEY DEFAULT gen_random_uuid()
   - reading_id: UUID REFERENCES readings(id) ON DELETE CASCADE
   - user_id: UUID REFERENCES profiles(id) ON DELETE CASCADE
   - score: INTEGER CHECK BETWEEN 1 AND 5
   - memo: TEXT
   - checked_at: TIMESTAMPTZ DEFAULT NOW()

그 다음 RLS 설정:
- 모든 테이블에 ROW LEVEL SECURITY 활성화
- profiles: 본인만 읽기/쓰기
- readings: 본인만 읽기/쓰기
- reading_cards: 본인 readings의 카드만 읽기/쓰기
- reality_checks: 본인만 읽기/쓰기
- tarot_cards: 모든 로그인 유저 읽기 가능 (쓰기는 서비스롤만)

마지막으로 reality_check_due 자동 계산 트리거:
- love: +14일
- career: +30일
- money: +30일
- health: +14일
- daily: +1일
- 나머지: +7일

SQL 전체를 완성해줘.
```

---

# ━━━━━━━━━━━━━━━━━━━━━━━━
# STEP 5 — Supabase 클라이언트 설정
# ━━━━━━━━━━━━━━━━━━━━━━━━

```
lib/supabase.ts 파일을 작성해줘.

포함할 내용:
1. 클라이언트 사이드용 supabase 인스턴스 생성
   (NEXT_PUBLIC 환경변수 사용)

2. 서버 사이드용 supabase admin 인스턴스 생성
   (SERVICE_ROLE_KEY 사용, 서버에서만 사용)

3. Google 소셜 로그인 함수: signInWithGoogle()
   - provider: 'google'
   - redirectTo: /dashboard

4. 로그아웃 함수: signOut()

5. 현재 유저 가져오기: getCurrentUser()
   - auth.getUser() 사용

6. 프로필 가져오기: getProfile(userId: string)
   - profiles 테이블에서 조회

7. 프로필 생성/업데이트: upsertProfile(profile: Partial<Profile>)

TypeScript 타입 전부 적용해줘.
에러 처리도 포함해줘.
```

---

# ━━━━━━━━━━━━━━━━━━━━━━━━
# STEP 6 — Rate Limit 설정
# ━━━━━━━━━━━━━━━━━━━━━━━━

```
lib/rate-limit.ts 파일을 작성해줘.

Vercel Serverless 환경에서는 Map()이 작동 안 하므로
Supabase 기반으로 구현해줘.

구현할 함수:

1. checkRateLimit(userId: string, action: string, limit: number, windowMinutes: number)
   - rate_limits 테이블에서 해당 유저의 action 카운트 조회
   - windowMinutes 이내 limit 초과 시 false 반환
   - 초과하지 않으면 카운트 증가 후 true 반환

2. checkDailyReadingLimit(userId: string)
   - readings 테이블에서 오늘 날짜 리딩 수 조회
   - 10회 미만이면 true, 초과면 false 반환

Supabase에 rate_limits 테이블 SQL도 같이 작성해줘:
- id: UUID
- user_id: UUID
- action: TEXT
- count: INTEGER DEFAULT 1
- window_start: TIMESTAMPTZ DEFAULT NOW()
- UNIQUE(user_id, action, window_start의 시간 버킷)

에러 처리 포함해줘.
```

---

# ━━━━━━━━━━━━━━━━━━━━━━━━
# STEP 7 — 입력값 검증 (Zod)
# ━━━━━━━━━━━━━━━━━━━━━━━━

```
lib/validators.ts 파일을 작성해줘.

Zod를 사용해서 아래 스키마를 전부 작성해줘:

1. ReadingRequestSchema
   - question: string, 최소 2자, 최대 200자
   - category: Category 타입 enum
   - spreadType: SpreadType 타입 enum

2. RealityCheckSchema
   - readingId: string UUID 형식
   - score: number 1~5 사이 정수
   - memo: string 최대 100자 (선택)

3. EmotionSchema
   - emotion: Emotion 타입 enum

4. ProfileUpdateSchema
   - nickname: string 최소 1자 최대 20자 (선택)
   - avatarType: string (선택)

각 스키마에서 타입도 추출해서 export 해줘.
예: export type ReadingRequest = z.infer<typeof ReadingRequestSchema>
```

---

# ━━━━━━━━━━━━━━━━━━━━━━━━
# STEP 8 — Groq AI 호출 설정
# ━━━━━━━━━━━━━━━━━━━━━━━━

```
lib/groq.ts 파일을 작성해줘.

사용 모델: llama-3.1-8b-instant
max_tokens: 400

시스템 프롬프트 (SYSTEM_PROMPT 상수로 정의):
"""
You are a professional tarot reader specializing in psychological insight.

Rules you must follow:
- Tarot is a tool for self-reflection and entertainment only
- Never make definitive statements about the future
- Provide psychological insights and multiple perspectives
- Do not cause unnecessary anxiety or fear
- Never give medical, legal, or financial advice
- Do not criticize or judge the user's question
- Always use respectful, warm language
- Remove unnecessary introductions, get to the point
- Never repeat card names more than once
- Always end with one specific, actionable advice

Response format (in English):
1. Card interpretation (under 80 words)
2. Psychological insight (under 60 words)
3. Today's action: [one specific action] (under 30 words)

Total under 170 words.
"""

구현할 함수:

1. generateReading(params: {
     question: string,
     category: string,
     spreadType: string,
     cards: Array<{name: string, orientation: 'normal'|'reverse', position: number}>
   })
   - 카드 정보는 이름과 방향만 전달 (의미 전달 안 함)
   - AI 호출 1회만
   - 반환: { response: string, actionTip: string }
   - actionTip은 응답에서 "Today's action:" 이후 텍스트 파싱

2. generateDailyCard(params: {
     cardName: string,
     orientation: 'normal'|'reverse'
   })
   - 짧은 오늘의 메시지 생성 (50 words 이내)
   - 반환: string

에러 처리:
- 429 에러 (한도 초과): "AI server is busy. Please try again later." 반환
- 기타 에러: throw

TypeScript 타입 전부 적용해줘.
```

---

# ━━━━━━━━━━━━━━━━━━━━━━━━
# STEP 9 — 타로 카드 78장 데이터
# ━━━━━━━━━━━━━━━━━━━━━━━━

```
lib/tarot-data.ts 파일을 작성해줘.

78장 타로 카드 데이터를 TarotCard[] 배열로 작성해줘.

포함할 카드:
- 메이저 아르카나 22장 (The Fool ~ The World)
- 마이너 아르카나 56장
  - Wands 14장 (Ace~10, Page, Knight, Queen, King)
  - Cups 14장
  - Swords 14장
  - Pentacles 14장

각 카드에 포함할 정보:
- id: "major-0" 형식 또는 "wands-1" 형식
- name: 영문 카드명
- korName: 한국어 카드명
- arcana: 'major' 또는 'minor'
- suit: 마이너만 해당
- number: 숫자
- normalMeaning: 정방향 의미 (영문, 한 문장)
- reverseMeaning: 역방향 의미 (영문, 한 문장)
- keywords: 키워드 3개 배열 (영문)

export const TAROT_CARDS: TarotCard[] 로 export 해줘.

유틸 함수도 추가해줘:
- getCardByName(name: string): TarotCard | undefined
- getRandomCards(count: number): TarotCard[]
- getMajorArcana(): TarotCard[]
- getMinorArcana(suit?: string): TarotCard[]
```

---

# ━━━━━━━━━━━━━━━━━━━━━━━━
# STEP 10 — Reading API Route
# ━━━━━━━━━━━━━━━━━━━━━━━━

```
app/api/reading/route.ts 파일을 작성해줘.

POST 요청 처리:

순서대로:
1. Rate Limit 체크 (분당 10회 초과 시 429 반환)
2. 로그인 확인 (미로그인 시 401 반환)
3. Zod로 입력값 검증 (실패 시 400 반환)
4. 오늘 리딩 횟수 확인 (10회 초과 시 429 반환)
5. 랜덤 카드 뽑기
   - spreadType에 따라 카드 수 결정
     daily: 1장
     past_present_future: 3장
     love: 5장
     career: 5장
     decision: 3장
     celtic_cross: 10장 (프리미엄, 추후)
6. Groq AI 호출 (generateReading 함수 사용)
7. readings 테이블에 저장
8. reading_cards 테이블에 카드 저장
9. 성공 응답 반환

응답 형식:
{
  readingId: string,
  cards: ReadingCard[],
  aiResponse: string,
  actionTip: string
}

에러는 전부 적절한 HTTP 상태코드와 메시지로 반환.
TypeScript 타입 전부 적용.
```

---

# ━━━━━━━━━━━━━━━━━━━━━━━━
# STEP 11 — Daily Card API Route
# ━━━━━━━━━━━━━━━━━━━━━━━━

```
app/api/daily-card/route.ts 파일을 작성해줘.

GET 요청 처리:

1. 로그인 확인
2. 오늘 날짜로 readings 테이블에서
   spread_type = 'daily' 인 레코드 조회
3. 이미 있으면 기존 데이터 반환
4. 없으면:
   - 랜덤 카드 1장 뽑기
   - generateDailyCard() 호출
   - readings 테이블에 저장
     (question: "Today's daily card",
      category: 'general',
      spread_type: 'daily')
   - reading_cards 테이블에 저장
5. 응답 반환

응답 형식:
{
  card: TarotCard,
  orientation: 'normal' | 'reverse',
  message: string,
  date: string
}
```

---

# ━━━━━━━━━━━━━━━━━━━━━━━━
# STEP 12 — Reality Check API Route
# ━━━━━━━━━━━━━━━━━━━━━━━━

```
app/api/reality-check/route.ts 파일을 작성해줘.

POST 요청 처리:

1. 로그인 확인
2. Zod로 입력값 검증 (readingId, score, memo)
3. 해당 readingId가 본인 것인지 확인
4. 이미 reality_check가 있는지 확인 (중복 방지)
5. reality_checks 테이블에 저장
6. 성공 응답 반환

GET 요청 처리:
- 쿼리 파라미터: ?due=true 이면
  reality_check_due가 지났지만 체크 안 한 리딩 목록 반환
- 최대 5개까지만 반환

응답 형식 (POST):
{ success: true, checkId: string }

응답 형식 (GET):
{ pendingChecks: Array<{readingId, question, createdAt, dueDate}> }
```

---

# ━━━━━━━━━━━━━━━━━━━━━━━━
# STEP 13 — TarotCard 컴포넌트
# ━━━━━━━━━━━━━━━━━━━━━━━━

```
components/TarotCard.tsx 파일을 작성해줘.

Framer Motion으로 카드 뒤집기 애니메이션 구현.

Props:
- card?: TarotCard (없으면 뒷면 표시)
- orientation?: 'normal' | 'reverse'
- isRevealed?: boolean (뒤집힘 여부)
- onReveal?: () => void (클릭 시 콜백)
- position?: number (1,2,3 등 위치 표시)
- size?: 'sm' | 'md' | 'lg'

구현:
1. isRevealed가 false면 카드 뒷면 (보라색 패턴)
2. isRevealed가 true면 카드 앞면
   - 카드 이름 (영문 + 한국어)
   - orientation이 'reverse'면 카드 180도 회전
   - 키워드 3개 표시
3. 클릭 시 Y축 회전 애니메이션으로 뒤집기
   (rotateY: 0 → 180 → 0)
4. 뒤집히는 중간 지점에서 앞면/뒷면 전환

Tailwind로 스타일링.
반응형 적용 (모바일 우선).
TypeScript 타입 적용.
```

---

# ━━━━━━━━━━━━━━━━━━━━━━━━
# STEP 14 — EmotionPicker 컴포넌트
# ━━━━━━━━━━━━━━━━━━━━━━━━

```
components/EmotionPicker.tsx 파일을 작성해줘.

Props:
- value?: Emotion
- onChange: (emotion: Emotion) => void

이모지와 Emotion 타입 매핑:
😊 → 'happy'
😐 → 'neutral'
😢 → 'sad'
😡 → 'angry'
😰 → 'anxious'

구현:
1. 이모지 5개를 가로로 나열
2. 선택된 이모지는 크게 표시 (scale 1.3)
3. 호버 시 살짝 커지는 애니메이션
4. 선택 시 Framer Motion으로 바운스 효과
5. 아래에 감정 텍스트 표시
   (happy → "Feeling Good" 등)

UI는 이모지만 사용자에게 보여주고
onChange로 넘기는 값은 반드시 Emotion 타입 문자열.
```

---

# ━━━━━━━━━━━━━━━━━━━━━━━━
# STEP 15 — CategorySelector 컴포넌트
# ━━━━━━━━━━━━━━━━━━━━━━━━

```
components/CategorySelector.tsx 파일을 작성해줘.

Props:
- value?: Category
- onChange: (category: Category) => void

카테고리와 이모지/텍스트 매핑:
love → ❤️ Love
career → 💼 Career
money → 💰 Money
health → 💚 Health
family → 👨‍👩‍👧 Family
friendship → 🤝 Friendship
study → 📚 Study
general → ✨ General

구현:
1. 그리드 레이아웃 (4열 또는 2열)
2. 선택된 카테고리는 강조 표시
3. Framer Motion으로 선택 시 살짝 눌리는 효과
4. 모바일에서 2열, 데스크탑에서 4열

TypeScript 타입 적용.
```

---

# ━━━━━━━━━━━━━━━━━━━━━━━━
# STEP 16 — Reading 페이지
# ━━━━━━━━━━━━━━━━━━━━━━━━

```
app/reading/page.tsx 파일을 작성해줘.

전체 리딩 UX 흐름을 구현해줘:

단계 1: 질문 입력
- textarea (최대 200자)
- 글자수 카운터 표시

단계 2: 카테고리 선택
- CategorySelector 컴포넌트 사용

단계 3: 스프레드 선택
- past_present_future: "Past · Present · Future (3 cards)"
- love: "Love Spread (5 cards)"
- career: "Career Spread (5 cards)"
- decision: "Decision Spread (3 cards)"

단계 4: 카드 뽑기
- TarotCard 컴포넌트 카드 수만큼 표시
- 전부 뒷면으로 시작
- "Draw Cards" 버튼 클릭 시
  POST /api/reading 호출
- 결과 받으면 카드를 순서대로 자동으로 뒤집기
  (0.5초 간격으로 순차적으로)

단계 5: AI 해석 표시
- 카드 전부 뒤집힌 후 AI 응답 표시
- 타이핑 효과로 텍스트 출력 (스트리밍처럼)
- 하단에 actionTip 강조 표시

단계 6: 감정 입력
- EmotionPicker 컴포넌트
- "Save Reading" 버튼

단계 7: 저장 완료
- "View in Timeline" 버튼
- "New Reading" 버튼

로딩 상태, 에러 상태 전부 처리.
로그인 안 되어 있으면 로그인 페이지로 리다이렉트.
오늘 10회 초과 시 안내 메시지 표시.
```

---

# ━━━━━━━━━━━━━━━━━━━━━━━━
# STEP 17 — Timeline 페이지
# ━━━━━━━━━━━━━━━━━━━━━━━━

```
app/timeline/page.tsx 파일을 작성해줘.

구현:
1. Supabase에서 본인 readings 전체 조회
   (최신순, 월별 그룹핑)

2. 월별 섹션으로 나누기
   예: "July 2026"

3. 각 리딩 카드 표시:
   - 날짜
   - 카테고리 이모지
   - 감정 이모지
   - AI 응답 첫 줄 (50자로 자르기)
   - 뽑은 카드 이름들 (작게)
   - Reality Check 상태:
     * 기한 전: "⏳ Check due in N days"
     * 기한 지남: "📝 Rate this reading" (클릭 가능)
     * 완료: "⭐ N/5"

4. Reality Check 클릭 시
   모달로 RealityCheck 컴포넌트 표시
   1~5점 선택 + 메모 입력
   POST /api/reality-check 호출

5. 무한 스크롤 또는 페이지네이션

로딩 상태, 빈 상태(리딩 없을 때) 처리.
```

---

# ━━━━━━━━━━━━━━━━━━━━━━━━
# STEP 18 — Dashboard 페이지
# ━━━━━━━━━━━━━━━━━━━━━━━━

```
app/dashboard/page.tsx 파일을 작성해줘.

구현할 섹션:

1. Daily Card 섹션 (최상단)
   - GET /api/daily-card 호출
   - DailyCard 컴포넌트로 표시
   - 오늘 날짜 표시

2. 이번 달 통계
   - 총 리딩 수
   - 긍정 카드 비율 (%)
   - Reality Check 평균 점수
   - 가장 많이 나온 카드 TOP 3

3. 오늘 남은 리딩 횟수
   - "7 readings remaining today"
   - 프로그레스 바

4. 빠른 리딩 버튼
   - "Start Reading" → /reading 이동

5. 최근 리딩 3개 미리보기
   - "View All" → /timeline 이동

6. Pending Reality Checks
   - GET /api/reality-check?due=true
   - 체크 안 한 리딩 목록 표시
   - 클릭 시 모달로 평가

Supabase에서 통계 데이터 쿼리:
- 이번 달 readings count
- reading_cards에서 카드별 count
- reality_checks 평균 score

로딩 스켈레톤 UI 적용.
```

---

# ━━━━━━━━━━━━━━━━━━━━━━━━
# STEP 19 — 메인 레이아웃 + 랜딩 페이지
# ━━━━━━━━━━━━━━━━━━━━━━━━

```
app/layout.tsx 와 app/page.tsx 를 작성해줘.

layout.tsx:
- Supabase Auth 세션 프로바이더 설정
- 네비게이션 바:
  * 로고: "Soul Mirror"
  * 로그인 상태면: Dashboard, Reading, Timeline, 로그아웃
  * 비로그인 상태면: "Get Started" 버튼만
- 모바일 하단 네비게이션 바 (로그인 상태)
  * 🏠 Home, 🔮 Reading, 📜 Timeline, 👤 Profile
- 전체 배경: 어두운 남색 (#0f0a1e)
- 폰트: Inter (Google Fonts)

page.tsx (랜딩):
- 히어로 섹션:
  * 제목: "Your Life, Analyzed by AI Tarot"
  * 부제: "Not just fortune telling. Deep pattern analysis of your life."
  * "Start for Free" 버튼 → Google 로그인
- 특징 3가지 카드:
  * 🔮 AI-Powered Readings
  * 📊 Life Pattern Analysis
  * ✅ Reality Check System
- 하단 "Completely Free to Start"

별자리 느낌의 배경 파티클 효과 추가 (CSS만으로).
```

---

# ━━━━━━━━━━━━━━━━━━━━━━━━
# STEP 20 — 다국어 설정 (i18n)
# ━━━━━━━━━━━━━━━━━━━━━━━━

```
다국어 지원 기본 구조를 세팅해줘.

locales/en/common.json 에 아래 키들 작성:
- nav: { home, reading, timeline, profile, logout, getStarted }
- reading: { title, questionPlaceholder, selectCategory, selectSpread, drawCards, saveReading, newReading, viewTimeline }
- category: { love, career, money, health, family, friendship, study, general }
- emotion: { happy, neutral, sad, angry, anxious }
- spread: { past_present_future, love, career, decision }
- dashboard: { title, dailyCard, thisMonth, totalReadings, positiveCards, avgScore, topCards, remainingToday, recentReadings, pendingChecks }
- timeline: { title, checkDue, rateReading, completed }
- common: { loading, error, success, save, cancel, close }

locales/ko/common.json 에 동일한 키로 한국어 값 작성.

next-i18next.config.js 설정 파일도 생성해줘.
defaultLocale: 'en'
locales: ['en', 'ko']
```

---

# ━━━━━━━━━━━━━━━━━━━━━━━━
# STEP 21 — 최종 점검 및 배포
# ━━━━━━━━━━━━━━━━━━━━━━━━

```
배포 전 최종 점검을 해줘.

1. npm run build 실행해서 빌드 에러 확인
   에러 있으면 전부 수정해줘.

2. TypeScript 타입 에러 확인
   npx tsc --noEmit

3. 아래 항목 동작 확인:
   □ Google 로그인
   □ Daily Card 표시
   □ Reading 생성 (3장)
   □ Timeline 표시
   □ Reality Check 저장
   □ Rate Limit 동작
   □ 로그아웃

4. 모바일 반응형 확인
   (Chrome DevTools에서 iPhone SE 기준)

5. .env.local이 .gitignore에 포함되어 있는지 확인

6. Vercel 배포:
   vercel --prod

배포 완료 후 URL 알려줘.
```

---

# ━━━━━━━━━━━━━━━━━━━━━━━━
# 긴급 수정용 프롬프트 (문제 발생 시)
# ━━━━━━━━━━━━━━━━━━━━━━━━

## Groq 429 에러 발생 시
```
Groq API에서 429 에러가 발생하고 있어.
lib/groq.ts 에서 에러 처리를 개선해줘.

429 에러 시:
1. 한국어/영어 안내 메시지 반환
   "AI server is currently busy. Please try again in a few minutes."
2. 에러를 throw하지 말고 fallback 응답 반환
3. fallback: tarot_cards 테이블에서 카드 기본 의미 조합해서 반환
```

## Supabase RLS 에러 발생 시
```
Supabase에서 RLS 정책 에러가 발생하고 있어.
에러 메시지: [에러 메시지 붙여넣기]

supabase-schema.sql 에서 해당 테이블의 RLS 정책을 수정해줘.
수정된 SQL을 Supabase SQL Editor에서 실행할 수 있게 제공해줘.
```

## 빌드 에러 발생 시
```
npm run build 에서 아래 에러가 발생했어:
[에러 메시지 붙여넣기]

원인을 분석하고 수정해줘.
수정 후 다시 빌드 확인해줘.
```

## 모바일 레이아웃 깨질 시
```
모바일에서 [페이지명] 페이지 레이아웃이 깨져.
iPhone SE (375px) 기준으로 수정해줘.
Tailwind 반응형 클래스만 사용해줘.
```

---

*Soul Mirror AI — Claude Code Master Prompt v1.0*
*STEP 0부터 순서대로 실행. 각 STEP 완료 확인 후 다음 STEP 진행.*
