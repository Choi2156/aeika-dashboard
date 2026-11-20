import { useState, useMemo, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Image as ImageIcon,
  X,
  Clock,
  MapPin,
  ArrowUpRight,
} from 'lucide-react';
import {
  extractCalendarMilestones,
  buildMonthGrid,
  partitionCellMilestones,
  CALENDAR_MIN_YEAR,
  CALENDAR_MIN_MONTH,
  compareYearMonth,
  getCalendarMaxYearMonth,
} from '../utils/calendarMilestones';
import { cleanEventDisplayTitle } from '../utils/eventTextParser';
import { getTodayStrKST, diffDays, formatDisplayDate } from '../utils/dateKST';
import { trackCalendarMonthChange } from '../utils/analytics';
import '../styles/CalendarView.css';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

const CATEGORY_DISPLAY = {
  update: '신규 버전 업데이트',
  half: '후반 픽업 전환',
  broadcast: '특별 방송',
  offline: '오프라인 행사',
};

const CALENDAR_LEGEND_ITEMS = [
  { key: 'update', label: '신규 버전 업데이트', swatchClass: 'is-update' },
  { key: 'half', label: '후반 픽업 전환', swatchClass: 'is-half' },
  { key: 'broadcast', label: '특별방송', swatchClass: 'is-broadcast', swatchText: 'LIVE' },
  { key: 'offline', label: '오프라인 행사', swatchClass: 'is-offline', isOfflinePin: true },
  { key: 'predicted', label: '주기 예상 (점선)', swatchClass: 'is-predicted' },
];

function matchesLegendFilter(item, filterKey) {
  if (!filterKey) return true;
  if (filterKey === 'predicted') return !item.isFixed;
  return item.category === filterKey;
}

function hexToRgbStr(hex) {
  if (!hex || typeof hex !== 'string') return '110, 231, 183';
  const clean = hex.replace('#', '');
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return `${r}, ${g}, ${b}`;
  }
  if (clean.length === 6) {
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return `${r}, ${g}, ${b}`;
  }
  return '110, 231, 183';
}

function getMilestoneDDayBadge(item, todayStr) {
  const targetDate = item.date;
  const raw = item.rawEvent;
  const dDiff = diffDays(todayStr, targetDate);

  if (dDiff === 0) {
    return { label: 'TODAY', variant: 'today' };
  }
  if (dDiff > 0) {
    return {
      label: `D-${dDiff}`,
      variant: dDiff <= 3 ? 'imminent' : 'upcoming',
    };
  }
  if (raw?.end_date && todayStr >= (raw.start_date || raw.date) && todayStr <= raw.end_date && !item.isEnd) {
    return { label: '진행 중', variant: 'ongoing' };
  }
  return { label: '종료', variant: 'past' };
}

function shiftYearMonth(y, m, delta) {
  const total = y * 12 + (m - 1) + delta;
  return {
    year: Math.floor(total / 12),
    month: ((total % 12) + 12) % 12 + 1,
  };
}

function chunkMonthWeeks(rawCells) {
  const rows = [];
  for (let i = 0; i < rawCells.length; i += 7) {
    rows.push(rawCells.slice(i, i + 7));
  }
  return rows;
}

/**
 * CalendarView v1.3.0 — Deep Violet-Indigo Full-Width 7열 월간 마일스톤 달력
 * - 100% 전체 폭 7열 그리드 + 부드러운 월 전환 애니메이션
 * - 4-Tier 마일스톤 칩 위계 (업데이트 솔리드 / 후반 픽업 틴트 / 특별방송 LIVE+시각 / 오프라인 🎪 / 예상 점선)
 * - 날짜 셀 선택 시 하단 슬림 아젠다 드로어(Day Agenda Bar) 표시 + 칩 1-클릭 DetailModal 직행
 */
export default function CalendarView({
  events,
  gamesConfig,
  activeGames,
  onEventClick,
  onOpenCalendarModal,
  jumpTodayTrigger,
}) {
  const todayStr = useMemo(() => getTodayStrKST(), []);
  const [todayYear, todayMonth] = useMemo(() => {
    const parts = todayStr.split('-').map(Number);
    return [parts[0] || 2026, parts[1] || 11];
  }, [todayStr]);

  const [year, setYear] = useState(todayYear);
  const [month, setMonth] = useState(todayMonth);
  const [transitionDir, setTransitionDir] = useState('none');
  const [selectedDateStr, setSelectedDateStr] = useState(null);
  const [pinnedLegend, setPinnedLegend] = useState(null);
  const [hoveredLegend, setHoveredLegend] = useState(null);
  const [isTodayPing, setIsTodayPing] = useState(false);
  const [trackOffsetPx, setTrackOffsetPx] = useState(0);
  const [isTrackAnimating, setIsTrackAnimating] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(null);
  const [isDraggingGrid, setIsDraggingGrid] = useState(false);
  const [isMobileGrid, setIsMobileGrid] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 768px)').matches : false
  );
  const activeLegendFilter = hoveredLegend || pinnedLegend;
  const viewportRef = useRef(null);
  const prevPaneRef = useRef(null);
  const currPaneRef = useRef(null);
  const nextPaneRef = useRef(null);
  const activeYMRef = useRef({ year: todayYear, month: todayMonth });
  const pendingNavRef = useRef(null);
  const slideTimerRef = useRef(null);
  const dragStateRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    startTime: 0,
    latchDx: 0,
    lastOffset: 0,
    horizontalLocked: false,
    didDrag: false,
    pointerId: null,
  });
  const suppressClickRef = useRef(false);
  const todayPingTimerRef = useRef(null);

  const milestones = useMemo(() => {
    return extractCalendarMilestones(events, activeGames);
  }, [events, activeGames]);

  const maxBounds = useMemo(
    () => getCalendarMaxYearMonth(events, todayYear, todayMonth),
    [events, todayYear, todayMonth]
  );

  const isPrevDisabled =
    compareYearMonth(year, month, CALENDAR_MIN_YEAR, CALENDAR_MIN_MONTH) <= 0;
  const isNextDisabled =
    compareYearMonth(year, month, maxBounds.year, maxBounds.month) >= 0;

  const prevYM = useMemo(() => shiftYearMonth(year, month, -1), [year, month]);
  const nextYM = useMemo(() => shiftYearMonth(year, month, 1), [year, month]);

  const { cells, weeks } = useMemo(() => {
    const { cells: rawCells } = buildMonthGrid(year, month, milestones, todayStr);
    return { cells: rawCells, weeks: chunkMonthWeeks(rawCells) };
  }, [year, month, milestones, todayStr]);

  const prevPaneWeeks = useMemo(() => {
    if (isPrevDisabled) return null;
    const { cells: rawCells } = buildMonthGrid(prevYM.year, prevYM.month, milestones, todayStr);
    return chunkMonthWeeks(rawCells);
  }, [isPrevDisabled, prevYM.year, prevYM.month, milestones, todayStr]);

  const nextPaneWeeks = useMemo(() => {
    if (isNextDisabled) return null;
    const { cells: rawCells } = buildMonthGrid(nextYM.year, nextYM.month, milestones, todayStr);
    return chunkMonthWeeks(rawCells);
  }, [isNextDisabled, nextYM.year, nextYM.month, milestones, todayStr]);

  useEffect(() => {
    activeYMRef.current = { year, month };
  }, [year, month]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia('(max-width: 768px)');
    const handleMqChange = (ev) => setIsMobileGrid(ev.matches);
    setIsMobileGrid(mq.matches);
    mq.addEventListener('change', handleMqChange);
    return () => {
      mq.removeEventListener('change', handleMqChange);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (todayPingTimerRef.current) clearTimeout(todayPingTimerRef.current);
      if (slideTimerRef.current) clearTimeout(slideTimerRef.current);
    };
  }, []);

  const triggerTodayPing = () => {
    setIsTodayPing(false);
    requestAnimationFrame(() => {
      setIsTodayPing(true);
    });
    if (todayPingTimerRef.current) clearTimeout(todayPingTimerRef.current);
    todayPingTimerRef.current = setTimeout(() => {
      setIsTodayPing(false);
    }, 760);
  };

  const clearSlideTimer = () => {
    if (slideTimerRef.current) {
      clearTimeout(slideTimerRef.current);
      slideTimerRef.current = null;
    }
  };

  const commitPendingNav = () => {
    clearSlideTimer();
    const pending = pendingNavRef.current;
    pendingNavRef.current = null;
    setIsTrackAnimating(false);
    setTrackOffsetPx(0);
    setViewportHeight(null);
    if (pending) {
      activeYMRef.current = { year: pending.toYear, month: pending.toMonth };
      setTransitionDir('none');
      setSelectedDateStr(null);
      setYear(pending.toYear);
      setMonth(pending.toMonth);
    }
  };

  useEffect(() => {
    if (!jumpTodayTrigger) return;
    clearSlideTimer();
    pendingNavRef.current = null;
    activeYMRef.current = { year: todayYear, month: todayMonth };
    setIsTrackAnimating(false);
    setTrackOffsetPx(0);
    setViewportHeight(null);
    setTransitionDir('reset');
    setYear(todayYear);
    setMonth(todayMonth);
    const todayHasItems = milestones.some((m) => m.date === todayStr);
    if (todayHasItems) {
      setSelectedDateStr(todayStr);
    }
    triggerTodayPing();
  }, [jumpTodayTrigger, todayYear, todayMonth, milestones, todayStr]);

  const selectedCell = useMemo(() => {
    if (!selectedDateStr) return null;
    const found = cells.find((c) => c && c.dateStr === selectedDateStr);
    if (!found || !found.milestones || found.milestones.length === 0) return null;
    return found;
  }, [cells, selectedDateStr]);

  const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;
  const monthMilestonesCount = useMemo(() => {
    return milestones.filter((m) => m.date.startsWith(monthPrefix)).length;
  }, [milestones, monthPrefix]);

  const slideToMonth = (dir, fromButton = false) => {
    // 연타 클릭 시 진행 중이던 전환을 즉시 확정해 월이 누락되지 않게 처리
    if (pendingNavRef.current) {
      const pending = pendingNavRef.current;
      const baseYM = { year: pending.toYear, month: pending.toMonth };
      const targetYM = shiftYearMonth(baseYM.year, baseYM.month, dir === 'next' ? 1 : -1);
      if (
        (dir === 'prev' && compareYearMonth(baseYM.year, baseYM.month, CALENDAR_MIN_YEAR, CALENDAR_MIN_MONTH) <= 0) ||
        (dir === 'next' && compareYearMonth(baseYM.year, baseYM.month, maxBounds.year, maxBounds.month) >= 0)
      ) {
        commitPendingNav();
        return;
      }
      clearSlideTimer();
      pendingNavRef.current = null;
      trackCalendarMonthChange({
        fromYear: baseYM.year,
        fromMonth: baseYM.month,
        toYear: targetYM.year,
        toMonth: targetYM.month,
      });
      activeYMRef.current = targetYM;
      setIsTrackAnimating(false);
      setTrackOffsetPx(0);
      setViewportHeight(null);
      setTransitionDir('none');
      setSelectedDateStr(null);
      setYear(targetYM.year);
      setMonth(targetYM.month);
      return;
    }

    if (dir === 'prev' && isPrevDisabled) return;
    if (dir === 'next' && isNextDisabled) return;

    const toYM = dir === 'next' ? nextYM : prevYM;
    trackCalendarMonthChange({
      fromYear: year,
      fromMonth: month,
      toYear: toYM.year,
      toMonth: toYM.month,
    });

    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const viewportEl = viewportRef.current;
    const width = viewportEl?.clientWidth || 0;

    if (reduceMotion || width <= 0) {
      activeYMRef.current = toYM;
      setIsTrackAnimating(false);
      setTrackOffsetPx(0);
      setViewportHeight(null);
      setTransitionDir('none');
      setSelectedDateStr(null);
      setYear(toYM.year);
      setMonth(toYM.month);
      return;
    }

    const startH = currPaneRef.current?.offsetHeight || viewportEl.offsetHeight;
    const targetPaneEl = dir === 'next' ? nextPaneRef.current : prevPaneRef.current;
    const targetH = targetPaneEl?.offsetHeight || startH;
    const needsHeightMorph = Boolean(startH && targetH && Math.abs(startH - targetH) > 1);

    pendingNavRef.current = { dir, toYear: toYM.year, toMonth: toYM.month };
    activeYMRef.current = toYM;
    setTransitionDir('none');
    if (needsHeightMorph) {
      setViewportHeight(startH);
    }

    const targetX = dir === 'next' ? -width : width;
    if (fromButton) {
      // 버튼/키보드 전환은 0에서 시작해 다음 프레임에 트랜지션 실행
      requestAnimationFrame(() => {
        setIsTrackAnimating(true);
        setTrackOffsetPx(targetX);
        if (needsHeightMorph) setViewportHeight(targetH);
      });
    } else {
      setIsTrackAnimating(true);
      setTrackOffsetPx(targetX);
      if (needsHeightMorph) {
        requestAnimationFrame(() => setViewportHeight(targetH));
      }
    }

    clearSlideTimer();
    slideTimerRef.current = setTimeout(() => {
      commitPendingNav();
    }, 300);
  };

  const handlePrevMonth = () => slideToMonth('prev', true);
  const handleNextMonth = () => slideToMonth('next', true);

  const handleGoCurrentMonth = () => {
    clearSlideTimer();
    pendingNavRef.current = null;
    setIsTrackAnimating(false);
    setTrackOffsetPx(0);
    setViewportHeight(null);
    if (year !== todayYear || month !== todayMonth) {
      trackCalendarMonthChange({
        fromYear: year,
        fromMonth: month,
        toYear: todayYear,
        toMonth: todayMonth,
      });
    }
    activeYMRef.current = { year: todayYear, month: todayMonth };
    setTransitionDir('reset');
    setSelectedDateStr(null);
    setYear(todayYear);
    setMonth(todayMonth);
    triggerTodayPing();
  };

  const handleGridPointerDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (pendingNavRef.current || isTrackAnimating) {
      commitPendingNav();
    }
    dragStateRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      startTime: performance.now(),
      latchDx: 0,
      lastOffset: 0,
      horizontalLocked: false,
      didDrag: false,
      pointerId: e.pointerId,
    };
    suppressClickRef.current = false;
  };

  const handleGridPointerMove = (e) => {
    const st = dragStateRef.current;
    if (!st.active || st.pointerId !== e.pointerId) return;
    const dx = e.clientX - st.startX;
    const dy = e.clientY - st.startY;

    if (!st.horizontalLocked) {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) {
        st.active = false;
        setTrackOffsetPx(0);
        setIsDraggingGrid(false);
        return;
      }
      if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.15) {
        st.horizontalLocked = true;
        st.didDrag = true;
        st.latchDx = dx;
        st.startTime = performance.now();
        setIsTrackAnimating(false);
        setIsDraggingGrid(true);
        try {
          e.currentTarget.setPointerCapture?.(e.pointerId);
        } catch {
          // ignore capture error
        }
      } else {
        return;
      }
    }

    const width = viewportRef.current?.clientWidth || 720;
    const rawOffset = dx - st.latchDx;
    let nextOffset = rawOffset;
    if (rawOffset > 0 && isPrevDisabled) {
      nextOffset = Math.min(56, rawOffset * 0.18);
    } else if (rawOffset < 0 && isNextDisabled) {
      nextOffset = Math.max(-56, rawOffset * 0.18);
    } else {
      nextOffset = Math.max(-width, Math.min(width, rawOffset));
    }

    st.lastOffset = nextOffset;
    setTrackOffsetPx(nextOffset);
  };

  const finishGridDrag = (e, cancelled = false) => {
    const st = dragStateRef.current;
    if (!st.active || st.pointerId !== e.pointerId) return;
    const rawOffset = st.lastOffset;
    const elapsed = Math.max(16, performance.now() - st.startTime);
    const velocity = rawOffset / elapsed;
    const shouldSuppress = st.didDrag;
    st.active = false;
    setIsDraggingGrid(false);

    try {
      if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // ignore release error
    }

    if (shouldSuppress) {
      suppressClickRef.current = true;
      setTimeout(() => {
        suppressClickRef.current = false;
      }, 60);
    }

    if (!st.horizontalLocked) {
      setTrackOffsetPx(0);
      return;
    }

    const width = viewportRef.current?.clientWidth || 720;
    const distThreshold = Math.min(120, width * 0.18);
    const goNext =
      !cancelled &&
      !isNextDisabled &&
      (rawOffset <= -distThreshold || (velocity <= -0.42 && rawOffset <= -24));
    const goPrev =
      !cancelled &&
      !isPrevDisabled &&
      (rawOffset >= distThreshold || (velocity >= 0.42 && rawOffset >= 24));

    if (goNext) {
      slideToMonth('next', false);
    } else if (goPrev) {
      slideToMonth('prev', false);
    } else {
      setIsTrackAnimating(true);
      setTrackOffsetPx(0);
      clearSlideTimer();
      slideTimerRef.current = setTimeout(() => {
        setIsTrackAnimating(false);
        slideTimerRef.current = null;
      }, 300);
    }
  };

  const handleTrackTransitionEnd = (e) => {
    if (e.target !== e.currentTarget || e.propertyName !== 'transform') return;
    commitPendingNav();
  };

  const handleGridClickCapture = (e) => {
    if (suppressClickRef.current) {
      e.stopPropagation();
      e.preventDefault();
      suppressClickRef.current = false;
    }
  };

  const handleCalendarKeyDown = (e) => {
    const tag = e.target?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      handlePrevMonth();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      handleNextMonth();
    }
  };

  const handleCellClick = (cell) => {
    if (!cell || cell.isPreService || !cell.milestones || cell.milestones.length === 0) return;
    setSelectedDateStr((prev) => (prev === cell.dateStr ? null : cell.dateStr));
  };

  const selectedDayDiff = useMemo(() => {
    if (!selectedCell) return 0;
    return diffDays(todayStr, selectedCell.dateStr);
  }, [selectedCell, todayStr]);

  const selectedDayRelativeLabel = useMemo(() => {
    if (!selectedCell) return '';
    if (selectedDayDiff === 0) return 'TODAY';
    if (selectedDayDiff > 0) return `D-${selectedDayDiff}`;
    return `${Math.abs(selectedDayDiff)}일 전`;
  }, [selectedCell, selectedDayDiff]);

  const renderMonthGridWeeks = (paneWeeks, isInteractive) =>
    paneWeeks.map((week, wIdx) => (
      <div key={wIdx} className="calendar-view__week-row">
        {week.map((cell, dIdx) => {
          if (!cell) {
            return (
              <div
                key={`empty-${wIdx}-${dIdx}`}
                className="calendar-view__cell calendar-view__cell--empty"
              />
            );
          }

          const isSun = dIdx === 0;
          const isSat = dIdx === 6;
          const cellItems = cell.milestones || [];
          const hasItems = cellItems.length > 0;
          const isSelected = isInteractive && selectedDateStr === cell.dateStr;
          const { isDense, fullItems, trayItems, overflowItems, overflowCount } =
            partitionCellMilestones(
              cellItems,
              isMobileGrid
                ? { normalThreshold: 2, denseBaseFull: 2, maxUpdateFull: 2, maxTrayItems: 3 }
                : { normalThreshold: 3, denseBaseFull: 2, maxUpdateFull: 3, maxTrayItems: 4 }
            );
          const overflowHasMatch =
            Boolean(activeLegendFilter) &&
            overflowItems.some((it) => matchesLegendFilter(it, activeLegendFilter));

          return (
            <div
              key={cell.dateStr}
              className={[
                'calendar-view__cell',
                !cell.isCurrentMonth ? 'calendar-view__cell--other-month' : '',
                cell.isToday ? 'calendar-view__cell--today' : '',
                isInteractive && cell.isToday && isTodayPing ? 'calendar-view__cell--today-ping' : '',
                cell.isPreService ? 'calendar-view__cell--pre-service' : '',
                hasItems ? 'calendar-view__cell--has-items' : '',
                isDense ? 'calendar-view__cell--dense' : '',
                isSelected ? 'calendar-view__cell--selected' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={isInteractive ? () => handleCellClick(cell) : undefined}
            >
              <div className="calendar-view__cell-header">
                <span
                  className={[
                    'calendar-view__day-num',
                    isSun ? 'calendar-view__day-num--sun' : '',
                    isSat ? 'calendar-view__day-num--sat' : '',
                    cell.isToday ? 'calendar-view__day-num--today' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {cell.day}
                </span>

                <div className="calendar-view__cell-badges">
                  {cell.isToday && (
                    <span className="calendar-view__today-tag">TODAY</span>
                  )}
                  {hasItems && (cellItems.length >= 2 || isSelected || isDense) && (
                    <span
                      className={`calendar-view__count-pill ${
                        cellItems.length >= 3 ? 'is-dense' : ''
                      } ${cellItems.length >= 4 ? 'is-crowded' : ''}`}
                    >
                      {cellItems.length}건
                    </span>
                  )}
                </div>
              </div>

              <div className="calendar-view__cell-events">
                {cell.isPreServiceNotice && (
                  <div
                    className="calendar-pre-service-badge"
                    title="2026년 4월 17일 서비스 개시 이전"
                  >
                    서비스 개시 전
                  </div>
                )}
                {fullItems.map((item) => {
                  const gameConf = gamesConfig?.[item.game] || {};
                  const gameTheme = gameConf.theme || {};
                  const color = gameTheme.color || '#818cf8';
                  const rgb = hexToRgbStr(color);
                  const iconSrc = gameConf.icon || null;
                  const timeShort = item.time ? item.time.slice(0, 5) : '';
                  const isLegendDimmed = Boolean(
                    activeLegendFilter && !matchesLegendFilter(item, activeLegendFilter)
                  );
                  const isLegendHighlighted = Boolean(activeLegendFilter && !isLegendDimmed);

                  return (
                    <button
                      key={item.id}
                      type="button"
                      tabIndex={isInteractive ? undefined : -1}
                      className={[
                        'calendar-chip',
                        `calendar-chip--${item.category}`,
                        isDense ? 'calendar-chip--dense' : '',
                        item.isEnd ? 'calendar-chip--end' : '',
                        item.isFixed
                          ? 'calendar-chip--confirmed'
                          : 'calendar-chip--predicted',
                        isLegendDimmed ? 'calendar-chip--dimmed' : '',
                        isLegendHighlighted ? 'calendar-chip--highlighted' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      style={{
                        '--chip-color': color,
                        '--chip-rgb': rgb,
                      }}
                      onClick={
                        isInteractive
                          ? (e) => {
                              e.stopPropagation();
                              setSelectedDateStr(cell.dateStr);
                              if (onEventClick && item.rawEvent) {
                                onEventClick(item.rawEvent, item.displayType, 'calendar');
                              }
                            }
                          : undefined
                      }
                      title={`[${item.game}] ${item.title}${
                        timeShort ? ` (${timeShort})` : ''
                      } — ${item.isFixed ? '확정' : '주기 예상'}`}
                    >
                      {/* 게임 아이콘 또는 카테고리 포인트 태그 */}
                      {item.category === 'broadcast' ? (
                        <span className="calendar-chip__live-tag">LIVE</span>
                      ) : item.category === 'offline' ? (
                        <span className="calendar-chip__offline-tag" aria-hidden="true">
                          <MapPin size={10} strokeWidth={2.5} />
                        </span>
                      ) : iconSrc ? (
                        <img
                          src={iconSrc}
                          alt=""
                          className="calendar-chip__icon"
                          loading="lazy"
                        />
                      ) : (
                        <span className="calendar-chip__dot" />
                      )}

                      {/* 게임 약칭 + 마일스톤 타이틀 */}
                      <span className="calendar-chip__game">{item.gameShort}</span>
                      <span className="calendar-chip__label">{item.title}</span>

                      {/* 우측 보조 메타: 방송 시간 또는 예상 태그 */}
                      {item.category === 'broadcast' && timeShort && (
                        <span className="calendar-chip__time">{timeShort}</span>
                      )}
                      {!item.isFixed && (
                        <span className="calendar-chip__est">예상</span>
                      )}
                    </button>
                  );
                })}
                {(trayItems.length > 0 || overflowCount > 0) && (
                  <div
                    className={`calendar-view__compact-tray${
                      trayItems.length + (overflowCount > 0 ? 1 : 0) >= 4
                        ? ' calendar-view__compact-tray--tight'
                        : ''
                    }`}
                  >
                    {trayItems.map((item) => {
                      const gameConf = gamesConfig?.[item.game] || {};
                      const gameTheme = gameConf.theme || {};
                      const color = gameTheme.color || '#818cf8';
                      const rgb = hexToRgbStr(color);
                      const iconSrc = gameConf.icon || null;
                      const timeShort = item.time ? item.time.slice(0, 5) : '';
                      const isLegendDimmed = Boolean(
                        activeLegendFilter && !matchesLegendFilter(item, activeLegendFilter)
                      );
                      const isLegendHighlighted = Boolean(activeLegendFilter && !isLegendDimmed);
                      const miniTag =
                        item.category === 'update'
                          ? '업뎃'
                          : item.category === 'half'
                          ? '후반'
                          : item.category === 'broadcast'
                          ? 'LIVE'
                          : item.isEnd
                          ? '종료'
                          : null;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          tabIndex={isInteractive ? undefined : -1}
                          className={[
                            'calendar-mini-chip',
                            `calendar-mini-chip--${item.category}`,
                            item.isEnd ? 'calendar-mini-chip--end' : '',
                            item.isFixed
                              ? 'calendar-mini-chip--confirmed'
                              : 'calendar-mini-chip--predicted',
                            isLegendDimmed ? 'calendar-mini-chip--dimmed' : '',
                            isLegendHighlighted ? 'calendar-mini-chip--highlighted' : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                          style={{
                            '--chip-color': color,
                            '--chip-rgb': rgb,
                          }}
                          onClick={
                            isInteractive
                              ? (e) => {
                                  e.stopPropagation();
                                  setSelectedDateStr(cell.dateStr);
                                  if (onEventClick && item.rawEvent) {
                                    onEventClick(item.rawEvent, item.displayType, 'calendar');
                                  }
                                }
                              : undefined
                          }
                          title={`[${item.game}] ${item.title}${
                            timeShort ? ` (${timeShort})` : ''
                          } — ${item.isFixed ? '확정' : '주기 예상'}`}
                        >
                          {iconSrc ? (
                            <img
                              src={iconSrc}
                              alt=""
                              className="calendar-mini-chip__icon"
                              loading="lazy"
                            />
                          ) : (
                            <span className="calendar-mini-chip__dot" />
                          )}
                          <span className="calendar-mini-chip__tag">
                            {miniTag ?? <MapPin size={9} strokeWidth={2.5} aria-hidden="true" />}
                          </span>
                        </button>
                      );
                    })}
                    {overflowCount > 0 && (
                      <button
                        type="button"
                        tabIndex={isInteractive ? undefined : -1}
                        className={[
                          'calendar-overflow-pill',
                          activeLegendFilter && overflowHasMatch
                            ? 'calendar-overflow-pill--highlighted'
                            : '',
                          activeLegendFilter && !overflowHasMatch
                            ? 'calendar-overflow-pill--dimmed'
                            : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        title={`${overflowItems
                          .map((it) => `[${it.gameShort}] ${it.title}`)
                          .join(', ')} — 클릭하여 전체 일정 보기`}
                        onClick={
                          isInteractive
                            ? (e) => {
                                e.stopPropagation();
                                setSelectedDateStr(cell.dateStr);
                              }
                            : undefined
                        }
                      >
                        +{overflowCount}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    ));

  return (
    <div
      className="calendar-view"
      tabIndex={-1}
      onKeyDown={handleCalendarKeyDown}
    >
      {/* 1. 상단 통합 헤더 (연/월 네비게이션 + 시각 범례 + 달력 이미지 버튼) */}
      <div className="calendar-view__header">
        <div className="calendar-view__nav-group">
          <button
            type="button"
            className="calendar-view__nav-btn"
            onClick={handlePrevMonth}
            disabled={isPrevDisabled}
            aria-label="이전 달"
            title={
              isPrevDisabled
                ? `서비스 개시 월(${CALENDAR_MIN_YEAR}년 ${CALENDAR_MIN_MONTH}월)입니다`
                : '이전 달'
            }
          >
            <ChevronLeft size={17} />
          </button>

          <h2 className="calendar-view__month-title">
            <CalendarIcon size={17} className="calendar-view__month-icon" />
            <span>
              {year}년 {month}월
            </span>
            <span className="calendar-view__month-count">{monthMilestonesCount}건</span>
          </h2>

          <button
            type="button"
            className="calendar-view__nav-btn"
            onClick={handleNextMonth}
            disabled={isNextDisabled}
            aria-label="다음 달"
            title={isNextDisabled ? '마지막 등록 일정 월입니다' : '다음 달'}
          >
            <ChevronRight size={17} />
          </button>

          {(year !== todayYear || month !== todayMonth) && (
            <button
              type="button"
              className="calendar-view__today-pill"
              onClick={handleGoCurrentMonth}
            >
              이번 달
            </button>
          )}
        </div>

        <div className="calendar-view__right-controls">
          {/* 4대 일정 유형 & 예상 범례 (호버 강조 / 클릭 고정 필터) */}
          <div className="calendar-view__legend" role="group" aria-label="일정 유형 필터">
            {CALENDAR_LEGEND_ITEMS.map(({ key, label, swatchClass, swatchText, isOfflinePin }) => {
              const isPinned = pinnedLegend === key;
              const isActive = activeLegendFilter === key;
              const isDimmed = Boolean(activeLegendFilter && activeLegendFilter !== key);

              return (
                <button
                  key={key}
                  type="button"
                  className={[
                    'calendar-view__legend-item',
                    isActive ? 'is-active' : '',
                    isPinned ? 'is-pinned' : '',
                    isDimmed ? 'is-dimmed' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  aria-pressed={isPinned}
                  onMouseEnter={() => setHoveredLegend(key)}
                  onMouseLeave={() => setHoveredLegend(null)}
                  onClick={() => setPinnedLegend((prev) => (prev === key ? null : key))}
                  title={isPinned ? '클릭하여 고정 해제' : '마우스 오버로 강조 · 클릭하여 고정'}
                >
                  <span className={`calendar-view__legend-swatch ${swatchClass}`}>
                    {isOfflinePin ? <MapPin size={10} strokeWidth={2.5} /> : swatchText || null}
                  </span>
                  <span>{label}</span>
                </button>
              );
            })}
          </div>

          {onOpenCalendarModal && (
            <button
              type="button"
              className="calendar-view__export-btn"
              onClick={() => onOpenCalendarModal(year, month, 'calendar_view')}
              title={`${year}년 ${month}월 달력 다운로드`}
              aria-label={`${month}월 달력 다운로드`}
            >
              <ImageIcon size={13} />
              <span className="calendar-view__export-label">{month}월 달력 다운로드</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Full-Width 7열 월간 캘린더 그리드 (드래그·스와이프 월 전환 지원) */}
      <div
        className={`calendar-view__grid-wrapper${
          isDraggingGrid ? ' calendar-view__grid-wrapper--dragging' : ''
        }`}
        onPointerDown={handleGridPointerDown}
        onPointerMove={handleGridPointerMove}
        onPointerUp={(e) => finishGridDrag(e, false)}
        onPointerCancel={(e) => finishGridDrag(e, true)}
        onClickCapture={handleGridClickCapture}
      >
        <div className="calendar-view__weekdays">
          {WEEKDAYS.map((dayName, idx) => (
            <div
              key={dayName}
              className={`calendar-view__weekday ${
                idx === 0 ? 'calendar-view__weekday--sun' : ''
              } ${idx === 6 ? 'calendar-view__weekday--sat' : ''}`}
            >
              {dayName}
            </div>
          ))}
        </div>

        <div
          ref={viewportRef}
          className="calendar-view__viewport"
          style={
            viewportHeight !== null
              ? { height: `${viewportHeight}px` }
              : undefined
          }
        >
          <div
            className={`calendar-view__track${
              isTrackAnimating ? ' calendar-view__track--animating' : ''
            }`}
            style={{ transform: `translate3d(${trackOffsetPx}px, 0, 0)` }}
            onTransitionEnd={handleTrackTransitionEnd}
          >
            {prevPaneWeeks && (
              <div
                ref={prevPaneRef}
                className="calendar-view__pane calendar-view__pane--prev"
                aria-hidden="true"
              >
                {renderMonthGridWeeks(prevPaneWeeks, false)}
              </div>
            )}

            <div
              ref={currPaneRef}
              className={`calendar-view__pane calendar-view__pane--curr${
                transitionDir === 'reset' ? ' calendar-view__body--reset' : ''
              }`}
            >
              {renderMonthGridWeeks(weeks, true)}
            </div>

            {nextPaneWeeks && (
              <div
                ref={nextPaneRef}
                className="calendar-view__pane calendar-view__pane--next"
                aria-hidden="true"
              >
                {renderMonthGridWeeks(nextPaneWeeks, false)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. 선택된 날짜 하단 아젠다 드로어 (Day Selection & Quick Agenda Sheet) */}
      {selectedCell && (
        <div className="calendar-agenda" role="region" aria-label="선택한 날짜 일정 목록">
          <div className="calendar-agenda__header">
            <div className="calendar-agenda__title-group">
              <span className="calendar-agenda__date-badge">
                {formatDisplayDate(selectedCell.dateStr, true)}
              </span>
              <span
                className={`calendar-agenda__dday-pill ${
                  selectedDayDiff === 0
                    ? 'is-today'
                    : selectedDayDiff > 0
                    ? 'is-upcoming'
                    : 'is-past'
                }`}
              >
                {selectedDayRelativeLabel}
              </span>
              <span className="calendar-agenda__count">
                일정 {selectedCell.milestones.length}건
              </span>
            </div>

            <button
              type="button"
              className="calendar-agenda__close-btn"
              onClick={() => setSelectedDateStr(null)}
              aria-label="선택 날짜 일정 닫기"
            >
              <span>닫기</span>
              <X size={14} />
            </button>
          </div>

          <div className="calendar-agenda__grid">
            {selectedCell.milestones.map((item) => {
              const gameConf = gamesConfig?.[item.game] || {};
              const gameTheme = gameConf.theme || {};
              const color = gameTheme.color || '#818cf8';
              const rgb = hexToRgbStr(color);
              const iconSrc = gameConf.icon || null;
              const ddayInfo = getMilestoneDDayBadge(item, todayStr);
              const rawTitle = item.rawEvent?.title || item.title;
              const cleanAgendaTitle =
                cleanEventDisplayTitle(rawTitle, item.game) || item.title;
              const timeShort = item.time ? item.time.slice(0, 5) : '';
              const locationStr = item.rawEvent?.location || '';
              const startDateStr =
                item.rawEvent?.start_date || item.rawEvent?.date || item.date;
              const endDateStr = item.rawEvent?.end_date || startDateStr;
              const isMultiDay = Boolean(
                startDateStr && endDateStr && startDateStr !== endDateStr
              );
              const isStartRole =
                !item.isEnd && isMultiDay && item.category === 'offline';
              const dateRangeText = isMultiDay
                ? `${formatDisplayDate(startDateStr, false)} ~ ${formatDisplayDate(
                    endDateStr,
                    false
                  )}`
                : '';

              return (
                <button
                  key={`agenda-${item.id}`}
                  type="button"
                  className={`calendar-agenda__card${
                    item.isEnd ? ' calendar-agenda__card--end' : ''
                  }`}
                  style={{
                    '--chip-color': color,
                    '--chip-rgb': rgb,
                  }}
                  onClick={() => {
                    if (onEventClick && item.rawEvent) {
                      onEventClick(item.rawEvent, item.displayType, 'calendar');
                    }
                  }}
                >
                  <div className="calendar-agenda__card-top">
                    <div className="calendar-agenda__game-wrap">
                      {iconSrc && (
                        <img
                          src={iconSrc}
                          alt=""
                          className="calendar-agenda__game-icon"
                          loading="lazy"
                        />
                      )}
                      <span
                        className="calendar-agenda__game-pill"
                        style={{ backgroundColor: color, color: '#0f172a' }}
                      >
                        {item.game}
                      </span>
                      <span
                        className={`calendar-agenda__cat-pill is-${item.category}`}
                      >
                        {CATEGORY_DISPLAY[item.category] || item.categoryLabel}
                      </span>
                    </div>

                    <div className="calendar-agenda__badges">
                      {isStartRole && (
                        <span className="calendar-agenda__role-pill is-start">
                          시작일
                        </span>
                      )}
                      <span
                        className={`calendar-agenda__status ${
                          item.isFixed ? 'is-confirmed' : 'is-predicted'
                        }`}
                      >
                        {item.isFixed ? '확정' : '예상'}
                      </span>
                      <span
                        className={`calendar-agenda__dday is-${ddayInfo.variant}`}
                      >
                        {ddayInfo.label}
                      </span>
                    </div>
                  </div>

                  <div className="calendar-agenda__card-main">
                    <div className="calendar-agenda__card-title">
                      {item.isEnd && (
                        <span className="calendar-agenda__end-prefix">종료</span>
                      )}
                      <span className="calendar-agenda__title-text">
                        {cleanAgendaTitle}
                      </span>
                    </div>
                    <ArrowUpRight size={14} className="calendar-agenda__card-arrow" />
                  </div>

                  {(dateRangeText || timeShort || locationStr) && (
                    <div className="calendar-agenda__card-meta">
                      {dateRangeText && (
                        <span
                          className={`calendar-agenda__meta-chip${
                            item.isEnd ? ' is-end' : ''
                          }`}
                        >
                          <CalendarIcon size={11} />
                          <span>
                            {dateRangeText}
                            {item.isEnd
                              ? ' (종료일)'
                              : isStartRole
                                ? ' (시작일)'
                                : ''}
                          </span>
                        </span>
                      )}
                      {timeShort && (
                        <span className="calendar-agenda__meta-chip">
                          <Clock size={11} />
                          <span>{timeShort} KST</span>
                        </span>
                      )}
                      {locationStr && (
                        <span className="calendar-agenda__meta-chip">
                          <MapPin size={11} />
                          <span>{locationStr}</span>
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
