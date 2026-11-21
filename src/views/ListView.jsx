import { useState, useEffect, useRef, useMemo } from 'react';
import { History, ChevronDown, RotateCcw, Search, X, AlertTriangle } from 'lucide-react';
import {
  getCleanSummaryText,
  cleanEventDisplayTitle,
  formatEventVersion,
  hasScheduleWarning,
  extractWarningSummary,
} from '../utils/eventTextParser';
import {
  getTodayStrKST,
  formatDisplayDate,
  parseDateStr,
  getKoreanDayName,
  diffDays,
} from '../utils/dateKST';
import '../styles/ListView.css';

const TYPE_DISPLAY_NAMES = {
  전반업데이트: '버전 업데이트',
  후반업데이트: '후반 픽업',
  공식방송: '특별 방송',
  오프라인이벤트: '오프라인 행사',
  행사: '오프라인 행사',
};

const TYPE_BADGE_MODIFIERS = {
  전반업데이트: 'update',
  후반업데이트: 'half',
  공식방송: 'stream',
  오프라인이벤트: 'offline',
  행사: 'offline',
};

function getCardStatusPill(event, todayStr) {
  if (!event || !event.date) return null;
  const startStr = event.date || event.start_date;
  const endStr = event.end_date || startStr;
  const dStart = diffDays(todayStr, startStr);

  if (startStr === todayStr) {
    return { label: 'TODAY', variant: 'today' };
  }
  if (dStart > 0) {
    return {
      label: `D-${dStart}`,
      variant: dStart <= 3 ? 'imminent' : 'upcoming',
    };
  }
  if (todayStr > startStr && todayStr <= endStr) {
    return { label: '진행 중', variant: 'ongoing' };
  }
  return { label: '종료', variant: 'past' };
}

/**
 * ListView v1.3.0 — Deep Violet-Indigo 수직 타임라인 + 우측 48% 그라데이션 일러스트 카드
 * - 상단 1줄 컨트롤 바 ([지난 일정 불러오기 (N건)] + 컴팩트 검색창)
 * - 좌측 수직 타임라인 축 + 게임 컬러 원형 노드 + 날짜(11/12 (목), 20:00)
 * - 카드 헤더: 게임 배지 + 버전(v3.8) + 유형 배지(버전 업데이트/후반 픽업/특별 방송/오프라인) + 확정/예상 + D-Day 상태 필(TODAY, D-3, 진행 중)
 */
const DEFAULT_PAST_DAYS = 14;
const PAST_STEP_DAYS = 30;

function shiftDateStr(dateStr, deltaDays) {
  const d = parseDateStr(dateStr);
  d.setDate(d.getDate() + deltaDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function ListView({
  events,
  gamesConfig,
  activeGames,
  onEventClick,
  jumpTodayTrigger,
}) {
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);
  const focusTimerRef = useRef(null);
  const todayPingTimerRef = useRef(null);
  // 탭 전환 후 복귀 시 초기 상태(14일)로 자연 복원되도록 비영구 로컬 상태로만 관리
  const [pastWindowDays, setPastWindowDays] = useState(DEFAULT_PAST_DAYS);
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedDate, setFocusedDate] = useState(null);
  const [isTodayPing, setIsTodayPing] = useState(false);

  const renderHighlightedTitle = (text, query) => {
    const q = query.trim();
    if (!q || !text) return text;
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="list-view__search-highlight">
          {text.slice(idx, idx + q.length)}
        </mark>
        {text.slice(idx + q.length)}
      </>
    );
  };

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
          ev.type,
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

  const pastCutoffStr = useMemo(
    () => shiftDateStr(todayStr, -pastWindowDays),
    [todayStr, pastWindowDays]
  );

  // 진행 중 일정(종료일 >= 오늘) + 최근 과거 범위(종료일 >= cutoff) 기본 노출,
  // 그보다 오래된 종료 일정은 '+30일' 버튼 클릭 시 점진 확장
  const { visibleEvents, hiddenPastCount } = useMemo(() => {
    const visible = [];
    let hiddenCount = 0;

    sortedEvents.forEach((ev) => {
      const startStr = ev.date || '';
      const endStr = ev.end_date || startStr;
      const isOngoingOrFuture = endStr >= todayStr;
      const isWithinPastWindow = endStr >= pastCutoffStr;

      if (isOngoingOrFuture || isWithinPastWindow) {
        visible.push(ev);
      } else {
        hiddenCount += 1;
      }
    });

    return { visibleEvents: visible, hiddenPastCount: hiddenCount };
  }, [sortedEvents, todayStr, pastCutoffStr]);

  const todayHasEvents = useMemo(() => {
    return visibleEvents.some((ev) => ev.date === todayStr);
  }, [visibleEvents, todayStr]);

  // TODAY 마커가 삽입된 타임라인 행 배열 생성 (최상단까지 모두 펼친 경우 1줄 서비스 개시 전 경계 표기)
  const rows = useMemo(() => {
    if (visibleEvents.length === 0) return [];

    const result = [];
    if (hiddenPastCount === 0 && !searchQuery.trim()) {
      result.push({ type: 'service-start-marker', key: 'service-start-marker' });
    }
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
  }, [visibleEvents, todayStr, todayHasEvents, hiddenPastCount, searchQuery]);

  // 진입 시 및 [오늘] 버튼 클릭 시 TODAY 지점으로 스크롤 포커싱
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!containerRef.current) return;
      const target = containerRef.current.querySelector('.scroll-target-today');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (jumpTodayTrigger > 0) {
          setIsTodayPing(false);
          requestAnimationFrame(() => setIsTodayPing(true));
          if (todayPingTimerRef.current) clearTimeout(todayPingTimerRef.current);
          todayPingTimerRef.current = setTimeout(() => setIsTodayPing(false), 780);
        }
      }
    }, 120);
    return () => clearTimeout(timer);
  }, [jumpTodayTrigger]);

  // '/' 단축키로 검색창 즉시 포커스 (모달이 열려 있거나 입력 중일 때는 무시)
  useEffect(() => {
    const handleSlashShortcut = (e) => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
      if (document.querySelector('.modal-overlay')) return;
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target?.isContentEditable) {
        return;
      }
      if (searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current.focus();
      }
    };
    window.addEventListener('keydown', handleSlashShortcut);
    return () => window.removeEventListener('keydown', handleSlashShortcut);
  }, []);

  useEffect(() => {
    return () => {
      if (focusTimerRef.current) {
        clearTimeout(focusTimerRef.current);
      }
      if (todayPingTimerRef.current) {
        clearTimeout(todayPingTimerRef.current);
      }
    };
  }, []);

  function handleDateAnchorClick(dateStr) {
    if (!dateStr || !containerRef.current) return;
    const target = containerRef.current.querySelector(
      `.list-view__row[data-date="${dateStr}"]`
    );
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    setFocusedDate(dateStr);
    if (focusTimerRef.current) {
      clearTimeout(focusTimerRef.current);
    }
    focusTimerRef.current = setTimeout(() => {
      setFocusedDate(null);
    }, 1450);
  }

  function getDateParts(dateStr) {
    if (!dateStr) return { shortDate: '', weekday: '' };
    const d = parseDateStr(dateStr);
    const m = d.getMonth() + 1;
    const day = d.getDate();
    const weekday = getKoreanDayName(d.getDay());
    return {
      shortDate: `${m}/${day}`,
      weekday,
    };
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
        color: '#6ee7b7',
        textOnBar: '#07090f',
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
          {hiddenPastCount > 0 && (
            <button
              type="button"
              className={`list-view__past-btn ${pastWindowDays > DEFAULT_PAST_DAYS ? 'is-open' : ''}`}
              onClick={() => setPastWindowDays((prev) => prev + PAST_STEP_DAYS)}
            >
              <History size={13} />
              <span>{`이전 ${PAST_STEP_DAYS}일 일정 더 보기 (${hiddenPastCount}건)`}</span>
              <ChevronDown size={13} />
            </button>
          )}
          {pastWindowDays > DEFAULT_PAST_DAYS && (
            <button
              type="button"
              className="list-view__past-reset-btn"
              onClick={() => setPastWindowDays(DEFAULT_PAST_DAYS)}
              title={`기본 범위(최근 ${DEFAULT_PAST_DAYS}일)로 되돌리기`}
            >
              <RotateCcw size={12} />
              <span>기본 범위로</span>
            </button>
          )}
        </div>

        <div className="list-view__search-box">
          <Search size={13} className="list-view__search-icon" />
          <input
            ref={searchInputRef}
            type="text"
            className="list-view__search-input"
            placeholder="캐릭터, 버전, 일정명 검색... ( / )"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape' && searchQuery) {
                e.stopPropagation();
                setSearchQuery('');
              }
            }}
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
            if (row.type === 'service-start-marker') {
              return (
                <div
                  key={row.key || 'service-start-marker'}
                  className="list-view__service-start"
                >
                  <div className="list-view__service-start-left">
                    <div className="list-view__service-start-dot" />
                  </div>
                  <div className="list-view__service-start-right">
                    <div className="list-view__service-start-bar">
                      <span className="list-view__service-start-date">~ 2026.04.16</span>
                      <span className="list-view__service-start-label">서비스 개시 전</span>
                      <div className="list-view__service-start-line" />
                    </div>
                  </div>
                </div>
              );
            }

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
                    <div
                      className={`list-view__today-marker-card${
                        isTodayPing ? ' list-view__today-marker-card--ping' : ''
                      }`}
                    >
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
            const typeModifier = TYPE_BADGE_MODIFIERS[event.type] || 'update';
            const imgSrc = getImageSrc(event);
            const gameTheme = getGameTheme(event.game);
            const hasWarning = hasScheduleWarning(event);
            const warningInfo = hasWarning
              ? extractWarningSummary(event.details || event.detail, event.warning_note, 90)
              : null;
            const cleanDetail = getCleanSummaryText(event.details || event.detail, 130);
            const statusPill = getCardStatusPill(event, todayStr);
            const versionLabel = formatEventVersion(event.version);
            const { shortDate, weekday } = getDateParts(event.date);
            const formattedTime = formatTime(event.time);
            const isDateFocused = focusedDate === event.date;

            return (
              <div
                key={row.key || `${event.game}-${event.type}-${event.date}-${idx}`}
                data-date={event.date || ''}
                className={[
                  'list-view__row',
                  isToday ? 'list-view__row--today scroll-target-today' : '',
                  isToday && isTodayPing ? 'list-view__row--today-ping' : '',
                  isDateFocused ? 'list-view__row--date-focused' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={{ '--row-idx': Math.min(idx, 12) }}
              >
                {/* 좌측 타임라인 축: 캡슐형 날짜 칩(11/12 + 목·20:00) 또는 동일 날짜 서브 노드 */}
                <div className="list-view__left">
                  {!isDuplicateDate ? (
                    <>
                      <button
                        type="button"
                        className={`list-view__date-chip ${
                          isToday ? 'list-view__date-chip--today' : ''
                        }`}
                        onClick={() => handleDateAnchorClick(event.date)}
                        aria-label={`${shortDate} (${weekday}) 일정 화면 중앙으로 이동`}
                        title="클릭 시 해당 날짜 일정을 화면 중앙으로 이동"
                      >
                        <span className="list-view__date-num">{shortDate}</span>
                        <span className="list-view__date-sub">
                          <span className="list-view__date-weekday">{weekday}</span>
                          {formattedTime && (
                            <>
                              <span className="list-view__date-sep" aria-hidden="true">·</span>
                              <span className="list-view__date-time">{formattedTime}</span>
                            </>
                          )}
                        </span>
                      </button>
                      <div
                        className="list-view__dot"
                        style={
                          !isToday
                            ? { borderColor: gameTheme.color || '#6ee7b7' }
                            : undefined
                        }
                      />
                    </>
                  ) : (
                    <button
                      type="button"
                      className="list-view__subnode-btn"
                      onClick={() => handleDateAnchorClick(event.date)}
                      aria-label={`${shortDate} (${weekday}) 첫 일정 화면 중앙으로 이동`}
                      title="클릭 시 해당 날짜 첫 일정을 화면 중앙으로 이동"
                    >
                      {formattedTime && (
                        <span className="list-view__time-chip">{formattedTime}</span>
                      )}
                      <span
                        className={`list-view__dot list-view__dot--sub ${
                          isToday ? 'list-view__dot--today' : ''
                        }`}
                        style={
                          !isToday
                            ? { borderColor: gameTheme.color || '#6ee7b7' }
                            : undefined
                        }
                      />
                    </button>
                  )}
                </div>

                {/* 우측 그라데이션 마스크 일러스트 카드 */}
                <div className="list-view__right">
                  <div
                    className={[
                      'list-view__card',
                      isToday ? 'list-view__card--today' : '',
                      event.type === '공식방송' ? 'list-view__card--stream' : '',
                      event.type === '오프라인이벤트' ? 'list-view__card--offline' : '',
                      hasWarning ? 'list-view__card--warning' : '',
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

                        {versionLabel && (
                          <span className="list-view__version">{versionLabel}</span>
                        )}

                        {displayTypeName && (
                          <span
                            className={`list-view__type-badge list-view__type-badge--${typeModifier}`}
                          >
                            {displayTypeName}
                          </span>
                        )}

                        {!event.is_fixed && (
                          <span className="list-view__status-badge list-view__status-badge--predicted">
                            예상
                          </span>
                        )}

                        {hasWarning && (
                          <span
                            className="list-view__warning-badge"
                            title={warningInfo?.text || '일정 변동 주의'}
                          >
                            <AlertTriangle size={11} strokeWidth={2.5} aria-hidden="true" />
                            <span>일정 주의</span>
                          </span>
                        )}

                        {statusPill && (
                          <span
                            className={`list-view__dday-pill list-view__dday-pill--${statusPill.variant}`}
                          >
                            {statusPill.label}
                          </span>
                        )}
                      </div>

                      <div className="list-view__card-body-text">
                        <div className="list-view__title">
                          {renderHighlightedTitle(
                            cleanEventDisplayTitle(event.title, event.game) || displayTypeName,
                            searchQuery
                          )}
                        </div>
                        {(event.type === '오프라인이벤트' || event.type === '행사') &&
                          event.location && (
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
