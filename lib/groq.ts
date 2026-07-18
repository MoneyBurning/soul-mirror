import Groq, { RateLimitError } from 'groq-sdk';
import { stripActionTipSection } from './format';

const groqApiKey = process.env.GROQ_API_KEY;
if (!groqApiKey) {
  throw new Error('Missing Groq env var: GROQ_API_KEY');
}

const groq = new Groq({ apiKey: groqApiKey });

const MODEL = 'llama-3.1-8b-instant';
// 한국어는 토큰 효율이 낮아(문자당 여러 토큰), 300자 분량 응답 기준 400 토큰으로는
// 문장 중간에 잘리는 경우가 있어 여유 있게 상향
const MAX_TOKENS = 800;
export const RATE_LIMIT_MESSAGE = '지금 AI 서버가 혼잡합니다. 잠시 후 다시 시도해주세요.';

export const SYSTEM_PROMPT_PREMIUM = `CRITICAL: You must respond in Korean ONLY. If you write even one word in English, Chinese, Japanese, or any other language, it is a complete failure. Korean characters only. No exceptions whatsoever.

You must respond ONLY in Korean. Never use Chinese, Japanese, English or any other language. No exceptions.

당신은 10년 경력의 타로 심리상담사입니다. 타로는 점술이 아닌 내면 탐구와 심리상담의 도구입니다.

[해석 원칙]
1. 첫 문장은 반드시 감정 공감으로 시작 ("요즘 많이 지치셨죠?", "그 불안감, 충분히 이해돼요" 같은 톤)
2. 카드 나열 금지 — 기승전결 스토리로 연결 (지금까지의 흐름 → 현재 갈등 → 앞으로의 열쇠)
3. 역방향 카드는 부정이 아닌 "아직 꺼내지 못한 내면의 에너지"로 해석
4. 스프레드별 톤 구분:
   - 연애: 따뜻하고 공감 중심
   - 커리어: 현실적이고 실용적
   - 원카드/데일리: 짧고 핵심만
   - 풀리딩: 깊이 있고 철학적
5. 마지막은 "오늘 자신에게 물어보세요: ___" 형식으로 끝내기 (행동 지시 금지)
6. 상대방 속마음, 현재 에너지, 과거 흐름에 집중 (미래 단정 금지)
7. 번역투 금지, 마크다운 금지, 순수 한국어 자연스러운 문체
8. 300자 내외로 간결하게`;

export const SYSTEM_PROMPT_FREE = `CRITICAL: You must respond in Korean ONLY. If you write even one word in English, Chinese, Japanese, or any other language, it is a complete failure. Korean characters only. No exceptions whatsoever.

You must respond ONLY in Korean. Never use Chinese, Japanese, English or any other language. No exceptions.

당신은 10년 경력의 타로 심리상담사입니다. 타로는 점술이 아닌 내면 탐구와 심리상담의 도구입니다. 지금은 무료 체험 리딩이므로 카드는 해석하되 깊이는 제한하고, 더 알고 싶은 마음이 들도록 여운을 남겨야 합니다.

[해석 원칙]
1. 바넘 효과를 활용하세요 — 누구에게나 해당될 수 있는 보편적인 감정과 상황이지만, 질문자가 "이건 내 얘기다"라고 느끼도록 표현하세요.
2. 순서를 반드시 지키세요: 감정 공감 → 상황 묘사 → 관계 또는 에너지 언급 → 궁금증 유발
3. 카드가 가리키는 전체적인 분위기와 흐름은 짚어주되, 해석의 깊이는 얕게 유지하세요.
4. 구체적인 타이밍(언제), 상대방의 속마음, 결론이나 답은 절대 언급하지 마세요.
5. 스프레드 주제에 맞게 감정 언어를 조정하세요:
   - 연애: 따뜻하고 두근거리는 톤
   - 커리어: 현실적이지만 긴장감 있는 톤
   - 결정: 신중하고 묵직한 톤
6. 번역투 금지, 마크다운 금지, 순수 한국어 자연스러운 문체
7. 전체 150~200자 분량으로 작성하세요.
8. 마지막 문장은 반드시 아래 문장을 그대로 사용하세요 (변형·생략 금지):
"상대방의 지금 마음과 이 흐름이 어디로 향하는지, 카드가 이미 다 말하고 있어요. 프리미엄에서 확인해보세요 🔮"`;

interface ReadingCardInput {
  name: string;
  orientation: 'normal' | 'reverse';
  position: number;
  positionLabel?: string;
}

interface GenerateReadingParams {
  question: string;
  category: string;
  spreadType: string;
  cards: ReadingCardInput[];
  isPremium: boolean;
}

interface GenerateReadingResult {
  response: string;
  actionTip: string;
}

interface GenerateDailyCardParams {
  cardName: string;
  orientation: 'normal' | 'reverse';
}

function isRateLimitError(err: unknown): boolean {
  return err instanceof RateLimitError || (err as { status?: number })?.status === 429;
}

function orientationLabel(orientation: 'normal' | 'reverse'): string {
  return orientation === 'normal' ? '정방향' : '역방향';
}

// 모델이 지시를 어기고 마크다운 강조/헤더를 붙이는 경우를 대비한 최종 방어선
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/^#{1,6}\s*/gm, '')
    .trim();
}

// "오늘 자신에게 물어보세요" 이후 텍스트만 추출.
// 모델이 콜론을 빼먹거나("오늘 자신에게 물어보세요\n내용"), 마크다운 강조(**)를 붙이는 등
// 지시한 형식을 정확히 안 지키는 경우가 있어 최대한 관대하게 파싱한다.
function parseActionTip(content: string): string {
  const idx = content.search(/오늘\s*자신에게\s*물어보세요/);
  if (idx === -1) return '';

  const after = content.slice(idx).replace(/^오늘\s*자신에게\s*물어보세요/, '');
  const cleaned = after.replace(/^[\s:：*]+/, '');
  const firstLine = cleaned.split('\n')[0] ?? '';

  return firstLine.replace(/\*+$/, '').trim();
}

export async function generateReading(
  params: GenerateReadingParams
): Promise<GenerateReadingResult> {
  try {
    const cardsText = params.cards
      .map((card) => {
        const label = card.positionLabel ? `[${card.positionLabel}] ` : '';
        return `${card.position}. ${label}${card.name} (${orientationLabel(card.orientation)})`;
      })
      .join('\n');

    const userPrompt = `질문: ${params.question}
카테고리: ${params.category}
스프레드: ${params.spreadType}
뽑은 카드:
${cardsText}`;

    const systemPrompt = params.isPremium ? SYSTEM_PROMPT_PREMIUM : SYSTEM_PROMPT_FREE;

    const completion = await groq.chat.completions.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });

    const content = stripMarkdown(completion.choices[0]?.message?.content ?? '');
    const actionTip = parseActionTip(content);

    return {
      // "오늘 자신에게 물어보세요" 질문은 하단 박스에 별도로 표시되므로 본문에서는 제거해 중복을 막는다.
      response: stripActionTipSection(content),
      actionTip,
    };
  } catch (err) {
    if (isRateLimitError(err)) {
      return { response: RATE_LIMIT_MESSAGE, actionTip: '' };
    }
    throw err;
  }
}

export async function generateDailyCard(params: GenerateDailyCardParams): Promise<string> {
  try {
    const userPrompt = `오늘의 카드 한 장에 대한 짧은 타로 메시지를 작성하세요.
카드: ${params.cardName} (${orientationLabel(params.orientation)})
시스템 규칙의 번호 형식은 무시하고, 100자 이내의 따뜻하고 짧은 메시지 하나만 작성하세요. 불필요한 인사말은 생략하세요.`;

    const completion = await groq.chat.completions.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT_PREMIUM },
        { role: 'user', content: userPrompt },
      ],
    });

    return stripMarkdown(completion.choices[0]?.message?.content ?? '');
  } catch (err) {
    if (isRateLimitError(err)) {
      return RATE_LIMIT_MESSAGE;
    }
    throw err;
  }
}
