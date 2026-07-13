// AI 응답의 첫 줄만 취해 maxLength자로 자름 (timeline, dashboard의 리딩 미리보기에서 공용으로 사용)
export function getReadingSnippet(aiResponse: string, maxLength = 50): string {
  const firstLine = aiResponse.split('\n')[0] ?? '';
  return firstLine.length > maxLength ? `${firstLine.slice(0, maxLength)}...` : firstLine;
}

// "7월 13일" 형태의 짧은 날짜 표기
export function formatShortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
}
