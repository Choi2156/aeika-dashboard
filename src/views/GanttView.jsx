import { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Radio,
  Globe,
  Youtube,
  MapPin,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import {
  getTodayDateKST,
  diffDays,
  formatDateObj,
  formatDisplayDate,
  getKoreanDayName,
  addDaysToDate,
} from '../utils/dateKST';
import {
  getCleanSummaryText,
  formatEventTypeLabel,
  cleanEventDisplayTitle,
  formatEventVersion,
} from '../utils/eventTextParser';
import { trackChannelClick, trackOutboundLink } from '../utils/analytics';
import '../styles/GanttView.css';

/* ────────────────────────────────────────────
   Constants
   ──────────────────────────────────────────── */
const DESKTOP_CELL_WIDTH = 60;
const MOBILE_DETAIL_CELL_WIDTH = 38;
const MOBILE_OVERVIEW_CELL_WIDTH = 18;
const DESKTOP_GAME_COL_WIDTH = 164;
const MOBILE_GAME_COL_WIDTH = 60;
const MOBILE_LANDSCAPE_GAME_COL_WIDTH = 66;
const ROW_HEIGHT_COLLAPSED = 36;
const DATE_RANGE_BEFORE = 30; // days before today
const DATE_RANGE_AFTER = 90; // days after today

function getViewportSnapshot() {
  if (typeof window === 'undefined') {
    return { isMobile: false, isLandscapeMobile: false };
  }
  const w = window.innerWidth;
  const h = window.innerHeight;
  const coarsePointer = window.matchMedia?.('(pointer: coarse)')?.matches ?? false;
  const isMobile = w <= 768 || (h <= 540 && (coarsePointer || w <= 1024));
  const isLandscapeMobile = isMobile && w > h && h <= 540;
  return { isMobile, isLandscapeMobile };
}

/* ────────────────────────────────────────────
   Helper Functions (KST Standard)
   ──────────────────────────────────────────── */
function getToday() {
  return getTodayDateKST();
}

function getDaysDiff(startDate, endDate) {
  return diffDays(startDate, endDate);
}

function formatDateStr(d) {
  return formatDateObj(d);
}

function getKoreanDay(dayNum) {
  return getKoreanDayName(dayNum);
}

function addDays(date, days) {
  return addDaysToDate(date, days);
}

function getShortGameName(gameName) {
  const mapping = {
    '붕괴: 스타레일': '스타레일',
    '젠레스 존 제로': '젠존제',
    '원신': '원신',
    '명조': '명조',
    '명일방주: 엔드필드': '엔드필드',
  };
  return mapping[gameName] || gameName;
}

function hexToRgb(hex) {
  if (!hex || typeof hex !== 'string') return '99, 102, 241';
  const c = hex.replace('#', '');
  if (c.length === 3) {
    const r = parseInt(c.substring(0, 1).repeat(2), 16);
    const g = parseInt(c.substring(1, 2).repeat(2), 16);
    const b = parseInt(c.substring(2, 3).repeat(2), 16);
    return `${r}, ${g}, ${b}`;
  }
  if (c.length === 6) {
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    return `${r}, ${g}, ${b}`;
  }
  return '99, 102, 241';
}

/* ────────────────────────────────────────────
   GanttView Component (v1.3.0 Architectural Timeline)
   ──────────────────────────────────────────── */
export default function GanttView({
  events,
  gamesConfig,
  activeGames,
  onToggleGame,
  onEventClick,
  jumpTodayTrigger,
}) {
  const wrapperRef = useRef(null);
  const scrollRef = useRef(null);
  const scrollRafRef = useRef(null);
  const prevLayoutRef = useRef({ cellWidth: null, gameColWidth: null });
  const [viewportInfo, setViewportInfo] = useState(getViewportSnapshot);
  const [mobileZoom, setMobileZoom] = useState('overview');
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [hoverPreview, setHoverPreview] = useState(null);
  const [isTodayPing, setIsTodayPing] = useState(false);
  const todayPingTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (todayPingTimerRef.current) clearTimeout(todayPingTimerRef.current);
    };
  }, []);

  const hoveredDateRange = useMemo(() => {
    if (!hoverPreview?.ev) return null;
    const ev = hoverPreview.ev;
    const startStr = ev.start_date || ev.date;
    if (!startStr) return null;
    const endStr = ev.end_date || startStr;
    return {
      startStr,
      endStr,
      color: hoverPreview.color || '#6ee7b7',
      rgb: hexToRgb(hoverPreview.color || '#6ee7b7'),
    };
  }, [hoverPreview]);

  useEffect(() => {
    const checkViewport = () => {
      const next = getViewportSnapshot();
      setViewportInfo((prev) =>
        prev.isMobile === next.isMobile && prev.isLandscapeMobile === next.isLandscapeMobile
          ? prev
          : next
      );
    };
    checkViewport();
    window.addEventListener('resize', checkViewport);
    window.addEventListener('orientationchange', checkViewport);
    return () => {
      window.removeEventListener('resize', checkViewport);
      window.removeEventListener('orientationchange', checkViewport);
    };
  }, []);

  const { isMobile, isLandscapeMobile } = viewportInfo;
  const effectiveFocusMode = isMobile && isFocusMode;
  const isCompactScale = isMobile && mobileZoom === 'overview';

  useEffect(() => {
    if (!isMobile && isFocusMode) {
      setIsFocusMode(false);
    }
  }, [isMobile, isFocusMode]);

  useLayoutEffect(() => {
    if (effectiveFocusMode) {
      wrapperRef.current?.closest('.view-stage')?.classList.add('view-stage--settled');
    }
    document.body.classList.toggle('gantt-focus-active', effectiveFocusMode);
    return () => {
      document.body.classList.remove('gantt-focus-active');
    };
  }, [effectiveFocusMode]);

  const cellWidth = !isMobile
    ? DESKTOP_CELL_WIDTH
    : isCompactScale
    ? MOBILE_OVERVIEW_CELL_WIDTH
    : MOBILE_DETAIL_CELL_WIDTH;
  const gameColWidth = !isMobile
    ? DESKTOP_GAME_COL_WIDTH
    : isLandscapeMobile
    ? MOBILE_LANDSCAPE_GAME_COL_WIDTH
    : MOBILE_GAME_COL_WIDTH;
  const lanePitch = !isMobile ? 34 : isCompactScale ? 20 : 28;

  const today = useMemo(() => getToday(), []);
  const todayStr = useMemo(() => formatDateStr(today), [today]);

  /* ── Build date axis & month span groups ── */
  const dateAxis = useMemo(() => {
    const start = addDays(today, -DATE_RANGE_BEFORE);
    const totalDays = DATE_RANGE_BEFORE + DATE_RANGE_AFTER + 1;
    const axis = [];
    for (let i = 0; i < totalDays; i++) {
      const d = addDays(start, i);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const dayOfMonth = d.getDate();
      axis.push({
        date: d,
        dateStr: formatDateStr(d),
        year: y,
        month: m,
        dayOfMonth,
        dayOfWeek: d.getDay(),
        isMonthStart: dayOfMonth === 1,
        label: `${m}/${dayOfMonth}`,
        dayName: getKoreanDay(d.getDay()),
        isToday: formatDateStr(d) === todayStr,
        isWeekend: d.getDay() === 0 || d.getDay() === 6,
      });
    }
    return axis;
  }, [today, todayStr]);

  const monthSpans = useMemo(() => {
    const spans = [];
    for (const day of dateAxis) {
      const key = `${day.year}-${day.month}`;
      const last = spans[spans.length - 1];
      if (!last || last.key !== key) {
        spans.push({
          key,
          label: `${day.year}년 ${day.month}월`,
          shortLabel: `${day.month}월`,
          count: 1,
        });
      } else {
        last.count += 1;
      }
    }
    return spans;
  }, [dateAxis]);

  const axisStartStr = useMemo(() => dateAxis[0]?.dateStr, [dateAxis]);

  /* ── Determine unique games present in events ── */
  const gameNames = useMemo(() => {
    const seen = new Set();
    const names = [];
    if (!events) return names;
    events.forEach((ev) => {
      if (ev.game && !seen.has(ev.game)) {
        seen.add(ev.game);
        names.push(ev.game);
      }
    });
    const configKeys = gamesConfig ? Object.keys(gamesConfig) : [];
    names.sort((a, b) => {
      const ia = configKeys.indexOf(a);
      const ib = configKeys.indexOf(b);
      if (ia === -1 && ib === -1) return 0;
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
    return names;
  }, [events, gamesConfig]);

  /* ── Group events by game (종료 후 14일 경과한 과거 오프라인 행사는 레인 생성 제외) ── */
  const offlineCutoffStr = useMemo(() => formatDateStr(addDays(today, -14)), [today]);

  const eventsByGame = useMemo(() => {
    const map = {};
    if (!events) return map;
    gameNames.forEach((g) => (map[g] = []));
    events.forEach((ev) => {
      if (!map[ev.game]) return;
      if (ev.type === '오프라인이벤트' || ev.type === '행사') {
        const endDate = ev.end_date || ev.start_date || ev.date;
        if (endDate < offlineCutoffStr) return;
      }
      map[ev.game].push(ev);
    });
    return map;
  }, [events, gameNames, offlineCutoffStr]);

  /* ── 게임별 동적 레인 맵 생성 ── */
  const gameLanesMap = useMemo(() => {
    const map = {};
    gameNames.forEach((gameName) => {
      const gameEvents = eventsByGame[gameName] || [];
      const baseLanes = ['전반업데이트', '후반업데이트', '공식방송'];

      const extraTypes = new Set();
      gameEvents.forEach((ev) => {
        const target = ev.lane_override || ev.type;
        if (target && !baseLanes.includes(target)) {
          extraTypes.add(target);
        }
      });

      map[gameName] = [...baseLanes, ...Array.from(extraTypes)];
    });
    return map;
  }, [gameNames, eventsByGame]);

  /* ── Calculate event bar positions ── */
  const getBarStyle = useCallback(
    (ev) => {
      if (!ev.start_date) return null;

      const startOffset = getDaysDiff(axisStartStr, ev.start_date);
      const endOffset = ev.end_date
        ? getDaysDiff(axisStartStr, ev.end_date)
        : startOffset;
      const spanDays = Math.max(endOffset - startOffset + 1, 1);

      return {
        left: startOffset * cellWidth,
        width: spanDays * cellWidth,
        startOffset,
        endOffset,
        spanDays,
      };
    },
    [axisStartStr, cellWidth]
  );

  /* ── Sticky Bar Label용 스크롤 오프셋 CSS 변수 동기화 (rAF 기반, 리렌더링 0회) ── */
  const syncScrollCssVar = useCallback(() => {
    if (!scrollRef.current) return;
    scrollRef.current.style.setProperty(
      '--gantt-scroll-left',
      `${scrollRef.current.scrollLeft}px`
    );
  }, []);

  const handleContainerScroll = useCallback(() => {
    if (!isMobile) {
      setHoverPreview((prev) => (prev ? null : prev));
    }
    if (scrollRafRef.current) return;
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null;
      syncScrollCssVar();
    });
  }, [isMobile, syncScrollCssVar]);

  useEffect(() => {
    return () => {
      if (scrollRafRef.current) {
        cancelAnimationFrame(scrollRafRef.current);
      }
    };
  }, []);

  /* ── Scroll to today & quick week jump helpers ── */
  const scrollToToday = useCallback(
    (smooth = false) => {
      if (!scrollRef.current) return;
      const todayIndex = dateAxis.findIndex((d) => d.isToday);
      if (todayIndex === -1) return;
      const scrollTarget = Math.max(
        0,
        todayIndex * cellWidth - (scrollRef.current.clientWidth - gameColWidth) / 2
      );
      if (smooth) {
        scrollRef.current.scrollTo({ left: scrollTarget, behavior: 'smooth' });
        setIsTodayPing(false);
        requestAnimationFrame(() => setIsTodayPing(true));
        if (todayPingTimerRef.current) clearTimeout(todayPingTimerRef.current);
        todayPingTimerRef.current = setTimeout(() => setIsTodayPing(false), 780);
      } else {
        scrollRef.current.scrollLeft = scrollTarget;
      }
      requestAnimationFrame(syncScrollCssVar);
    },
    [dateAxis, cellWidth, gameColWidth, syncScrollCssVar]
  );

  const scrollByDays = useCallback(
    (days) => {
      if (!scrollRef.current) return;
      const container = scrollRef.current;
      const maxScroll = Math.max(0, container.scrollWidth - container.clientWidth);
      const target = Math.min(
        maxScroll,
        Math.max(0, container.scrollLeft + days * cellWidth)
      );
      container.scrollTo({ left: target, behavior: 'smooth' });
      requestAnimationFrame(syncScrollCssVar);
    },
    [cellWidth, syncScrollCssVar]
  );

  /* ── 모바일 전용 비충돌 레인 압축 (빈 레인 제거 및 겹치지 않는 전·후반 한 줄 배치) ── */
  const mobilePackingMap = useMemo(() => {
    if (!isMobile || !axisStartStr) return null;
    const maxDayIdx = dateAxis.length - 1;
    const result = {};

    const packIntoLanes = (items, baseLaneOffset) => {
      const laneEndOffsets = [];
      const assignments = new Map();
      const sorted = [...items].sort((a, b) => a.startOffset - b.startOffset);

      sorted.forEach(({ ev, startOffset, visualEnd }) => {
        let chosenLane = laneEndOffsets.findIndex((lastEnd) => startOffset > lastEnd);
        if (chosenLane === -1) {
          chosenLane = laneEndOffsets.length;
          laneEndOffsets.push(visualEnd);
        } else {
          laneEndOffsets[chosenLane] = Math.max(laneEndOffsets[chosenLane], visualEnd);
        }
        assignments.set(ev, baseLaneOffset + chosenLane);
      });

      return { laneCount: laneEndOffsets.length, assignments };
    };

    gameNames.forEach((gameName) => {
      const gameEvents = eventsByGame[gameName] || [];
      const patchItems = [];
      const specialItems = [];

      gameEvents.forEach((ev) => {
        if (!ev.start_date) return;
        const startOffset = getDaysDiff(axisStartStr, ev.start_date);
        const endOffset = ev.end_date ? getDaysDiff(axisStartStr, ev.end_date) : startOffset;
        const isStream = ev.type === '공식방송';
        const isOffline = ev.type === '오프라인이벤트' || ev.type === '행사';
        const visualEnd = isStream
          ? startOffset + (isCompactScale ? 3 : 4)
          : isOffline && endOffset === startOffset && isCompactScale
          ? endOffset + 1
          : endOffset;

        if (visualEnd < 0 || startOffset > maxDayIdx) return;

        if (ev.type === '전반업데이트' || ev.type === '후반업데이트') {
          patchItems.push({ ev, startOffset, visualEnd });
        } else {
          specialItems.push({ ev, startOffset, visualEnd });
        }
      });

      const patchPacked = packIntoLanes(patchItems, 0);
      const baseSpecialLane = Math.max(patchPacked.laneCount, 1);
      const specialPacked = packIntoLanes(specialItems, baseSpecialLane);
      const mergedMap = new Map([...patchPacked.assignments, ...specialPacked.assignments]);

      result[gameName] = {
        laneMap: mergedMap,
        laneCount: Math.max(patchPacked.laneCount, 1) + specialPacked.laneCount,
      };
    });

    return result;
  }, [isMobile, isCompactScale, axisStartStr, dateAxis.length, gameNames, eventsByGame]);

  /* ── Auto-scroll to today on initial mount, or preserve center day before paint ── */
  useLayoutEffect(() => {
    const container = scrollRef.current;
    const prev = prevLayoutRef.current;

    if (prev.cellWidth === null) {
      if (container) {
        const todayIndex = dateAxis.findIndex((d) => d.isToday);
        if (todayIndex !== -1) {
          container.scrollLeft = Math.max(
            0,
            todayIndex * cellWidth - (container.clientWidth - gameColWidth) / 2
          );
          syncScrollCssVar();
        }
      }
    } else if (
      container &&
      (prev.cellWidth !== cellWidth || prev.gameColWidth !== gameColWidth)
    ) {
      const oldViewport = Math.max(100, container.clientWidth - (prev.gameColWidth || 0));
      const centerDayFloat = (container.scrollLeft + oldViewport / 2) / prev.cellWidth;
      const nextViewport = Math.max(100, container.clientWidth - gameColWidth);
      container.scrollLeft = Math.max(0, centerDayFloat * cellWidth - nextViewport / 2);
      syncScrollCssVar();
    }

    prevLayoutRef.current = { cellWidth, gameColWidth };
  }, [cellWidth, gameColWidth, dateAxis, syncScrollCssVar]);

  /* ── 외부 [오늘 MM.DD] 버튼 클릭 시 오늘 위치로 스크롤 ── */
  useEffect(() => {
    if (!jumpTodayTrigger) return;
    scrollToToday(true);
  }, [jumpTodayTrigger, scrollToToday]);

  /* ── PC 뷰: 마우스 휠 가로 스크롤 ── */
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const handleWheel = (e) => {
      if (e.deltaY !== 0) {
        const isAtStart = container.scrollLeft <= 0;
        const isAtEnd =
          container.scrollLeft + container.clientWidth >= container.scrollWidth - 1;
        const scrollingRight = e.deltaY > 0;
        const scrollingLeft = e.deltaY < 0;

        if ((scrollingRight && !isAtEnd) || (scrollingLeft && !isAtStart)) {
          e.preventDefault();
          container.scrollLeft += e.deltaY * 0.85;
          syncScrollCssVar();
        }
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [syncScrollCssVar]);

  /* ── PC 뷰: 마우스 드래그 가로 스크롤 ── */
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    let isDown = false;
    let startX;
    let scrollLeftVal;
    let isDragging = false;
    let dragStartX = 0;

    const handleMouseDown = (e) => {
      if (e.button !== 0) return;
      if (e.target.closest('button, a')) return;
      isDown = true;
      container.classList.add('gantt-container--dragging');
      startX = e.pageX - container.offsetLeft;
      scrollLeftVal = container.scrollLeft;
      isDragging = false;
      dragStartX = e.pageX;
    };

    const handleMouseLeave = () => {
      isDown = false;
      container.classList.remove('gantt-container--dragging');
    };

    const handleMouseUp = () => {
      isDown = false;
      container.classList.remove('gantt-container--dragging');

      if (isDragging) {
        const handlePreventClick = (evt) => {
          evt.stopPropagation();
          evt.preventDefault();
          window.removeEventListener('click', handlePreventClick, true);
        };
        window.addEventListener('click', handlePreventClick, true);
      }
    };

    const handleMouseMove = (e) => {
      if (!isDown) return;
      const x = e.pageX - container.offsetLeft;
      const walk = (x - startX) * 1.3;
      if (Math.abs(e.pageX - dragStartX) > 5) {
        isDragging = true;
        setHoverPreview(null);
      }
      if (isDragging) {
        e.preventDefault();
        container.scrollLeft = scrollLeftVal - walk;
        syncScrollCssVar();
      }
    };

    container.addEventListener('mousedown', handleMouseDown);
    container.addEventListener('mouseleave', handleMouseLeave);
    container.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('mousemove', handleMouseMove);

    return () => {
      container.removeEventListener('mousedown', handleMouseDown);
      container.removeEventListener('mouseleave', handleMouseLeave);
      container.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('mousemove', handleMouseMove);
    };
  }, [syncScrollCssVar]);

  const getGameColor = useCallback(
    (gameName) => gamesConfig?.[gameName]?.theme?.color || '#6ee7b7',
    [gamesConfig]
  );

  const getGameColorDark = useCallback(
    (gameName) => gamesConfig?.[gameName]?.theme?.colorDark || '#10b981',
    [gamesConfig]
  );

  /* ── Desktop Floating Hover Preview Handlers ── */
  const handleBarMouseEnter = useCallback(
    (e, ev, gameName, color, displayType) => {
      if (isMobile) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const clientX = e.clientX || rect.left + Math.min(rect.width / 2, 120);
      const showBelow = rect.top < 185;
      const anchorY = showBelow ? rect.bottom + 10 : rect.top - 10;
      setHoverPreview({
        ev,
        gameName,
        color,
        displayType,
        x: Math.min(Math.max(clientX, 175), window.innerWidth - 175),
        y: anchorY,
        showBelow,
      });
    },
    [isMobile]
  );

  const handleBarMouseMove = useCallback(
    (e) => {
      if (isMobile) return;
      const clientX = e.clientX;
      setHoverPreview((prev) => {
        if (!prev) return null;
        const nextX = Math.min(Math.max(clientX, 175), window.innerWidth - 175);
        if (Math.abs(prev.x - nextX) < 3) return prev;
        return { ...prev, x: nextX };
      });
    },
    [isMobile]
  );

  const handleBarMouseLeave = useCallback(() => {
    setHoverPreview(null);
  }, []);

  /* ── Render a single event bar (Clean Architectural Bar without smudged image) ── */
  const renderEventBar = useCallback(
    (ev, gameName) => {
      const bar = getBarStyle(ev);
      if (!bar) return null;

      const color = getGameColor(gameName);
      const colorDark = getGameColorDark(gameName);
      const rgb = hexToRgb(color);
      const isFixed = ev.is_fixed === true;
      const displayType = formatEventTypeLabel(ev.type);
      const isStream = ev.type === '공식방송';
      const isHalfUpdate = ev.type === '후반업데이트';

      const lanes = gameLanesMap[gameName] || ['전반업데이트', '후반업데이트', '공식방송'];
      const targetType = ev.lane_override || ev.type;
      const packedLane = mobilePackingMap?.[gameName]?.laneMap?.get(ev);
      const laneIndex =
        isMobile && packedLane !== undefined
          ? packedLane
          : lanes.indexOf(targetType) !== -1
          ? lanes.indexOf(targetType)
          : 0;
      const topPos = `${laneIndex * lanePitch + (isCompactScale ? 2 : 4)}px`;
      const barHeight = !isMobile ? '27px' : isCompactScale ? '17px' : '23px';
      const displayBarWidth =
        bar.spanDays > 1 && bar.width >= 20 ? Math.max(bar.width - 2, 16) : bar.width;

      const hoverHandlers = isMobile
        ? {}
        : {
            onMouseEnter: (e) => handleBarMouseEnter(e, ev, gameName, color, displayType),
            onMouseMove: handleBarMouseMove,
            onMouseLeave: handleBarMouseLeave,
          };

      const isOfflineEvent = ev.type === '오프라인이벤트' || ev.type === '행사';
      if (isOfflineEvent) {
        const cleanOfflineTitle = cleanEventDisplayTitle(ev.title, gameName);
        const isCompactSinglePin = isCompactScale && bar.spanDays === 1;
        const offlineBarWidth = isCompactSinglePin ? Math.max(bar.width, 22) : displayBarWidth;
        const offlineLeft = isCompactSinglePin ? bar.left - Math.max((22 - bar.width) / 2, 0) : bar.left;
        return (
          <div
            key={ev.id || `${gameName}-offline-${ev.start_date}`}
            className={`gantt-bar gantt-bar-offline${
              isCompactSinglePin ? ' gantt-bar--compact-pin' : ''
            }`}
            style={{
              left: `${offlineLeft}px`,
              width: `${offlineBarWidth}px`,
              top: topPos,
              height: barHeight,
              '--bar-color': color,
              '--bar-color-dark': colorDark,
              '--bar-rgb': rgb,
              '--bar-left': `${offlineLeft}px`,
              '--bar-width': `${offlineBarWidth}px`,
              backgroundColor: `rgba(${rgb}, 0.14)`,
              border: `1px solid rgba(${rgb}, 0.55)`,
              borderLeft: `3px solid ${color}`,
            }}
            onClick={(e) => {
              e.stopPropagation();
              onEventClick?.(ev, displayType, 'gantt');
            }}
            {...hoverHandlers}
          >
            <span className="gantt-bar-label">
              <MapPin size={isCompactScale ? 10 : 11} style={{ flexShrink: 0, color }} />
              {!isCompactSinglePin && (
                <span className="gantt-bar-label__text">{cleanOfflineTitle}</span>
              )}
            </span>
          </div>
        );
      }

      if (isStream) {
        const flagBgColor = isFixed ? color : 'rgba(24, 31, 46, 0.88)';
        const badgeLabel = isFixed ? 'LIVE' : '예상';
        const verTag = formatEventVersion(ev.version, { stripPhase: true });
        const streamText = isCompactScale
          ? verTag || '방송'
          : verTag
          ? `${verTag} 특별 방송`
          : '특별 방송';

        return (
          <div
            key={ev.id || `${gameName}-stream-${ev.start_date}`}
            className={`gantt-bar-stream ${
              isFixed ? 'gantt-bar-stream--confirmed' : 'gantt-bar-stream--predicted'
            }`}
            style={{
              left: `${bar.left}px`,
              top: `${laneIndex * lanePitch + (isCompactScale ? 1 : isMobile ? 2 : 3)}px`,
              '--stream-color': color,
              '--stream-color-dark': colorDark,
            }}
            onClick={(e) => {
              e.stopPropagation();
              onEventClick?.(ev, displayType, 'gantt');
            }}
            {...hoverHandlers}
          >
            <div
              className="gantt-stream-flag"
              style={{
                backgroundColor: flagBgColor,
                color: isFixed ? '#07090f' : '#e2e8f0',
                border: isFixed ? 'none' : `1px dashed rgba(${rgb}, 0.65)`,
              }}
            >
              <Radio size={isCompactScale ? 9 : 10} className="gantt-live-icon" />
              <span className="gantt-live-badge">{badgeLabel}</span>
            </div>
            <span className="gantt-stream-label">
              {streamText}
              {!isCompactScale && ev.time && <span className="gantt-stream-time">{ev.time}</span>}
            </span>
          </div>
        );
      }

      const isSystemType = ['전반업데이트', '후반업데이트'].includes(ev.type);
      const verTag = formatEventVersion(ev.version, { stripPhase: true });
      const shortTypeLabel =
        ev.type === '전반업데이트'
          ? isMobile
            ? '전반'
            : '버전 업데이트'
          : ev.type === '후반업데이트'
          ? isMobile
            ? '후반'
            : '후반 픽업'
          : displayType;

      const textLabel = isSystemType ? shortTypeLabel : cleanEventDisplayTitle(ev.title, gameName);

      const barClassName = !isFixed
        ? 'gantt-bar gantt-bar-predicted'
        : isHalfUpdate
        ? 'gantt-bar gantt-bar-confirmed gantt-bar-confirmed-half'
        : 'gantt-bar gantt-bar-confirmed gantt-bar-main';

      const barInlineStyle = !isFixed
        ? {
            left: `${bar.left}px`,
            width: `${displayBarWidth}px`,
            top: topPos,
            height: barHeight,
            '--bar-color': color,
            '--bar-color-dark': colorDark,
            '--bar-rgb': rgb,
            '--bar-left': `${bar.left}px`,
            '--bar-width': `${displayBarWidth}px`,
            backgroundColor: `rgba(${rgb}, 0.1)`,
            borderColor: `rgba(${rgb}, 0.52)`,
          }
        : {
            left: `${bar.left}px`,
            width: `${displayBarWidth}px`,
            top: topPos,
            height: barHeight,
            '--bar-color': color,
            '--bar-color-dark': colorDark,
            '--bar-rgb': rgb,
            '--bar-left': `${bar.left}px`,
            '--bar-width': `${displayBarWidth}px`,
            backgroundColor: color,
            borderColor: color,
          };

      return (
        <div
          key={ev.id || `${gameName}-${ev.type}-${ev.start_date}`}
          className={barClassName}
          style={barInlineStyle}
          onClick={(e) => {
            e.stopPropagation();
            onEventClick?.(ev, displayType, 'gantt');
          }}
          {...hoverHandlers}
        >
          <span className="gantt-bar-label">
            {!isFixed && <span className="gantt-predicted-pill">예상</span>}
            {verTag && <span className="gantt-bar-ver-pill">{verTag}</span>}
            <span className="gantt-bar-label__text">{textLabel}</span>
          </span>
        </div>
      );
    },
    [
      getBarStyle,
      getGameColor,
      getGameColorDark,
      onEventClick,
      gameLanesMap,
      mobilePackingMap,
      lanePitch,
      isMobile,
      isCompactScale,
      handleBarMouseEnter,
      handleBarMouseMove,
      handleBarMouseLeave,
    ]
  );

  const todayIndex = useMemo(() => dateAxis.findIndex((d) => d.isToday), [dateAxis]);
  const totalGridWidth = dateAxis.length * cellWidth;

  /* ── Compute Floating Tooltip Details ── */
  const tooltipDetails = useMemo(() => {
    if (!hoverPreview) return null;
    const { ev, gameName, color, displayType, x, y, showBelow } = hoverPreview;
    const startStr = ev.start_date || ev.date;
    const endStr = ev.end_date || startStr;
    const isSingleDay = !endStr || startStr === endStr;

    const dateRangeText = isSingleDay
      ? `${formatDisplayDate(startStr, true)}${ev.time ? ` · ${ev.time}` : ''}`
      : `${formatDisplayDate(startStr, false)} ~ ${formatDisplayDate(endStr, false)}`;

    const diffStart = getDaysDiff(todayStr, startStr);
    const diffEnd = getDaysDiff(todayStr, endStr);
    let dDayLabel = '';
    let dDayStatus = 'ongoing';

    if (todayStr < startStr) {
      dDayLabel = `D-${diffStart}`;
      dDayStatus = 'upcoming';
    } else if (isSingleDay && todayStr === startStr) {
      dDayLabel = 'TODAY';
      dDayStatus = 'today';
    } else if (todayStr >= startStr && todayStr <= endStr) {
      dDayLabel = diffEnd === 0 ? '진행 중 · 오늘 종료' : `진행 중 · ${diffEnd}일 남음`;
      dDayStatus = 'ongoing';
    } else {
      dDayLabel = '종료됨';
      dDayStatus = 'ended';
    }

    const verTag = formatEventVersion(ev.version, { stripPhase: true });
    const typeLabel = formatEventTypeLabel(ev.type) || displayType;
    const cleanTitle = ev.title
      ? cleanEventDisplayTitle(ev.title, gameName)
      : verTag
      ? `${verTag} ${typeLabel}`
      : `${gameName} ${typeLabel}`;

    const rawDetailSource = ev.details || ev.detail;
    const summaryText = rawDetailSource
      ? getCleanSummaryText(rawDetailSource, 92)
      : ev.location
      ? `장소: ${ev.location}`
      : '';

    return {
      gameName,
      color,
      verTag,
      typeLabel,
      isFixed: ev.is_fixed === true,
      cleanTitle,
      dateRangeText,
      dDayLabel,
      dDayStatus,
      summaryText,
      x,
      y,
      showBelow,
    };
  }, [hoverPreview, todayStr]);

  return (
    <div
      ref={wrapperRef}
      className={[
        'gantt-view-wrapper',
        isMobile ? 'gantt-view-wrapper--mobile' : '',
        isCompactScale ? 'gantt-view-wrapper--overview' : '',
        effectiveFocusMode ? 'gantt-view-wrapper--focused' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {isMobile && (
        <div className="gantt-mobile-toolbar" role="toolbar" aria-label="모바일 간트 차트 제어">
          <div className="gantt-mobile-nav">
            <button
              type="button"
              className="gantt-mobile-btn"
              onClick={() => scrollByDays(isCompactScale ? -14 : -7)}
              title={isCompactScale ? '2주 이전으로 이동' : '1주 이전으로 이동'}
            >
              {isCompactScale ? '◀ 2주' : '◀ 1주'}
            </button>
            <button
              type="button"
              className="gantt-mobile-btn is-today"
              onClick={() => scrollToToday(true)}
              title="오늘 날짜로 이동"
            >
              오늘
            </button>
            <button
              type="button"
              className="gantt-mobile-btn"
              onClick={() => scrollByDays(isCompactScale ? 14 : 7)}
              title={isCompactScale ? '2주 이후로 이동' : '1주 이후로 이동'}
            >
              {isCompactScale ? '2주 ▶' : '1주 ▶'}
            </button>
          </div>

          <div className="gantt-mobile-actions">
            <div className="gantt-zoom-toggle" role="group" aria-label="간트 차트 배율 전환">
              <button
                type="button"
                className={`gantt-zoom-btn ${mobileZoom === 'overview' ? 'is-active' : ''}`}
                onClick={() => setMobileZoom('overview')}
                aria-pressed={mobileZoom === 'overview'}
                title="한눈에 보기 (축소 배율)"
              >
                축소
              </button>
              <button
                type="button"
                className={`gantt-zoom-btn ${mobileZoom === 'detail' ? 'is-active' : ''}`}
                onClick={() => setMobileZoom('detail')}
                aria-pressed={mobileZoom === 'detail'}
                title="날짜별 상세 보기 (확대 배율)"
              >
                확대
              </button>
            </div>

            <button
              type="button"
              className={`gantt-focus-btn ${effectiveFocusMode ? 'is-active' : ''}`}
              onClick={() => setIsFocusMode((prev) => !prev)}
              aria-pressed={effectiveFocusMode}
              title={effectiveFocusMode ? '전체화면 닫기' : '간트 차트 크게 보기'}
            >
              {effectiveFocusMode ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              <span>{effectiveFocusMode ? '닫기' : '전체'}</span>
            </button>
          </div>
        </div>
      )}

      <div
        className="gantt-container"
        ref={scrollRef}
        onScroll={handleContainerScroll}
      >
        <div
          className="gantt-grid"
          style={{
            width: `${gameColWidth + totalGridWidth}px`,
            '--gantt-game-col-w': `${gameColWidth}px`,
            '--bar-label-reserve': isCompactScale ? '48px' : '96px',
          }}
        >
          {/* ═══ Header Row (2-Tier: Month Span + Date Row) ═══ */}
          <div className="gantt-header">
            <div
              className="gantt-header-game gantt-sticky-intersect"
              style={{ width: `${gameColWidth}px`, minWidth: `${gameColWidth}px` }}
            >
              <span className="gantt-header-game-label">
                게임 / 일정
              </span>
              {!isMobile && (
                <div className="gantt-quick-nav" role="group" aria-label="타임라인 주간 빠른 이동">
                  <button
                    type="button"
                    className="gantt-quick-nav__btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      scrollByDays(-7);
                    }}
                    title="1주일 이전으로 스크롤"
                  >
                    ◀ -7일
                  </button>
                  <button
                    type="button"
                    className="gantt-quick-nav__btn gantt-quick-nav__btn--today"
                    onClick={(e) => {
                      e.stopPropagation();
                      scrollToToday(true);
                    }}
                    title="오늘 날짜로 이동"
                  >
                    오늘
                  </button>
                  <button
                    type="button"
                    className="gantt-quick-nav__btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      scrollByDays(7);
                    }}
                    title="1주일 이후로 스크롤"
                  >
                    +7일 ▶
                  </button>
                </div>
              )}
            </div>

            <div className="gantt-header-timeline-col">
              {/* Tier 1: 연·월(Month) 스팬 바 */}
              <div className="gantt-header-months">
                {monthSpans.map((mSpan) => (
                  <div
                    key={mSpan.key}
                    className="gantt-header-month-cell"
                    style={{
                      width: `${mSpan.count * cellWidth}px`,
                      minWidth: `${mSpan.count * cellWidth}px`,
                    }}
                  >
                    <span className="gantt-header-month-label">
                      {mSpan.count >= 3 ? mSpan.label : mSpan.shortLabel}
                    </span>
                  </div>
                ))}
              </div>

              {/* Tier 2: 일자(Date) & 요일 헤더 */}
              <div className="gantt-header-dates">
                {dateAxis.map((day, idx) => {
                  const showOverviewTick =
                    !isCompactScale ||
                    day.isToday ||
                    (day.dayOfWeek === 1 && Math.abs(idx - todayIndex) > 2);
                  const isBarHovered =
                    hoveredDateRange &&
                    day.dateStr >= hoveredDateRange.startStr &&
                    day.dateStr <= hoveredDateRange.endStr;
                  const isBarEdge =
                    hoveredDateRange &&
                    (day.dateStr === hoveredDateRange.startStr ||
                      day.dateStr === hoveredDateRange.endStr);

                  return (
                    <div
                      key={day.dateStr}
                      className={`gantt-header-cell${day.isToday ? ' gantt-header-today' : ''}${
                        day.isToday && isTodayPing ? ' gantt-header-today--ping' : ''
                      }${day.isWeekend ? ' gantt-header-weekend' : ''}${
                        day.isMonthStart ? ' gantt-header-month-start' : ''
                      }${isCompactScale ? ' gantt-header-cell--overview' : ''}${
                        isBarHovered ? ' gantt-header-cell--bar-hovered' : ''
                      }${isBarEdge ? ' gantt-header-cell--bar-edge' : ''}`}
                      style={{
                        width: `${cellWidth}px`,
                        minWidth: `${cellWidth}px`,
                        ...(isBarHovered
                          ? {
                              '--hover-bar-color': hoveredDateRange.color,
                              '--hover-bar-rgb': hoveredDateRange.rgb,
                            }
                          : {}),
                      }}
                    >
                      {showOverviewTick && (
                        <>
                          <span
                            className={`gantt-header-date${
                              isCompactScale ? ' gantt-header-tick' : ''
                            }`}
                          >
                            {day.label}
                          </span>
                          <span className="gantt-header-day">
                            {isCompactScale && day.isToday ? '오늘' : day.dayName}
                          </span>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ═══ Body Rows (비활성 게임은 1줄 빈 줄로 자연 축소 + 클릭 시 재활성화) ═══ */}
          <div className="gantt-body">
            {gameNames.map((gameName, rowIndex) => {
              const isCollapsed = activeGames && activeGames[gameName] === false;
              const gameEvents = eventsByGame[gameName] || [];
              const color = getGameColor(gameName);
              const gameIcon = gamesConfig?.[gameName]?.icon;

              const lanes = gameLanesMap[gameName] || ['전반업데이트', '후반업데이트', '공식방송'];
              const effectiveLaneCount = isMobile
                ? mobilePackingMap?.[gameName]?.laneCount || 1
                : lanes.length;
              const rowH = isCollapsed
                ? isCompactScale
                  ? 28
                  : ROW_HEIGHT_COLLAPSED
                : effectiveLaneCount * lanePitch + (isCompactScale ? 3 : isMobile ? 7 : 10);

              return (
                <div
                  key={gameName}
                  className={`gantt-row${isCollapsed ? ' gantt-row--collapsed' : ''}`}
                  style={{ height: `${rowH}px`, '--row-idx': rowIndex }}
                  onClick={isCollapsed ? () => onToggleGame?.(gameName) : undefined}
                  title={isCollapsed ? `${gameName} 일정 다시 활성화하기` : undefined}
                  role={isCollapsed ? 'button' : undefined}
                  tabIndex={isCollapsed ? 0 : undefined}
                  onKeyDown={
                    isCollapsed
                      ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onToggleGame?.(gameName);
                          }
                        }
                      : undefined
                  }
                >
                  <div
                    className="gantt-row-game gantt-sticky-col"
                    style={{
                      width: `${gameColWidth}px`,
                      minWidth: `${gameColWidth}px`,
                      '--game-color': color,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleGame?.(gameName);
                    }}
                    title={`${gameName} ${isCollapsed ? '일정 펼치기' : '일정 접기'}`}
                  >
                    <span
                      className="gantt-game-indicator"
                      style={{ backgroundColor: color }}
                    />

                    <div className="gantt-game-track-card">
                      {!isMobile && gameIcon && (
                        <img
                          src={gameIcon}
                          alt=""
                          className={`gantt-game-avatar${
                            isCollapsed ? ' gantt-game-avatar--sm' : ''
                          }`}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      )}
                      <div className="gantt-game-meta-group">
                        <span className="gantt-game-name" title={gameName}>
                          {isMobile ? getShortGameName(gameName) : gameName}
                        </span>
                        {!isMobile &&
                          !isCollapsed &&
                          (gamesConfig?.[gameName]?.officialUrl ||
                            gamesConfig?.[gameName]?.youtubeUrl) && (
                            <div className="gantt-game-links">
                              {gamesConfig?.[gameName]?.officialUrl && (
                                <a
                                  href={gamesConfig[gameName].officialUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="gantt-game-link-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    trackOutboundLink({
                                      linkCategory: 'official_site',
                                      platform: 'official_site',
                                      targetUrl: gamesConfig[gameName].officialUrl,
                                      game: gameName,
                                      title: `${gameName} 공식 사이트`,
                                    });
                                  }}
                                  title={`${gameName} 공식 사이트`}
                                  aria-label={`${gameName} 공식 사이트`}
                                >
                                  <Globe size={12} />
                                </a>
                              )}
                              {gamesConfig?.[gameName]?.youtubeUrl && (
                                <a
                                  href={gamesConfig[gameName].youtubeUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="gantt-game-youtube-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    trackChannelClick('gantt_row', gameName);
                                  }}
                                  title={`${gameName} 공식 유튜브 채널`}
                                  aria-label={`${gameName} 공식 유튜브 채널`}
                                >
                                  <Youtube size={12} />
                                </a>
                              )}
                            </div>
                          )}
                      </div>
                    </div>

                    {isCollapsed ? (
                      <ChevronRight size={13} className="gantt-chevron" />
                    ) : (
                      <ChevronDown size={13} className="gantt-chevron" />
                    )}
                  </div>

                  <div className="gantt-row-cells" style={{ width: `${totalGridWidth}px` }}>
                    {dateAxis.map((day) => (
                      <div
                        key={day.dateStr}
                        className={`gantt-cell${day.isToday ? ' gantt-cell-today' : ''}${
                          day.isWeekend ? ' gantt-cell-weekend' : ''
                        }${day.isMonthStart ? ' gantt-cell-month-start' : ''}`}
                        style={{ width: `${cellWidth}px`, minWidth: `${cellWidth}px` }}
                      />
                    ))}

                    {todayIndex >= 0 && (
                      <div
                        className="gantt-today-line"
                        style={{ left: `${todayIndex * cellWidth + cellWidth / 2}px` }}
                      />
                    )}

                    {/* 비활성화 시 간략화 바(.gantt-bar-collapsed) 없이 깔끔한 빈 줄만 표시 */}
                    {!isCollapsed && (
                      <div className="gantt-bars-layer">
                        {gameEvents.map((ev) => renderEventBar(ev, gameName))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Desktop Interactive Floating Hover Preview Tooltip */}
      {tooltipDetails && (
        <div
          className={`gantt-hover-tooltip ${
            tooltipDetails.showBelow ? 'is-below' : 'is-above'
          }`}
          style={{
            left: `${tooltipDetails.x}px`,
            top: `${tooltipDetails.y}px`,
            '--tooltip-accent': tooltipDetails.color,
          }}
          role="tooltip"
        >
          <div className="gantt-hover-tooltip__top">
            <span className="gantt-hover-tooltip__game">
              <span
                className="gantt-hover-tooltip__dot"
                style={{ backgroundColor: tooltipDetails.color }}
              />
              {tooltipDetails.gameName}
            </span>
            {tooltipDetails.verTag && (
              <span className="gantt-hover-tooltip__ver">{tooltipDetails.verTag}</span>
            )}
            <span className="gantt-hover-tooltip__type">{tooltipDetails.typeLabel}</span>
            {!tooltipDetails.isFixed && (
              <span className="gantt-hover-tooltip__status is-predicted">예상</span>
            )}
          </div>

          <div className="gantt-hover-tooltip__title">{tooltipDetails.cleanTitle}</div>

          <div className="gantt-hover-tooltip__meta">
            <span className="gantt-hover-tooltip__period">{tooltipDetails.dateRangeText}</span>
            <span className={`gantt-hover-tooltip__dday is-${tooltipDetails.dDayStatus}`}>
              {tooltipDetails.dDayLabel}
            </span>
          </div>

          {tooltipDetails.summaryText && (
            <p className="gantt-hover-tooltip__summary">{tooltipDetails.summaryText}</p>
          )}
        </div>
      )}
    </div>
  );
}
