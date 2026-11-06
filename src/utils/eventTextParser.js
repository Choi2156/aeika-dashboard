/**
 * 이벤트 상세 텍스트(detail) 정제 및 파싱 유틸리티
 * 과도한 장식 기호(✦, ♦, ▪️ 등)와 불필요한 공백을 제거하고
 * 각 뷰(상세 모달, 타임라인 카드, 상단 배너)에 맞는 담백한 텍스트로 변환합니다.
 */

const DECORATIVE_PREFIX_REGEX = /^[\s✦♦▪️▪•·*➢➣➤▶▷-]+/;

/**
 * 단일 라인에서 장식 기호 접두사를 제거합니다.
 * 단, '※' 주의사항이나 들여쓰기 서브 항목('- ')의 문맥은 깔끔하게 보존합니다.
 */
export function cleanDetailLine(line) {
  if (!line || typeof line !== 'string') return '';
  const trimmed = line.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('※')) {
    return trimmed;
  }
  return trimmed.replace(DECORATIVE_PREFIX_REGEX, '').trim();
}

/**
 * 멀티라인 detail 텍스트를 정제된 줄 배열로 반환합니다.
 * (DetailModal 등에서 개조식 리스트로 렌더링할 때 활용)
 */
export function parseDetailLines(detail) {
  if (!detail || typeof detail !== 'string') return [];
  return detail
    .split(/\r?\n/)
    .map((raw) => {
      const isIndented = /^\s{2,}[-•·]/.test(raw);
      const isNote = raw.trim().startsWith('※');
      const text = cleanDetailLine(raw);
      return { text, isIndented, isNote };
    })
    .filter((item) => item.text.length > 0);
}

/**
 * 카드 뷰(ListView, LiveBannerBoard, GanttBottomLayout)용 한 줄 요약 텍스트 반환
 */
export function getCleanSummaryText(detail, maxLength = 100) {
  const lines = parseDetailLines(detail).filter((l) => !l.isNote);
  if (lines.length === 0) return '';
  const joined = lines.map((l) => l.text).join(' · ');
  if (joined.length <= maxLength) return joined;
  return `${joined.slice(0, maxLength).trim()}…`;
}
