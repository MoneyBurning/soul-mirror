// AI 응답의 첫 줄만 취해 maxLength자로 자름 (timeline, dashboard의 리딩 미리보기에서 공용으로 사용)
export function getReadingSnippet(aiResponse: string, maxLength = 50): string {
  const firstLine = aiResponse.split('\n')[0] ?? '';
  return firstLine.length > maxLength ? `${firstLine.slice(0, maxLength)}...` : firstLine;
}

// AI 응답 본문에서 "오늘의 행동" 섹션을 제거.
// 결과 페이지가 이 섹션을 하단 박스에 별도로 보여주기 때문에, 본문에 그대로 남아있으면
// 같은 내용이 두 번 표시된다.
export function stripActionTipSection(aiResponse: string): string {
  return aiResponse.replace(/\n\s*\d*\.?\s*오늘의\s*행동[\s\S]*$/, '').trim();
}

// "7월 13일" 형태의 짧은 날짜 표기
export function formatShortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
}
