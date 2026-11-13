/**
 * eventTextParser.js — 이벤트 상세 텍스트(detail) 정제 및 구조화 파싱 유틸리티 (v1.3.0)
 * - 과도한 장식 기호(✦, ♦, ▪️, ■, ▶ 등), 불필요한 인사말/홍보 문구, URL 노이즈를 정제합니다.
 * - DetailModal용 카테고리 배지 기반 구조화 카드 데이터와
 *   카드/배너/툴팁용 자연스러운 1줄 요약문을 생성합니다.
 */

const DECORATIVE_PREFIX_REGEX = /^[\s✦♦▪️▪■□•·*➢➣➤▶▷-]+/;
const LEADING_EMOJI_REGEX =
  /^[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}\s]+/u;
// 불릿 기호(✦, ♦, ▪, ■, ▶ 등)를 제외한 실제 배너 장식용 이모지/기호만 매칭
const PICTOGRAPH_EMOJI_REGEX =
  /^[\u{1F300}-\u{1FAFF}⚡✨❄🔥🎉🎊🎭🎟🎨📍🍕🚂☕🎵]/u;
const URL_REGEX = /https?:\/\/[^\s)]+/gi;
const REDUNDANT_PHASE_BRACKET_REGEX =
  /\s*(?:\[(?:한정\/)?(?:전반|후반|신규|복각|콜라보\/픽업|콜라보\/배포)\]|\((?:신규\/|복각\/)?(?:전반|후반)\))/g;

// 단독 줄로 등장할 때 다음 줄과 결합할 카테고리 헤더 목록
const STANDALONE_HEADERS = new Set([
  '신규 캐릭터',
  '복각 캐릭터',
  '신규 에이전트',
  '복각 에이전트',
  '신규 오퍼레이터',
  '복각 오퍼레이터',
  '신규 공명자',
  '복각 공명자',
  '신규 스토리',
  '신규 마신 임무',
  '신규 개척 임무',
  '신규 지역',
  '신규 코스튬',
  '주요 이벤트',
]);

// 불필요한 인사말/클리셰 홍보 문구 필터링 정규식
const FLUFF_LINE_REGEX =
  /^(?:안녕하세요[,!\s]|새로운 시대에서 눈을 뜨신 것을 환영합니다|폭풍과도\s*같은\s*액션의\s*파도|구독도 잊지 말기|그럼 여행자,\s*방송 때 보자|방랑자님을 위해 준비한 맛있는 콜라보 소식|우주의 웃음 수색꾼들이여|임무는 「각본」대로)/;

// 명시적 색상 지정 태그 매핑 ("분류명(보라): 내용", "분류명(emerald): 내용" 등 지원)
const CATEGORY_COLOR_HINT_MAP = {
  emerald: 'pickup',
  green: 'pickup',
  mint: 'pickup',
  에메랄드: 'pickup',
  초록: 'pickup',
  그린: 'pickup',
  민트: 'pickup',

  sky: 'rerun',
  blue: 'rerun',
  cyan: 'rerun',
  하늘: 'rerun',
  블루: 'rerun',
  파랑: 'rerun',
  시안: 'rerun',

  violet: 'story',
  purple: 'story',
  lavender: 'story',
  보라: 'story',
  바이올렛: 'story',
  퍼플: 'story',

  amber: 'event',
  gold: 'event',
  yellow: 'event',
  orange: 'event',
  노랑: 'event',
  골드: 'event',
  주황: 'event',
  앰버: 'event',

  teal: 'schedule',
  aqua: 'schedule',
  청록: 'schedule',
  틸: 'schedule',

  rose: 'rose',
  pink: 'rose',
  red: 'rose',
  crimson: 'rose',
  로즈: 'rose',
  핑크: 'rose',
  분홍: 'rose',
  레드: 'rose',
  빨강: 'rose',

  indigo: 'indigo',
  인디고: 'indigo',
  남색: 'indigo',

  slate: 'note',
  gray: 'note',
  grey: 'note',
  default: 'note',
  슬레이트: 'note',
  회색: 'note',
  기본: 'note',
};

const AUTO_TONE_PALETTE = ['pickup', 'rerun', 'story', 'event', 'rose', 'indigo', 'schedule'];

/**
 * 카테고리명 끝의 `(색상)` 힌트를 분리해 { category, explicitTone }을 반환합니다.
 */
function stripColorHint(rawCategory = '') {
  const trimmed = String(rawCategory).trim();
  const match = trimmed.match(/^(.+?)\s*\(([a-zA-Z가-힣]+)\)$/);
  if (match) {
    const colorKey = match[2].trim().toLowerCase();
    const mappedTone = CATEGORY_COLOR_HINT_MAP[colorKey];
    if (mappedTone) {
      return {
        category: match[1].trim(),
        explicitTone: mappedTone,
      };
    }
  }
  return { category: trimmed, explicitTone: null };
}

/**
 * 카테고리명에 따른 시맨틱 톤(tone) 분류
 * - 명시적 색상 힌트 우선 > 공식 시맨틱 키워드 > 정규화 이름 기반 결정적 해시(동일 분류 항상 동일 색상)
 */
function resolveCategoryTone(category = '', explicitTone = null) {
  if (explicitTone) {
    return CATEGORY_COLOR_HINT_MAP[String(explicitTone).toLowerCase()] || explicitTone;
  }
  const c = category.trim();
  if (!c) return 'default';
  if (/신규\s*(?:캐릭터|에이전트|오퍼레이터|공명자)|특별\s*허가|전반\s*\d|후반\s*\d|출시|픽업/.test(c)) {
    return 'pickup';
  }
  if (/복각|재구축|묶음\s*기원|워프\s*지속/.test(c)) {
    return 'rerun';
  }
  if (/스토리|임무|지역|구역|필드|메인|개척|마신|비화|전설/.test(c)) {
    return 'story';
  }
  if (/코스튬|스킨|콜라보|컬래버|협업|특전|굿즈/.test(c)) {
    return 'rose';
  }
  if (/이벤트|콘텐츠|프로그램|보상|혜택|지원|배포|무대|참가|사전\s*예약/.test(c)) {
    return 'event';
  }
  if (/일시|기간|일정|장소|채널|매장|시간|예매|운영/.test(c)) {
    return 'schedule';
  }
  if (/안내|참고|유의|주의/.test(c)) {
    return 'note';
  }

  // 기존 규칙에 없는 신규/커스텀 분류명은 이름 해시로 항상 동일한 색상을 배정
  const normalized = c.replace(/\s+/g, '');
  let hash = 2166136261;
  for (let i = 0; i < normalized.length; i += 1) {
    hash ^= normalized.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return AUTO_TONE_PALETTE[(hash >>> 0) % AUTO_TONE_PALETTE.length];
}

/**
 * 단일 라인에서 장식 기호 접두사를 제거합니다.
 * 단, '※' 주의사항의 문맥은 보존합니다.
 */
export function cleanDetailLine(line) {
  if (!line || typeof line !== 'string') return '';
  const trimmed = line.replace(/░+/g, '').trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('※')) {
    return trimmed;
  }
  return trimmed.replace(DECORATIVE_PREFIX_REGEX, '').trim();
}

/**
 * 카테고리: 값 분리 헬퍼
 * 예: "신규 캐릭터: 5★ 미탸" -> { category: "신규 캐릭터", content: "5★ 미탸", isHeader: false }
 * 예: "특수 복각 (전·후반 택1, ~12/21): 5★ 카멜리아" -> { category: "특수 복각", content: "5★ 카멜리아 (전·후반 택1, ~12/21)", isHeader: false }
 * 예: "전반부 주요 이벤트:" -> { category: "전반부 주요 이벤트", content: "", isHeader: true }
 */
function extractCategoryAndContent(cleanedText, rawTrimmed, hasBulletPrefix = false) {
  if (!cleanedText) return { category: '', explicitTone: null, content: '', isHeader: false };

  // 1. 이모지 섹션 헤더 (예: "🎂 2주년 기념 보상", "🎟️ [티켓 예매 안내]", "📍 세미 팝업 오프라인 이벤트")
  if (LEADING_EMOJI_REGEX.test(rawTrimmed) && !rawTrimmed.includes(':')) {
    const noEmoji = rawTrimmed.replace(LEADING_EMOJI_REGEX, '').trim();
    const bracketOnly = noEmoji.match(/^\[([^\]]+)\]$/)?.[1];
    if (bracketOnly || noEmoji.length <= 22) {
      const stripped = stripColorHint(bracketOnly || noEmoji);
      return {
        category: stripped.category,
        explicitTone: stripped.explicitTone,
        content: '',
        isHeader: true,
      };
    }
  }

  // 2. 대괄호 단독 섹션 헤더 (예: "[티켓 예매 안내]")
  const pureBracketHeader = cleanedText.match(/^\[([^\]]{2,20})\]$/);
  if (pureBracketHeader) {
    const stripped = stripColorHint(pureBracketHeader[1]);
    return {
      category: stripped.category,
      explicitTone: stripped.explicitTone,
      content: '',
      isHeader: true,
    };
  }

  // 3. 대괄호 프리픽스 + 내용 (예: "[7/24 업데이트] Fate/stay night 콜라보...", "[조수 임무] 제3장...")
  const bracketPrefixMatch = cleanedText.match(/^\[([^\]]{2,18})\]\s+(.+)$/);
  if (bracketPrefixMatch && !cleanedText.includes(':')) {
    const stripped = stripColorHint(bracketPrefixMatch[1]);
    return {
      category: stripped.category,
      explicitTone: stripped.explicitTone,
      content: bracketPrefixMatch[2].trim(),
      isHeader: false,
    };
  }

  // 4. 콜론(:)으로 끝나는 섹션 헤더 (예: "전반부 주요 이벤트:", "신규 코스튬(보라):")
  if (cleanedText.endsWith(':') && cleanedText.length <= 36) {
    const rawCat = cleanedText.slice(0, -1).replace(/^[①②③④⑤]\s*/, '').trim();
    const stripped = stripColorHint(rawCat);
    return {
      category: stripped.category,
      explicitTone: stripped.explicitTone,
      content: '',
      isHeader: true,
    };
  }

  // 5. "Key: Value" 또는 "Key(색상): Value" 패턴 (시간 표기 11:00 등 제외)
  const colonMatch = cleanedText.match(/^([^:]{2,36}?):\s+(.+)$/);
  if (colonMatch) {
    const rawCatBeforeColor = colonMatch[1].trim();
    const colorStripped = stripColorHint(rawCatBeforeColor);
    let rawCat = colorStripped.category;
    const explicitTone = colorStripped.explicitTone;
    let content = colonMatch[2].trim();

    // 불릿/구조화 라인이 아닌 일반 서술문에서 너무 긴 앞 절을 강제로 배지로 자르지 않고 평문 보존
    const isDateScheduleKey = /^\d{1,2}월\s*\d{1,2}일/.test(rawCat);
    const looksLikeProseClause =
      !hasBulletPrefix &&
      !explicitTone &&
      !isDateScheduleKey &&
      (rawCat.length > 16 || /(?:\s및\s|,)/.test(rawCat));

    if (looksLikeProseClause) {
      return { category: '', explicitTone: null, content: cleanedText, isHeader: false };
    }

    if (!isDateScheduleKey) {
      // 색상 힌트가 아닌 일반 부연 괄호(예: "특수 복각 (전·후반 택1)")는 우측 본문으로 이동해 알약 배지를 간결하게 유지
      const parenMatch = rawCat.match(/^([^(]{2,16}?)\s*(\([^)]+\))$/);
      if (parenMatch) {
        rawCat = parenMatch[1].trim();
        content = `${content} ${parenMatch[2]}`;
      }
    }

    return {
      category: rawCat,
      explicitTone,
      content,
      isHeader: false,
    };
  }

  // 6. schedule_data.json 단문 포맷 ("전반 5/20 니콜 픽업 및...", "후반 6/9 로엔 픽업...")
  const phaseDateMatch = cleanedText.match(/^(전반|후반)\s+(\d{1,2}\/\d{1,2})\s+(.+)$/);
  if (phaseDateMatch) {
    return {
      category: `${phaseDateMatch[1]} (${phaseDateMatch[2]})`,
      explicitTone: null,
      content: phaseDateMatch[3].trim(),
      isHeader: false,
    };
  }

  // 7. "공식 방송 5/22 19:30 진행 예정" 포맷
  const streamShortMatch = cleanedText.match(/^공식\s*방송\s+(.+)$/);
  if (streamShortMatch) {
    return {
      category: '방송 일정',
      explicitTone: null,
      content: streamShortMatch[1].trim(),
      isHeader: false,
    };
  }

  return { category: '', explicitTone: null, content: cleanedText, isHeader: false };
}

/**
 * 멀티라인 detail 텍스트를 정제된 구조화 라인 배열로 반환합니다.
 * 각 항목은 문자열 보간 하위 호환을 위해 toString() 메서드를 제공합니다.
 */
export function parseDetailLines(detail) {
  if (!detail || typeof detail !== 'string') return [];

  const rawLines = detail.split(/\r?\n/);
  const normalizedLines = [];

  // 단독 카테고리 줄("신규 공명자\n루실라 픽업")을 다음 줄과 자연스럽게 결합
  for (let i = 0; i < rawLines.length; i++) {
    const currentTrimmed = rawLines[i].trim();
    if (!currentTrimmed) continue;

    if (STANDALONE_HEADERS.has(currentTrimmed) && i + 1 < rawLines.length) {
      const nextTrimmed = rawLines[i + 1].trim();
      if (nextTrimmed && !STANDALONE_HEADERS.has(nextTrimmed) && !nextTrimmed.startsWith('✦')) {
        normalizedLines.push(`✦ ${currentTrimmed}: ${nextTrimmed}`);
        i += 1;
        continue;
      }
    }
    normalizedLines.push(rawLines[i]);
  }

  const hasStructuredBullets = normalizedLines.some((l) => /^[✦♦▪️▪•▶]/.test(l.trim()));

  const items = [];
  let expectGroupItems = false;

  for (let idx = 0; idx < normalizedLines.length; idx++) {
    const raw = normalizedLines[idx];
    const rawTrimmed = raw.trim();
    if (!rawTrimmed) {
      expectGroupItems = false;
      continue;
    }

    // 불필요한 홍보성 인사말 제거
    const strippedEmoji = rawTrimmed.replace(LEADING_EMOJI_REGEX, '').trim();
    if (FLUFF_LINE_REGEX.test(strippedEmoji)) continue;

    // 구조화 불릿이 존재하는 경우, ✦ 같은 불릿이 아닌 '상단 이모지 배너 제목줄'만 중복 제거 (정보 손실 방지)
    if (
      idx === 0 &&
      hasStructuredBullets &&
      PICTOGRAPH_EMOJI_REGEX.test(rawTrimmed) &&
      !rawTrimmed.includes(':') &&
      (rawTrimmed.includes('[') || rawTrimmed.includes('콜라보') || rawTrimmed.includes('안내')) &&
      !rawTrimmed.startsWith('🎂') &&
      !rawTrimmed.startsWith('🎨') &&
      !rawTrimmed.startsWith('🎟') &&
      !rawTrimmed.startsWith('📍')
    ) {
      continue;
    }

    const hasBulletPrefix = /^[✦♦▪️▪■□•·*➢➣➤▶▷]/.test(rawTrimmed);
    const isBulletLine = /^[-•·▪▪️*]\s+/.test(rawTrimmed) || /^[①②③④⑤]/.test(rawTrimmed);
    const isIndented =
      /^\s{2,}[-•·▪▪️*]/.test(raw) ||
      /^[①②③④⑤]/.test(rawTrimmed) ||
      (expectGroupItems && isBulletLine);

    const text = cleanDetailLine(raw);
    if (!text) continue;

    // "※ ..." 또는 "참고: ...", "유의: ..." 모두 note 카드로 통일 파싱
    const noteKeyMatch = text.match(/^(참고|유의|안내|주의)\s*:\s*(.+)$/);
    const isNote = rawTrimmed.startsWith('※') || Boolean(noteKeyMatch);

    if (isNote) {
      expectGroupItems = false;
      const noteCat = noteKeyMatch ? noteKeyMatch[1] : '참고';
      const noteContent = noteKeyMatch
        ? noteKeyMatch[2].trim()
        : text.replace(/^※\s*(?:참고\s*:\s*)?/, '').trim();
      items.push({
        text,
        category: noteCat,
        content: noteContent,
        tone: 'note',
        isIndented: false,
        isNote: true,
        isHeader: false,
        toString() {
          return this.text;
        },
      });
      continue;
    }

    const { category, explicitTone, content, isHeader } = extractCategoryAndContent(text, rawTrimmed, hasBulletPrefix);
    const tone = resolveCategoryTone(category, explicitTone);

    if (isHeader) {
      expectGroupItems = true;
    } else if (!isIndented) {
      expectGroupItems = false;
    }

    items.push({
      text,
      category,
      content: content || (isHeader ? '' : text),
      tone,
      isIndented,
      isNote: false,
      isHeader,
      toString() {
        return this.text;
      },
    });
  }

  return items;
}

/**
 * DetailModal 전용 구조화 카드 섹션 빌더
 * 헤더 + 하위 들여쓰기 항목들을 하나의 깔끔한 그룹 카드로 묶어 반환합니다.
 */
export function parseStructuredDetail(detail) {
  // 선택적 JSON 구조화 배열(event.details)을 바로 사용할 수 있도록 직접 매핑 지원
  if (Array.isArray(detail)) {
    return detail
      .filter((item) => item && typeof item === 'object')
      .map((item) => {
        const rawLabel = String(item.label || item.category || '').trim();
        const { category: label, explicitTone: labelTone } = stripColorHint(rawLabel);
        const preferredTone = item.color || item.tone || labelTone;
        if (Array.isArray(item.items)) {
          return {
            type: 'group',
            category: label || '세부 내용',
            tone: resolveCategoryTone(label || '이벤트', preferredTone),
            items: item.items
              .filter(Boolean)
              .map((text) => ({ category: '', content: '', text: String(text).trim() })),
          };
        }
        const tone = resolveCategoryTone(label, preferredTone);
        if (tone === 'note' || /^(?:참고|유의|안내)$/.test(label)) {
          return {
            type: 'note',
            category: label || '참고',
            content: String(item.text || item.content || '').trim(),
            tone: 'note',
          };
        }
        if (label) {
          return {
            type: 'kv',
            category: label,
            content: String(item.text || item.content || '').trim(),
            tone,
          };
        }
        return {
          type: 'text',
          content: String(item.text || item.content || '').trim(),
          tone: 'default',
        };
      })
      .filter((b) => (b.type === 'group' ? b.items.length > 0 : Boolean(b.content)));
  }

  const lines = parseDetailLines(detail);
  if (lines.length === 0) return [];

  const blocks = [];
  let currentGroup = null;

  for (const line of lines) {
    if (line.isNote) {
      if (currentGroup) {
        blocks.push(currentGroup);
        currentGroup = null;
      }
      blocks.push({
        type: 'note',
        category: line.category || '참고',
        content: line.content,
        tone: 'note',
      });
      continue;
    }

    if (line.isHeader) {
      if (currentGroup) {
        blocks.push(currentGroup);
      }
      currentGroup = {
        type: 'group',
        category: line.category,
        tone: line.tone,
        items: [],
      };
      continue;
    }

    if (line.isIndented) {
      if (!currentGroup) {
        currentGroup = {
          type: 'group',
          category: '세부 내용',
          tone: 'event',
          items: [],
        };
      }
      currentGroup.items.push({
        category: line.category,
        content: line.content,
        text: line.text.replace(/^[①②③④⑤]\s*/, ''),
      });
      continue;
    }

    // 일반 단일 라인이지만 바로 다음에 들여쓰기 서브 항목이 이어질 수 있음
    if (currentGroup) {
      blocks.push(currentGroup);
      currentGroup = null;
    }

    if (line.category) {
      blocks.push({
        type: 'kv',
        category: line.category,
        content: line.content,
        tone: line.tone,
      });
    } else {
      blocks.push({
        type: 'text',
        content: line.content || line.text,
        tone: 'default',
      });
    }
  }

  if (currentGroup) {
    blocks.push(currentGroup);
  }

  return blocks;
}

/**
 * 카드 뷰(ListView, LiveBannerBoard, GanttView 툴팁, GanttBottomLayout)용 한 줄 요약 텍스트 반환
 * - 불필요한 기호(✦, ■), 중복 대괄호([전반], [한정/전반]), URL, (※ ...) 주석을 제거하고 자연스러운 한국어 요약을 반환합니다.
 */
export function getCleanSummaryText(detail, maxLength = 100) {
  const lines = parseDetailLines(detail).filter((l) => !l.isNote && !l.isHeader);
  if (lines.length === 0) return '';

  // 핵심 요약 라인 선별 (단순 방송 채널/일시 중복 줄보다 실제 콘텐츠 줄 우선)
  const meaningfulLines = lines.filter((l) => {
    if (/^(?:방송\s*일시|방송\s*채널|진행\s*장소|장소|일시|기간)$/.test(l.category) && lines.length > 2) {
      return false;
    }
    return true;
  });

  const targetLines = meaningfulLines.length > 0 ? meaningfulLines : lines;

  const cleanedSegments = targetLines
    .map((l) => {
      let base = l.category && l.content ? `${l.category}: ${l.content}` : l.text;
      // 괄호 안 (※ ...) 부연 주석 제거
      base = base.replace(/\s*\(※[^)]*\)/g, '');
      // URL 제거
      base = base.replace(URL_REGEX, '');
      // 이모지 및 장식 기호 제거
      base = base.replace(LEADING_EMOJI_REGEX, '');
      // 중복 전/후반/한정 브래킷 노이즈 정리
      base = base.replace(REDUNDANT_PHASE_BRACKET_REGEX, '');
      // 다중 공백 정리 및 말미 마침표 정돈
      base = base.replace(/\s{2,}/g, ' ').trim();
      return base;
    })
    .filter((seg) => seg.length > 0);

  if (cleanedSegments.length === 0) return '';

  const joined = cleanedSegments.join(' · ');
  if (joined.length <= maxLength) return joined;
  return `${joined.slice(0, maxLength).trim()}…`;
}

const EVENT_TYPE_HUMAN_MAP = {
  전반업데이트: '버전 업데이트',
  후반업데이트: '후반 픽업',
  공식방송: '특별 방송',
  오프라인이벤트: '오프라인 행사',
  행사: '오프라인 행사',
};

/**
 * 내부 이벤트 타입 코드('오프라인이벤트' 등)를 사용자 친화적인 한글 라벨로 변환합니다.
 */
export function formatEventTypeLabel(rawType) {
  if (!rawType) return '일정';
  return EVENT_TYPE_HUMAN_MAP[rawType] || rawType;
}

/**
 * 게임 배지가 함께 표시되는 영역에서 타이틀 앞의 중복 게임명 프리픽스 및 [예상] 태그를 정제합니다.
 */
export function cleanEventDisplayTitle(rawTitle, gameName = '') {
  if (!rawTitle || typeof rawTitle !== 'string') return '';
  let t = rawTitle.replace(/^\s*\[예상\]\s*/, '').trim();

  // 〈붕괴: 스타레일〉 × 메가MGC커피 콜라보 -> 메가MGC커피 콜라보
  t = t.replace(
    /^(?:[〈《『「[])?(?:붕괴:\s*스타레일|스타레일|젠레스\s*존\s*제로|젠존제|명조:\s*워더링\s*웨이브|명조|명일방주:\s*엔드필드|엔드필드|원신)(?:[〉》』」\]])?\s*(?:[×xX|·-]\s*)?/i,
    ''
  );

  // [명조 | 도미노피자 콜라보] - 「...」 -> 도미노피자 콜라보 - 「...」
  t = t.replace(/^\[(?:명조|원신|스타레일|젠존제|엔드필드)\s*\|\s*([^\]]+)\]\s*-\s*/i, '$1 · ');

  // 지스타 2026 - 원신 무대 이벤트 -> 지스타 2026 무대 이벤트
  if (gameName) {
    const shortGame = gameName.replace(/^.*:\s*/, '').trim();
    const redundantDashRegex = new RegExp(`(지스타\\s*\\d{4})\\s*-\\s*(?:${gameName}|${shortGame})\\s*`, 'i');
    t = t.replace(redundantDashRegex, '$1 · ');
  }

  return t.trim() || rawTitle.trim();
}
