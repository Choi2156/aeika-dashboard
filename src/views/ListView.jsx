import { useEffect, useRef, useMemo } from 'react';
import '../styles/ListView.css';

/**
 * ListView — Vertical timeline list of game events
 *
 * Props:
 *   events       — Array of all events (confirmed + predicted)
 *   gamesConfig  — Object: game name → { cycle, halfCycle, streamOffset, theme, defaultImg }
 *   onEventClick — Function(event, displayTypeName) — opens detail modal
 */
export default function ListView({ events, gamesConfig, activeGames, onEventClick }) {
  const containerRef = useRef(null);

  // ── Display name mapping ────────────────────────────────────
  const typeDisplayNames = {
    '전반업데이트': '버전 업데이트',
    '후반업데이트': '후반업데이트',
    '공식방송': '공식방송',
    '오프라인이벤트': '오프라인 이벤트',
  };

  // ── Today string (YYYY-MM-DD) ───────────────────────────────
  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  // ── Sort and filter events by date ascending ─────────────────
  const sortedEvents = useMemo(() => {
    if (!events || events.length === 0) return [];

    // activeGames 상태에 맞추어 비활성화된 게임 일정 원천 배제 (모바일 뷰 최적화 필터)
    const filtered = events.filter((ev) => {
      if (!activeGames) return true;
      return activeGames[ev.game] !== false;
    });

    return [...filtered].sort((a, b) => {
      const dateA = a.date || '';
      const dateB = b.date || '';
      if (dateA !== dateB) return dateA.localeCompare(dateB);

      // 날짜가 같을 때: 시간이 없는 일정(업데이트 등)을 우선 표시하고,
      // 시간이 있는 일정(공식 방송 등)은 시간 순(오름차순)으로 배치
      const timeA = a.time || '';
      const timeB = b.time || '';

      if (!timeA && timeB) return -1;
      if (timeA && !timeB) return 1;
      if (timeA && timeB) {
        return timeA.localeCompare(timeB);
      }

      // 3순위: 확정 일정을 우선 배치
      const confA = a.is_fixed ? 0 : 1;
      const confB = b.is_fixed ? 0 : 1;
      return confA - confB;
    });
  }, [events, activeGames]);

  // ── Check if today has any events ───────────────────────────
  const todayHasEvents = useMemo(() => {
    return sortedEvents.some((ev) => ev.date === todayStr);
  }, [sortedEvents, todayStr]);

  // ── Build rows with TODAY marker insertion ──────────────────
  const rows = useMemo(() => {
    if (sortedEvents.length === 0) return [];

    const result = [];
    let todayMarkerInserted = false;
    let prevDate = null;

    for (let i = 0; i < sortedEvents.length; i++) {
      const ev = sortedEvents[i];
      const evDate = ev.date || '';

      // Insert TODAY marker before the first event that is after today
      if (!todayHasEvents && !todayMarkerInserted && evDate > todayStr) {
        result.push({ type: 'today-marker' });
        todayMarkerInserted = true;
      }

      const isDuplicateDate = evDate === prevDate;
      result.push({
        type: 'event',
        event: ev,
        isDuplicateDate,
        isToday: evDate === todayStr,
      });
      prevDate = evDate;
    }

    // If all events are before today, append marker at the end
    if (!todayHasEvents && !todayMarkerInserted) {
      result.push({ type: 'today-marker' });
    }

    return result;
  }, [sortedEvents, todayStr, todayHasEvents]);

  // ── Auto-scroll to today on mount ───────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!containerRef.current) return;
      const target = containerRef.current.querySelector('.scroll-target-today');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [rows]);

  // ── Format date as M/D ─────────────────────────────────────
  function formatDate(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length < 3) return dateStr;
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    return `${m}/${d}`;
  }

  // ── Format time (HH:mm) ────────────────────────────────────
  function formatTime(timeStr) {
    if (!timeStr) return null;
    return timeStr.slice(0, 5);
  }

  // ── Get display type name ──────────────────────────────────
  function getDisplayTypeName(eventType) {
    return typeDisplayNames[eventType] || eventType || '';
  }

  // ── Resolve image path ─────────────────────────────────────
  function getImageSrc(event) {
    if (event.custom_img) {
      return `./assets/${event.custom_img}`;
    }
    const gameConf = gamesConfig && gamesConfig[event.game];
    if (gameConf && gameConf.defaultImg) {
      return gameConf.defaultImg;
    }
    return null;
  }

  // ── Get game theme color ───────────────────────────────────
  function getGameTheme(gameName) {
    const gameConf = gamesConfig && gamesConfig[gameName];
    if (gameConf && gameConf.theme) {
      return gameConf.theme;
    }
    return '#6366f1';
  }

  // ── Empty state ─────────────────────────────────────────────
  if (!events || events.length === 0) {
    return (
      <div className="list-view">
        <div className="list-view__empty">
          <div className="list-view__empty-icon">📅</div>
          <div className="list-view__empty-text">표시할 일정이 없습니다</div>
        </div>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────
  return (
    <div className="list-view" ref={containerRef}>
      <div className="list-view__timeline">
        {rows.map((row, idx) => {
          // ── TODAY marker row ──────────────────────────────
          if (row.type === 'today-marker') {
            return (
              <div
                key="today-marker"
                className="list-view__today-marker scroll-target-today"
              >
                <div className="list-view__today-marker-left">
                  <div className="list-view__today-marker-dot" />
                </div>
                <div className="list-view__today-marker-right">
                  <div className="list-view__today-marker-card">
                    <span className="list-view__today-marker-label">TODAY</span>
                    <span className="list-view__today-marker-date">
                      {formatDate(todayStr)}
                    </span>
                    <span className="list-view__today-marker-line" />
                  </div>
                </div>
              </div>
            );
          }

          // ── Event row ────────────────────────────────────
          const { event, isDuplicateDate, isToday } = row;
          const displayTypeName = getDisplayTypeName(event.type);
          const imgSrc = getImageSrc(event);
          const gameTheme = getGameTheme(event.game);

          return (
            <div
              key={`${event.game}-${event.type}-${event.date}-${idx}`}
              className={`list-view__row ${isToday ? 'list-view__row--today scroll-target-today' : ''}`}
            >
              {/* Left column: date + dot */}
              <div className="list-view__left">
                <span
                  className={`list-view__date ${isDuplicateDate ? 'list-view__date--duplicate' : ''}`}
                >
                  {formatDate(event.date)}
                </span>
                {event.time && (
                  <span className="list-view__time">
                    {formatTime(event.time)}
                  </span>
                )}
                <div className="list-view__dot" />
              </div>

              {/* Right column: event card (넷플릭스 스타일 가로 일러스트 배경 마스크 카드 개편) */}
              <div className="list-view__right">
                <div
                  className={`list-view__card ${isToday ? 'list-view__card--today' : ''} ${event.type === '공식방송' ? 'list-view__card--stream' : ''} ${event.type === '오프라인이벤트' ? 'list-view__card--offline' : ''}`}
                  onClick={() => onEventClick && onEventClick(event, displayTypeName)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onEventClick && onEventClick(event, displayTypeName);
                    }
                  }}
                >
                  {/* 우측 가로 배경 이미지 레이어 */}
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

                  {/* 전면 텍스트 정보판 */}
                  <div className="list-view__card-content">
                    {/* Card header */}
                    <div className="list-view__card-header">
                      <span
                        className="list-view__game-badge"
                        style={{ background: gameTheme.color || gameTheme }}
                      >
                        {event.game}
                      </span>

                      {event.version && (
                        <span className="list-view__version">
                          v{event.version}
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

                    {/* Card body */}
                    <div className="list-view__card-body-text">
                      <div className="list-view__title">
                        {event.title || displayTypeName}
                      </div>
                      {event.type === '오프라인이벤트' && event.location && (
                        <div className="list-view__offline-location" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: 'var(--accent-indigo-light)', marginTop: '4px', marginBottom: '2px', fontWeight: 700 }}>
                          <span>📍 {event.location}</span>
                        </div>
                      )}
                      {event.detail && (
                        <div className="list-view__detail">{event.detail}</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
