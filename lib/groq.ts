import Groq, { RateLimitError } from 'groq-sdk';

const groqApiKey = process.env.GROQ_API_KEY;
if (!groqApiKey) {
  throw new Error('Missing Groq env var: GROQ_API_KEY');
}

const groq = new Groq({ apiKey: groqApiKey });

const MODEL = 'llama-3.1-8b-instant';
const MAX_TOKENS = 400;
export const RATE_LIMIT_MESSAGE = '지금 AI 서버가 혼잡합니다. 잠시 후 다시 시도해주세요.';

export const SYSTEM_PROMPT = `You are a professional tarot reader specializing in psychological insight.

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
- 모든 답변은 한국어로 작성하세요
- 마크다운 서식(**, #, - 등)을 쓰지 말고 순수 텍스트로만 작성하세요

응답 형식 (한국어로 작성):
1. 카드 해석 (150자 이내)
2. 심리적 통찰 (100자 이내)
3. 오늘의 행동: [구체적인 행동 한 가지] (50자 이내)

전체 300자 이내.`;

interface ReadingCardInput {
  name: string;
  orientation: 'normal' | 'reverse';
  position: number;
}

interface GenerateReadingParams {
  question: string;
  category: string;
  spreadType: string;
  cards: ReadingCardInput[];
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

// "오늘의 행동" 이후 텍스트만 추출.
// 모델이 콜론을 빼먹거나("오늘의 행동\n내용"), 마크다운 강조(**)를 붙이는 등
// 지시한 형식을 정확히 안 지키는 경우가 있어 최대한 관대하게 파싱한다.
function parseActionTip(content: string): string {
  const idx = content.search(/오늘의\s*행동/);
  if (idx === -1) return '';

  const after = content.slice(idx).replace(/^오늘의\s*행동/, '');
  const cleaned = after.replace(/^[\s:：*]+/, '');
  const firstLine = cleaned.split('\n')[0] ?? '';

  return firstLine.replace(/\*+$/, '').trim();
}

export async function generateReading(
  params: GenerateReadingParams
): Promise<GenerateReadingResult> {
  try {
    const cardsText = params.cards
      .map((card) => `${card.position}. ${card.name} (${orientationLabel(card.orientation)})`)
      .join('\n');

    const userPrompt = `질문: ${params.question}
카테고리: ${params.category}
스프레드: ${params.spreadType}
뽑은 카드:
${cardsText}`;

    const completion = await groq.chat.completions.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
    });

    const content = stripMarkdown(completion.choices[0]?.message?.content ?? '');

    return {
      response: content,
      actionTip: parseActionTip(content),
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
        { role: 'system', content: SYSTEM_PROMPT },
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
