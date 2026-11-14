/**
 * 내장형 월간 달력(CalendarView) 및 이미지 추출 공용 마일스톤 추출 유틸리티
 * Python generate_calendar.py의 extract_milestones() 규칙과 100% 동일하게 동작하며,
 * 클릭 시 DetailModal 연동을 위해 원본 이벤트(rawEvent) 참조를 함께 보존합니다.
 */

export const SERVICE_START_DATE = '2026-04-17';
export const PRE_SERVICE_NOTICE_DATE = '2026-04-16';
export const CALENDAR_MIN_YEAR = 2026;
export const CALENDAR_MIN_MONTH = 4;

/**
 * 연·월 쌍을 비교해 차이를 월 단위로 반환합니다.
 */
export function compareYearMonth(y1, m1, y2, m2) {
  return y1 * 12 + m1 - (y2 * 12 + m2);
}

/**
 * 달력 탐색 가능 최대 연·월(일정 데이터의 마지막 종료/시작 월 또는 차기월)을 계산합니다.
 */
export function getCalendarMaxYearMonth(events = [], todayYear = 2026, todayMonth = 11) {
  let maxY = todayYear;
  let maxM = todayMonth + 1;
  if (maxM > 12) {
    maxY += 1;
    maxM = 1;
  }

  const allMilestones = extractCalendarMilestones(events, null);
  for (const m of allMilestones) {
    const targetStr = m?.date;
    if (!targetStr || typeof targetStr !== 'string') continue;
    const parts = targetStr.split('-').map(Number);
    if (parts.length >= 2 && Number.isFinite(parts[0]) && Number.isFinite(parts[1])) {
      if (compareYearMonth(parts[0], parts[1], maxY, maxM) > 0) {
        maxY = parts[0];
        maxM = parts[1];
      }
    }
  }

  if (compareYearMonth(maxY, maxM, CALENDAR_MIN_YEAR, CALENDAR_MIN_MONTH) < 0) {
    return { year: CALENDAR_MIN_YEAR, month: CALENDAR_MIN_MONTH };
  }
  return { year: maxY, month: maxM };
}

const SHORT_GAME_NAMES = {
  '원신': '원신',
  '붕괴: 스타레일': '스타레일',
  '젠레스 존 제로': '젠존제',
  '명조': '명조',
  '명일방주: 엔드필드': '엔드필드',
};

const HALF_PICKUP_TERMS = {
  '원신': '후반 기원',
  '붕괴: 스타레일': '후반 워프',
  '젠레스 존 제로': '후반 변조',
  '명조': '후반 튜닝',
  '명일방주: 엔드필드': '후반 헤드헌팅',
};

function cleanOfflineTitle(title = '') {
  if (title.includes('G-STAR') || title.includes('지스타')) return 'G-STAR 2026';
  if (title.includes('호요랜드')) return '호요랜드 2026';
  if (title.includes('메가MGC커피') || title.includes('메가커피')) return '메가커피 콜라보';
  if (title.includes('롯데시네마')) return '롯데시네마 콜라보';
  if (title.includes('도미노피자')) return '도미노피자 콜라보';
  if (title.includes('삼성스토어') || title.includes('피크닉')) return '가을 피크닉 팝업';
  if (title.includes('숲 프로젝트')) return '숲 프로젝트';
  if (title.includes('전시회')) return 'DEEP 전시회';
  if (title.includes('콘서트')) return '월드 투어 콘서트';
  if (title.includes('반올림피자')) return '반올림피자 콜라보';
  if (title.includes('프랭크버거')) return '프랭크버거 콜라보';

  let clean = title.replace(/^[〈『\[][^〉』\]]+[〉』\]]\s*[-–—:xX×]*\s*/, '').trim();
  if (clean.includes(' - ')) clean = clean.split(' - ')[0].trim();
  else if (clean.includes(' – ')) clean = clean.split(' – ')[0].trim();
  if (clean.length > 14) clean = clean.slice(0, 14).trim();
  return clean || '오프라인 행사';
}

/**
 * 전체 이벤트 배열에서 날짜별 마일스톤 항목을 추출합니다.
 * @param {Array} events - processEvents()로 가공된 전체 이벤트 배열
 * @param {Object} activeGames - 활성화된 게임 필터 맵
 * @returns {Array} 마일스톤 객체 배열
 */
export function extractCalendarMilestones(events = [], activeGames = null) {
  const milestones = [];

  for (const e of events) {
    if (!e || !e.game || !e.date) continue;
    if (activeGames && activeGames[e.game] === false) continue;

    const g = e.game;
    const t = e.type || '';
    const title = e.title || '';
    const isFixed = e.is_fixed === true;
    const sDate = e.date;
    const eDate = e.end_date || sDate;
    const gShort = SHORT_GAME_NAMES[g] || g;

    const verMatch = (e.version || title).match(/(\d+\.\d+)/);
    const verPrefix = verMatch ? `${verMatch[1]} ` : '';

    // 1) 버전 업데이트 (전반)
    if (t.includes('전반업데이트') || (t.includes('업데이트') && !t.includes('후반'))) {
      milestones.push({
        id: `${e.id}_cal_update`,
        date: sDate,
        game: g,
        gameShort: gShort,
        shortGame: gShort,
        isFixed,
        category: 'update',
        categoryLabel: '업데이트',
        badgeLabel: isFixed ? '확정' : '예상',
        title: `${verPrefix}업데이트`,
        label: `${verPrefix}업데이트`,
        compactTitle: `${verPrefix.trim() || ''} 업뎃`.trim(),
        priority: 1,
        isEnd: false,
        rawEvent: e,
        displayType: '버전 업데이트',
      });
    }
    // 2) 후반 픽업 전환
    else if (t.includes('후반업데이트')) {
      const sub = HALF_PICKUP_TERMS[g] || '후반 픽업';
      milestones.push({
        id: `${e.id}_cal_half`,
        date: sDate,
        game: g,
        gameShort: gShort,
        shortGame: gShort,
        isFixed,
        category: 'half',
        categoryLabel: '후반 픽업',
        badgeLabel: isFixed ? '확정' : '예상',
        title: `${verPrefix}${sub}`,
        label: `${verPrefix}${sub}`,
        compactTitle: `${verPrefix.trim() || ''} 후반`.trim(),
        priority: 2,
        isEnd: false,
        rawEvent: e,
        displayType: '후반업데이트',
      });
    }
    // 3) 공식 특별 방송
    else if (t.includes('공식방송')) {
      milestones.push({
        id: `${e.id}_cal_stream`,
        date: sDate,
        game: g,
        gameShort: gShort,
        shortGame: gShort,
        isFixed,
        category: 'broadcast',
        categoryLabel: '특별 방송',
        badgeLabel: isFixed ? '확정' : '예상',
        title: `${verPrefix}특별방송`,
        label: `${verPrefix}특별방송`,
        compactTitle: `${verPrefix.trim() || ''} 방송`.trim(),
        time: e.time || '',
        priority: 3,
        isEnd: false,
        rawEvent: e,
        displayType: '공식방송',
      });
    }
    // 4) 오프라인 행사 / 이벤트
    else if (t.includes('오프라인이벤트') || t.includes('행사')) {
      const evtName = cleanOfflineTitle(title);
      if (sDate === eDate) {
        milestones.push({
          id: `${e.id}_cal_offline`,
          date: sDate,
          game: g,
          gameShort: gShort,
          shortGame: gShort,
          isFixed: true,
          category: 'offline',
          categoryLabel: '오프라인',
          badgeLabel: '이벤트',
          title: evtName,
          label: evtName,
          compactTitle: evtName.slice(0, 6),
          priority: 4,
          isEnd: false,
          rawEvent: e,
          displayType: '오프라인 이벤트',
        });
      } else {
        milestones.push({
          id: `${e.id}_cal_offline_start`,
          date: sDate,
          game: g,
          gameShort: gShort,
          shortGame: gShort,
          isFixed: true,
          category: 'offline',
          categoryLabel: '오프라인',
          badgeLabel: '이벤트',
          title: `${evtName} 시작`,
          label: `${evtName} 시작`,
          compactTitle: `${evtName.slice(0, 5)} 시작`,
          priority: 4,
          isEnd: false,
          rawEvent: e,
          displayType: '오프라인 이벤트',
        });
        milestones.push({
          id: `${e.id}_cal_offline_end`,
          date: eDate,
          game: g,
          gameShort: gShort,
          shortGame: gShort,
          isFixed: true,
          category: 'offline',
          categoryLabel: '오프라인',
          badgeLabel: '종료',
          title: `${evtName} 종료`,
          label: `${evtName} 종료`,
          compactTitle: `${evtName.slice(0, 5)} 종료`,
          priority: 5,
          isEnd: true,
          rawEvent: e,
          displayType: '오프라인 이벤트',
        });
      }
    }
  }

  return milestones;
}

/**
 * 특정 연/월(1~12)의 달력 그리드 셀 배열(일요일 시작, 35 또는 42칸)을 생성합니다.
 */
export function buildMonthGrid(year, month, milestones = [], todayStr = '') {
  const byDate = new Map();
  for (const m of milestones) {
    if (!byDate.has(m.date)) byDate.set(m.date, []);
    byDate.get(m.date).push(m);
  }
  for (const list of byDate.values()) {
    list.sort((a, b) => {
      if (a.isFixed !== b.isFixed) return a.isFixed ? -1 : 1;
      return a.priority - b.priority;
    });
  }

  const firstDayOfMonth = new Date(year, month - 1, 1);
  const lastDayOfMonth = new Date(year, month, 0);
  const startDayOfWeek = firstDayOfMonth.getDay(); // 0 (Sun) ~ 6 (Sat)
  const daysInMonth = lastDayOfMonth.getDate();

  const totalCellsNeeded = startDayOfWeek + daysInMonth;
  const numWeeks = Math.ceil(totalCellsNeeded / 7);
  const totalCells = numWeeks * 7;

  const gridStartDate = new Date(year, month - 1, 1 - startDayOfWeek);
  const cells = [];

  for (let i = 0; i < totalCells; i++) {
    const d = new Date(gridStartDate);
    d.setDate(gridStartDate.getDate() + i);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const day = d.getDate();
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayOfWeek = d.getDay();

    cells.push({
      dateStr,
      year: y,
      month: m,
      day,
      dayOfWeek,
      isCurrentMonth: m === month && y === year,
      isToday: dateStr === todayStr,
      isSunday: dayOfWeek === 0,
      isSaturday: dayOfWeek === 6,
      isPreService: dateStr < SERVICE_START_DATE,
      isPreServiceNotice: dateStr === PRE_SERVICE_NOTICE_DATE,
      milestones: byDate.get(dateStr) || [],
    });
  }

  return { cells, numWeeks };
}
