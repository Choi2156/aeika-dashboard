import { useState, useEffect, useRef, useMemo } from 'react';
import { History, ChevronDown, ChevronUp, Search, X } from 'lucide-react';
import { getCleanSummaryText } from '../utils/eventTextParser';
import { getTodayStrKST, formatDisplayDate } from '../utils/dateKST';
import '../styles/ListView.css';

const TYPE_DISPLAY_NAMES = {
  '전반업데이트': '버전 업데이트',
  '후반업데이트': '후반업데이트',
  '공식방송': '공식방송',
  '오프라인이벤트': '오프라인 이벤트',
};

/**
 * ListView — v1.2.8 타임라인 축 + 우측 그라데이션 마스크 일러스트 카드 복원 (v2.1)
 * - 상단 중복 카테고리 탭 제거, [지난 일정 불러오기] 토글 + 컴팩트 검색창 1줄 배치
 * - 좌측 수직 타임라인 선(Vertical Line) + 원형 노드(Dot) + 날짜(M/D, HH:mm)
 * - 우측 48% 영역 그라데이션 마스크 일러스트 배경 카드 + 정돈된 1~2줄 타이포그래피
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
  const [searchQuery, setSearchQuery] = useState('');

  const todayStr = useMemo(() => getTodayStrKST(), []);

  // 정렬, 게임 필터, 키워드 검색 통합 적용
  const sortedEvents = useMemo(() => {
    if (!events || events.length === 0) return [];

    const q = searchQuery.trim().toLowerCase();

    const filtered = events.filter((ev) => {
      if (activeGames && activeGames[ev.game] === false) return false;

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
  }, [events, activeGames, searchQuery]);

  // 과거 종료 일정 vs 현재/예정 일정 분리 (기본: 오늘 이후 또는 현재 진행 중인 일정 노출)
  const { pastEvents, currentAndFutureEvents } = useMemo(() => {
    const past = [];
    const activeOrFuture = [];

    sortedEvents.forEach((ev) => {
      const evDate = ev.date || '';
      if (evDate < todayStr) {
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

  // TODAY 마커가 삽입된 타임라인 행 배열 생성
  const rows = useMemo(() => {
    if (visibleEvents.length === 0) return [];

    const result = [];
    let todayMarkerInserted = false;
    let prevDate = null;

    for (let i = 0; i < visibleEvents.length; i++) {
      const ev = visibleEvents[i];
      const evDate = ev.date || '';

      if (!todayHasEvents && !todayMarkerInserted && evDate > todayStr) {
        result.push({ type: 'today-marker', key: 'today-marker' });
        todayMarkerInserted = true;
      }

      const isDuplicateDate = evDate === prevDate;
      result.push({
        type: 'event',
        key: ev.id || `${ev.game}-${ev.type}-${evDate}-${i}`,
        event: ev,
        isDuplicateDate,
        isToday: evDate === todayStr,
      });
      prevDate = evDate;
    }

    if (!todayHasEvents && !todayMarkerInserted) {
      result.push({ type: 'today-marker', key: 'today-marker-end' });
    }

    return result;
  }, [visibleEvents, todayStr, todayHasEvents]);

  // 진입 시 및 [오늘] 버튼 클릭 시 TODAY 지점으로 스크롤 포커싱
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!containerRef.current) return;
      const target = containerRef.current.querySelector('.scroll-target-today');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 120);
    return () => clearTimeout(timer);
  }, [jumpTodayTrigger]);

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length < 3) return dateStr;
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    return `${m}/${d}`;
  }

  function formatTime(timeStr) {
    if (!timeStr) return null;
    const parts = timeStr.split(':');
    if (parts.length >= 2) {
      return `${parts[0]}:${parts[1]}`;
    }
    return timeStr;
  }

  function getImageSrc(event) {
    if (event.custom_img) {
      return `./assets/${event.custom_img}`;
    }
    const gameConf = gamesConfig && gamesConfig[event.game];
    return gameConf?.defaultImg || null;
  }

  function getGameTheme(gameName) {
    const gameConf = gamesConfig && gamesConfig[gameName];
    return (
      gameConf?.theme || {
        color: '#6366f1',
        textOnBar: '#0f172a',
      }
    );
  }

  function getDisplayTypeName(type) {
    return TYPE_DISPLAY_NAMES[type] || type || '';
  }

  return (
    <div className="list-view" ref={containerRef}>
      {/* 상단 1줄 컨트롤 바: [지난 일정 불러오기] 토글 + 컴팩트 검색창 */}
      <div className="list-view__top-controls">
        <div className="list-view__top-left">
          {pastEvents.length > 0 && (
            <button
              type="button"
              className={`list-view__past-btn ${showPast ? 'is-open' : ''}`}
              onClick={() => setShowPast((prev) => !prev)}
            >
              <History size={13} />
              <span>
                {showPast
                  ? `지난 일정 접기 (${pastEvents.length}건)`
                  : `지난 일정 불러오기 (${pastEvents.length}건)`}
              </span>
              {showPast ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          )}
        </div>

        <div className="list-view__search-box">
          <Search size={13} className="list-view__search-icon" />
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
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* 타임라인 본문 */}
      {rows.length === 0 ? (
        <div className="list-view__empty">
          <div className="list-view__empty-icon">📅</div>
          <div className="list-view__empty-text">표시할 일정이 없습니다</div>
        </div>
      ) : (
        <div className="list-view__timeline">
          {rows.map((row, idx) => {
            if (row.type === 'today-marker') {
              return (
                <div
                  key={row.key || `today-marker-${idx}`}
                  className="list-view__today-marker scroll-target-today"
                >
                  <div className="list-view__today-marker-left">
                    <div className="list-view__today-marker-dot" />
                  </div>
                  <div className="list-view__today-marker-right">
                    <div className="list-view__today-marker-card">
                      <span className="list-view__today-marker-label">TODAY</span>
                      <span className="list-view__today-marker-date">
                        {formatDisplayDate(todayStr, true)}
                      </span>
                      <div className="list-view__today-marker-line" />
                    </div>
                  </div>
                </div>
              );
            }

            const { event, isDuplicateDate, isToday } = row;
            const displayTypeName = getDisplayTypeName(event.type);
            const imgSrc = getImageSrc(event);
            const gameTheme = getGameTheme(event.game);
            const cleanDetail = getCleanSummaryText(event.detail, 130);

            return (
              <div
                key={row.key || `${event.game}-${event.type}-${event.date}-${idx}`}
                className={`list-view__row ${
                  isToday ? 'list-view__row--today scroll-target-today' : ''
                }`}
              >
                {/* 좌측 타임라인 축: 날짜 + 방송시간 + 원형 도트 */}
                <div className="list-view__left">
                  <span
                    className={`list-view__date ${
                      isDuplicateDate ? 'list-view__date--duplicate' : ''
                    }`}
                  >
                    {formatDate(event.date)}
                  </span>
                  {event.time && (
                    <span className="list-view__time">{formatTime(event.time)}</span>
                  )}
                  <div
                    className="list-view__dot"
                    style={
                      !isToday
                        ? { borderColor: gameTheme.color || '#475569' }
                        : undefined
                    }
                  />
                </div>

                {/* 우측 그라데이션 마스크 일러스트 카드 */}
                <div className="list-view__right">
                  <div
                    className={[
                      'list-view__card',
                      isToday ? 'list-view__card--today' : '',
                      event.type === '공식방송' ? 'list-view__card--stream' : '',
                      event.type === '오프라인이벤트' ? 'list-view__card--offline' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
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
                    {/* 우측 48% 영역 배경 일러스트 + 좌측 방향 그라데이션 마스크 */}
                    {imgSrc && (
                      <div className="list-view__card-bg-wrap">
                        <img
                          className="list-view__card-bg-img"
                          src={imgSrc}
                          alt=""
                          loading="lazy"
                        />
                        <div className="list-view__card-bg-mask" />
                        {gamesConfig?.[event.game]?.copyright && (
                          <span className="list-view__card-copyright">
                            {gamesConfig[event.game].copyright}
                          </span>
                        )}
                      </div>
                    )}

                    {/* 좌측 전면 텍스트 정보판 */}
                    <div className="list-view__card-content">
                      <div className="list-view__card-header">
                        <span
                          className="list-view__game-badge"
                          style={{
                            background: gameTheme.color || '#6366f1',
                            color: '#0f172a',
                          }}
                        >
                          {event.game}
                        </span>

                        {event.version && (
                          <span className="list-view__version">
                            v{event.version.replace(/^v/, '')}
                          </span>
                        )}

                        <span
                          className={`list-view__status-badge ${
                            event.is_fixed
                              ? 'list-view__status-badge--confirmed'
                              : 'list-view__status-badge--predicted'
                          }`}
                        >
                          {event.is_fixed ? '확정' : '예상'}
                        </span>

                        {isToday && (
                          <span className="list-view__today-badge">TODAY</span>
                        )}
                      </div>

                      <div className="list-view__card-body-text">
                        <div className="list-view__title">
                          {event.title || displayTypeName}
                        </div>
                        {event.type === '오프라인이벤트' && event.location && (
                          <div className="list-view__offline-location">
                            <span>📍 {event.location}</span>
                          </div>
                        )}
                        {cleanDetail && (
                          <div className="list-view__detail">{cleanDetail}</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
