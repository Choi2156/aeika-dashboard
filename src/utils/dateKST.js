/**
 * dateKST.js — 한국 표준시(KST, UTC+9) 단일 날짜·시간·D-Day 연산 유틸리티
 * 브라우저 시스템 타임존에 의존하지 않고 언제나 KST 기준으로 일관된 날짜 연산을 수행합니다.
 */

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

/**
 * 현재 시각의 KST 기준 연/월/일/시/분/요일 정보를 반환합니다.
 */
export function getNowKSTParts() {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60 * 1000;
  const kstDate = new Date(utcMs + KST_OFFSET_MS);

  const year = kstDate.getFullYear();
  const month = kstDate.getMonth() + 1;
  const day = kstDate.getDate();
  const hours = kstDate.getHours();
  const minutes = kstDate.getMinutes();
  const dayOfWeek = kstDate.getDay();

  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const shortLabel = `${String(month).padStart(2, '0')}.${String(day).padStart(2, '0')} (${WEEKDAY_NAMES[dayOfWeek]})`;

  return {
    year,
    month,
    day,
    hours,
    minutes,
    dayOfWeek,
    weekdayName: WEEKDAY_NAMES[dayOfWeek],
    dateStr,
    shortLabel,
  };
}

/**
 * 오늘 날짜를 'YYYY-MM-DD' (KST 기준) 문자열로 반환합니다.
 */
export function getTodayStrKST() {
  return getNowKSTParts().dateStr;
}

/**
 * 오늘 날짜를 로컬 0시 Date 객체(KST 연월일 기준)로 반환합니다.
 */
export function getTodayDateKST() {
  const { year, month, day } = getNowKSTParts();
  return new Date(year, month - 1, day);
}

/**
 * 'YYYY-MM-DD' 문자열을 로컬 0시 Date 객체로 파싱합니다.
 */
export function parseDateStr(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return getTodayDateKST();
  const parts = dateStr.split('-').map(Number);
  if (parts.length < 3 || Number.isNaN(parts[0])) return getTodayDateKST();
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

/**
 * Date 객체를 'YYYY-MM-DD' 문자열로 변환합니다.
 */
export function formatDateObj(d) {
  if (!d || !(d instanceof Date) || Number.isNaN(d.getTime())) return getTodayStrKST();
  return (
    d.getFullYear() +
    '-' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(d.getDate()).padStart(2, '0')
  );
}

/**
 * 두 날짜('YYYY-MM-DD' 문자열 또는 Date 객체) 간의 일수 차이(end - start)를 정수로 반환합니다.
 */
export function diffDays(start, end) {
  if (!start || !end) return 0;
  const d1 = typeof start === 'string' ? parseDateStr(start) : start;
  const d2 = typeof end === 'string' ? parseDateStr(end) : end;
  const utc1 = Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate());
  const utc2 = Date.UTC(d2.getFullYear(), d2.getMonth(), d2.getDate());
  return Math.round((utc2 - utc1) / DAY_MS);
}

/**
 * 날짜('YYYY-MM-DD' 또는 Date)에 일수를 더한 새 Date 객체를 반환합니다.
 */
export function addDaysToDate(date, days) {
  const base = typeof date === 'string' ? parseDateStr(date) : new Date(date);
  const next = new Date(base.getFullYear(), base.getMonth(), base.getDate() + days);
  return next;
}

/**
 * 'YYYY-MM-DD'를 'MM.DD (요일)' 또는 'M/D' 형식으로 포맷합니다.
 */
export function formatDisplayDate(dateStr, includeWeekday = true) {
  if (!dateStr) return '—';
  const d = parseDateStr(dateStr);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const w = WEEKDAY_NAMES[d.getDay()];
  return includeWeekday ? `${mm}.${dd} (${w})` : `${mm}.${dd}`;
}

/**
 * 오늘(todayStr) 기준 특정 이벤트의 D-Day 상태 정보 객체를 반환합니다.
 */
export function getEventDDayInfo(event, todayStr = getTodayStrKST()) {
  if (!event || !event.date) {
    return { status: 'unknown', label: '', diffStart: 0, diffEnd: 0 };
  }
  const startStr = event.start_date || event.date;
  const endStr = event.end_date || startStr;
  const diffStart = diffDays(todayStr, startStr);
  const diffEnd = diffDays(todayStr, endStr);

  if (startStr === todayStr) {
    return { status: 'today', label: 'D-DAY', diffStart: 0, diffEnd };
  }
  if (diffStart > 0) {
    return { status: 'upcoming', label: `D-${diffStart}`, diffStart, diffEnd };
  }
  if (todayStr >= startStr && todayStr <= endStr) {
    return {
      status: 'ongoing',
      label: diffEnd === 0 ? '오늘 종료' : `종료 D-${diffEnd}`,
      diffStart,
      diffEnd,
    };
  }
  return { status: 'ended', label: '종료', diffStart, diffEnd };
}

export function getKoreanDayName(dayIdx) {
  return WEEKDAY_NAMES[dayIdx] || '';
}
