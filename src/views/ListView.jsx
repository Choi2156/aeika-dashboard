import { useState, useEffect, useRef, useMemo } from 'react';
import {
  History,
  ChevronDown,
  ChevronUp,
  Search,
  X,
  MapPin,
  Clock,
  Calendar as CalendarIcon,
  ArrowUpRight,
} from 'lucide-react';
import { getCleanSummaryText } from '../utils/eventTextParser';
import {
  getTodayStrKST,
  diffDays,
  formatDisplayDate,
  parseDateStr,
  getKoreanDayName,
} from '../utils/dateKST';
import '../styles/ListView.css';

const CATEGORY_TABS = [
  { key: 'ALL', label: '전체' },
  { key: '전반업데이트', label: '버전 업데이트' },
  { key: '후반업데이트', label: '후반 픽업' },
  { key: '공식방송', label: '특별 방송' },
  { key: '오프라인이벤트', label: '오프라인 행사' },
];

const TYPE_DISPLAY_NAMES = {
  '전반업데이트': '버전 업데이트',
  '후반업데이트': '후반 픽업',
  '공식방송': '특별 방송',
  '오프라인이벤트': '오프라인 행사',
};

/**
 * ListView 2.0 — 고밀도 클린 아젠다 타임라인 뷰
 * - 기존의 가독성을 해치던 배경 일러스트 합성을 제거하고, 우측 클린 썸네일 + 좌측 날짜/D-Day + 중앙 구조화 배지 레이아웃 적용
 * - 상단 검색바(캐릭터·버전·행사명 즉시 검색) + 유형 필터 탭 + 지난 일정 토글 제공
 * - 연·월(Month) 스티키 구분 헤더로 장기 일정 탐색성 강화
 */
export default function ListView({
  events,
  gamesConfig,
  activeGames,
  onEventClick,
  jumpTodayTrigger,
}) {
  const containerRef = useRef(null);
  const [showPast, setShowPast] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const todayStr = useMemo(() => getTodayStrKST(), []);

  // 정렬, 게임 필터, 카테고리 필터, 키워드 검색 통합 적용
  const sortedEvents = useMemo(() => {
    if (!events || events.length === 0) return [];

    const q = searchQuery.trim().toLowerCase();

    const filtered = events.filter((ev) => {
      if (activeGames && activeGames[ev.game] === false) return false;
      if (categoryFilter !== 'ALL' && ev.type !== categoryFilter) return false;

      if (q) {
        const haystack = [
          ev.game,
          ev.version,
          ev.title,
          ev.detail,
          ev.location,
          TYPE_DISPLAY_NAMES[ev.type] || ev.type,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });

    return [...filtered].sort((a, b) => {
      const dateA = a.date || '';
      const dateB = b.date || '';
      if (dateA !== dateB) return dateA.localeCompare(dateB);

      const timeA = a.time || '';
      const timeB = b.time || '';
      if (!timeA && timeB) return -1;
      if (timeA && !timeB) return 1;
      if (timeA && timeB) return timeA.localeCompare(timeB);

      const confA = a.is_fixed ? 0 : 1;
      const confB = b.is_fixed ? 0 : 1;
      return confA - confB;
    });
  }, [events, activeGames, categoryFilter, searchQuery]);

  // 과거 종료 일정 vs 현재 진행 중·예정 일정 분리
  const { pastEvents, currentAndFutureEvents } = useMemo(() => {
    const past = [];
    const activeOrFuture = [];

    sortedEvents.forEach((ev) => {
      const endDate = ev.end_date || ev.date || '';
      if (endDate < todayStr) {
        past.push(ev);
      } else {
        activeOrFuture.push(ev);
      }
    });

    return { pastEvents: past, currentAndFutureEvents: activeOrFuture };
  }, [sortedEvents, todayStr]);

  const visibleEvents = useMemo(() => {
    return showPast ? [...pastEvents, ...currentAndFutureEvents] : currentAndFutureEvents;
  }, [showPast, pastEvents, currentAndFutureEvents]);

  const todayHasEvents = useMemo(() => {
    return visibleEvents.some((ev) => ev.date === todayStr);
  }, [visibleEvents, todayStr]);

  // 월별 구분 헤더 + TODAY 마커가 삽입된 행 배열 생성
  const rows = useMemo(() => {
    if (visibleEvents.length === 0) return [];

    const result = [];
    let todayMarkerInserted = false;
    let prevDate = null;
    let prevMonthKey = null;

    for (let i = 0; i < visibleEvents.length; i++) {
      const ev = visibleEvents[i];
      const evDate = ev.date || '';
      const endDate = ev.end_date || evDate;
      const isOngoing = evDate < todayStr && endDate >= todayStr;

      if (!todayHasEvents && !todayMarkerInserted && evDate > todayStr) {
        result.push({ type: 'today-marker', key: 'today-marker' });
        todayMarkerInserted = true;
      }

      const monthKey = evDate.slice(0, 7); // YYYY-MM
      if (monthKey && monthKey !== prevMonthKey) {
        const [y, m] = monthKey.split('-').map(Number);
        result.push({
          type: 'month-header',
          key: `month-${monthKey}`,
          label: `${y}년 ${m}월`,
        });
        prevMonthKey = monthKey;
      }

      const isDuplicateDate = evDate === prevDate;
      result.push({
        type: 'event',
        key: ev.id || `${ev.game}-${ev.type}-${evDate}-${i}`,
        event: ev,
        isDuplicateDate,
        isToday: evDate === todayStr,
        isOngoing,
        isPastEnded: endDate < todayStr,
      });
      prevDate = evDate;
    }

    if (!todayHasEvents && !todayMarkerInserted) {
      result.push({ type: 'today-marker', key: 'today-marker-end' });
    }

    return result;
  }, [visibleEvents, todayStr, todayHasEvents]);

  // 외부 [오늘 MM.DD] 버튼 클릭 시 오늘 마커 위치로 스크롤
  useEffect(() => {
    if (!jumpTodayTrigger) return;
    if (!containerRef.current) return;
    const target = containerRef.current.querySelector('.scroll-target-today');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [jumpTodayTrigger]);

  const formatShortDateParts = (dateStr) => {
    if (!dateStr) return { md: '—', weekday: '' };
    const d = parseDateStr(dateStr);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return {
      md: `${mm}.${dd}`,
      weekday: getKoreanDayName(d.getDay()),
    };
  };

  const getDDayBadge = (ev, isOngoing, isPastEnded) => {
    const startStr = ev.date || ev.start_date;
    const endStr = ev.end_date || startStr;
    if (isPastEnded) {
      return { text: '종료', variant: 'ended' };
    }
    if (startStr === todayStr) {
      return { text: 'TODAY', variant: 'today' };
    }
    const diffStart = diffDays(todayStr, startStr);
    if (diffStart > 0) {
      return {
        text: `D-${diffStart}`,
        variant: diffStart <= 5 ? 'imminent' : 'upcoming',
      };
    }
    if (isOngoing) {
      const diffEnd = diffDays(todayStr, endStr);
      return {
        text: diffEnd === 0 ? '오늘 마감' : `진행 중 (${diffEnd}일 남음)`,
        variant: 'ongoing',
      };
    }
    return { text: '', variant: 'default' };
  };

  const getImageSrc = (event) => {
    if (event.custom_img) return `./assets/${event.custom_img}`;
    const gameConf = gamesConfig && gamesConfig[event.game];
    return gameConf?.defaultImg || null;
  };

  return (
    <div className="list-view" ref={containerRef}>
      {/* 1. 상단 필터 & 검색 컨트롤 툴바 */}
      <div className="list-view__toolbar">
        <div className="list-view__cat-tabs" role="tablist" aria-label="일정 유형 필터">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={categoryFilter === tab.key}
              className={`list-view__cat-tab ${
                categoryFilter === tab.key ? 'is-active' : ''
              }`}
              onClick={() => setCategoryFilter(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="list-view__toolbar-right">
          <div className="list-view__search-box">
            <Search size={14} className="list-view__search-icon" />
            <input
              type="text"
              className="list-view__search-input"
              placeholder="캐릭터, 버전, 일정명 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="일정 검색"
            />
            {searchQuery && (
              <button
                type="button"
                className="list-view__search-clear"
                onClick={() => setSearchQuery('')}
                aria-label="검색어 지우기"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {pastEvents.length > 0 && (
            <button
              type="button"
              className={`list-view__past-toggle-btn ${showPast ? 'is-open' : ''}`}
              onClick={() => setShowPast((prev) => !prev)}
            >
              <History size={13} />
              <span>
                {showPast
                  ? `지난 일정 숨기기 (${pastEvents.length})`
                  : `지난 일정 포함 (${pastEvents.length})`}
              </span>
              {showPast ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          )}
        </div>
      </div>

      {/* 2. 아젠다 리스트 본문 */}
      {rows.length === 0 ? (
        <div className="list-view__empty">
          <CalendarIcon size={24} className="list-view__empty-icon" />
          <div className="list-view__empty-text">조건에 일치하는 일정이 없습니다.</div>
          {(categoryFilter !== 'ALL' || searchQuery) && (
            <button
              type="button"
              className="list-view__reset-btn"
              onClick={() => {
                setCategoryFilter('ALL');
                setSearchQuery('');
              }}
            >
              필터 및 검색 초기화
            </button>
          )}
        </div>
      ) : (
        <div className="list-view__agenda">
          {rows.map((row) => {
            if (row.type === 'month-header') {
              return (
                <div key={row.key} className="list-view__month-divider">
                  <span className="list-view__month-divider-label">{row.label}</span>
                  <span className="list-view__month-divider-line" />
                </div>
              );
            }

            if (row.type === 'today-marker') {
              return (
                <div
                  key={row.key}
                  className="list-view__today-marker scroll-target-today"
                >
                  <span className="list-view__today-pill">TODAY</span>
                  <span className="list-view__today-date">
                    {formatDisplayDate(todayStr, true)} 기준
                  </span>
                  <span className="list-view__today-line" />
                </div>
              );
            }

            const { event, isDuplicateDate, isToday, isOngoing, isPastEnded } = row;
            const displayTypeName = TYPE_DISPLAY_NAMES[event.type] || event.type || '';
            const imgSrc = getImageSrc(event);
            const gameColor = gamesConfig?.[event.game]?.theme?.color || '#818cf8';
            const cleanDetail = getCleanSummaryText(event.detail, 115);
            const { md, weekday } = formatShortDateParts(event.date);
            const dDay = getDDayBadge(event, isOngoing, isPastEnded);
            const hasPeriod =
              event.end_date &&
              event.end_date !== event.date &&
              event.type !== '공식방송';

            return (
              <article
                key={row.key}
                className={[
                  'agenda-row',
                  isToday ? 'agenda-row--today scroll-target-today' : '',
                  isPastEnded ? 'agenda-row--past' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={{ '--row-accent': gameColor }}
                onClick={() =>
                  onEventClick && onEventClick(event, displayTypeName, 'list')
                }
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onEventClick && onEventClick(event, displayTypeName, 'list');
                  }
                }}
              >
                {/* 좌측: 날짜 및 요일 컬럼 */}
                <div
                  className={`agenda-row__date-col ${
                    isDuplicateDate ? 'is-duplicate' : ''
                  }`}
                >
                  <div className="agenda-row__date-main">
                    <span className="agenda-row__md">{md}</span>
                    <span className="agenda-row__weekday">({weekday})</span>
                  </div>
                  {event.time && (
                    <span className="agenda-row__time">
                      <Clock size={10} />
                      {event.time.slice(0, 5)}
                    </span>
                  )}
                </div>

                {/* 중앙: 배지 + 타이틀 + 핵심 요약 */}
                <div className="agenda-row__main">
                  <div className="agenda-row__badges">
                    <span className="agenda-row__game-badge">{event.game}</span>
                    {event.version && (
                      <span className="agenda-row__ver-badge">
                        v{event.version.replace(/^v/, '')}
                      </span>
                    )}
                    <span className="agenda-row__type-badge">{displayTypeName}</span>
                    <span
                      className={`agenda-row__conf-badge ${
                        event.is_fixed ? 'is-fixed' : 'is-est'
                      }`}
                    >
                      {event.is_fixed ? '확정' : '예상'}
                    </span>
                    {dDay.text && (
                      <span className={`agenda-row__dday-badge is-${dDay.variant}`}>
                        {dDay.text}
                      </span>
                    )}
                  </div>

                  <h3 className="agenda-row__title">
                    <span>{event.title || displayTypeName}</span>
                    <ArrowUpRight size={14} className="agenda-row__arrow" />
                  </h3>

                  {cleanDetail && <p className="agenda-row__detail">{cleanDetail}</p>}

                  <div className="agenda-row__submeta">
                    {hasPeriod && (
                      <span className="agenda-row__period">
                        기간: {formatDisplayDate(event.date, false)} ~{' '}
                        {formatDisplayDate(event.end_date, false)}
                      </span>
                    )}
                    {event.location && (
                      <span className="agenda-row__location">
                        <MapPin size={11} />
                        {event.location}
                      </span>
                    )}
                  </div>
                </div>

                {/* 우측: 정갈한 16:9 썸네일 카드 (텍스트와 절대 겹치지 않는 분리형 썸네일) */}
                {imgSrc && (
                  <div className="agenda-row__thumb-wrap">
                    <img
                      src={imgSrc}
                      alt=""
                      className="agenda-row__thumb"
                      loading="lazy"
                    />
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
