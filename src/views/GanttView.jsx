import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ChevronDown, ChevronRight, Radio, Globe, Youtube } from 'lucide-react';
import GanttBottomLayout from '../components/GanttBottomLayout';
import '../styles/GanttView.css';

/* ────────────────────────────────────────────
   Constants
   ──────────────────────────────────────────── */
const CELL_WIDTH = 64;
const GAME_COL_WIDTH = 160;
const HEADER_HEIGHT = 52;
const ROW_HEIGHT_COLLAPSED = 28;
const DATE_RANGE_BEFORE = 30; // days before today
const DATE_RANGE_AFTER = 90; // days after today

/* ────────────────────────────────────────────
   Helper Functions
   ──────────────────────────────────────────── */
function getToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function getDaysDiff(startDate, endDate) {
  const s = new Date(startDate);
  const e = new Date(endDate);
  s.setHours(0, 0, 0, 0);
  e.setHours(0, 0, 0, 0);
  return Math.round((e - s) / (1000 * 60 * 60 * 24));
}

function formatDateStr(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function getKoreanDay(dayNum) {
  return ['일', '월', '화', '수', '목', '금', '토'][dayNum];
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function getShortGameName(gameName) {
  const mapping = {
    '붕괴: 스타레일': '스타레일',
    '젠레스 존 제로': '젠존제',
    '원신': '원신',
    '명조': '명조',
    '명일방주: 엔드필드': '엔드필드',
    '명일방주': '명방',
    '블루 아카이브': '블아',
    '소녀전선 2: 망명': '소전2',
    '소녀전선2: 망명': '소전2',
    '소녀전선2': '소전2',
    '이환': '이환',
  };
  return mapping[gameName] || gameName;
}

// 테마 컬러 광채 처리를 위한 HEX ➔ RGB 파서 유틸리티
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
  return '99, 102, 241'; // Fallback
}


/* Display type name mapping */
const EVENT_TYPE_LABELS = {
  '전반업데이트': '버전 업데이트',
  '후반업데이트': '후반 업데이트',
  '공식방송': '방송',
  '행사': '행사',
  '오프라인이벤트': '오프라인 이벤트',
};

/* ────────────────────────────────────────────
   GanttView Component
   ──────────────────────────────────────────── */
export default function GanttView({ events, gamesConfig, recommendedVideos, briefingData, activeGames, onToggleGame, onEventClick }) {
  const scrollRef = useRef(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const gameColWidth = isMobile ? 80 : GAME_COL_WIDTH;

  const today = useMemo(() => getToday(), []);
  const todayStr = useMemo(() => formatDateStr(today), [today]);

  /* ── Build date axis ── */
  const dateAxis = useMemo(() => {
    const start = addDays(today, -DATE_RANGE_BEFORE);
    const totalDays = DATE_RANGE_BEFORE + DATE_RANGE_AFTER + 1;
    const axis = [];
    for (let i = 0; i < totalDays; i++) {
      const d = addDays(start, i);
      axis.push({
        date: d,
        dateStr: formatDateStr(d),
        label: `${d.getMonth() + 1}/${d.getDate()}`,
        dayName: getKoreanDay(d.getDay()),
        isToday: formatDateStr(d) === todayStr,
        isWeekend: d.getDay() === 0 || d.getDay() === 6,
      });
    }
    return axis;
  }, [today, todayStr]);

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
    // Sort by gamesConfig key order if available
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

  /* ── Group events by game ── */
  const eventsByGame = useMemo(() => {
    const map = {};
    if (!events) return map;
    gameNames.forEach((g) => (map[g] = []));
    events.forEach((ev) => {
      if (map[ev.game]) map[ev.game].push(ev);
    });
    return map;
  }, [events, gameNames]);

  /* ── ★ 핵심: 게임별 동적 레인 맵 생성 (Dynamic Lanes System) ── */
  const gameLanesMap = useMemo(() => {
    const map = {};
    gameNames.forEach((gameName) => {
      const gameEvents = eventsByGame[gameName] || [];
      const baseLanes = ['전반업데이트', '후반업데이트', '공식방송', '오프라인이벤트'];
      
      const customTypes = new Set();
      gameEvents.forEach((ev) => {
        if (ev.type && !baseLanes.includes(ev.type)) {
          customTypes.add(ev.type);
        }
      });
      
      const sortedCustom = Array.from(customTypes).sort();
      map[gameName] = [...baseLanes, ...sortedCustom];
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
        left: startOffset * CELL_WIDTH,
        width: spanDays * CELL_WIDTH,
        startOffset,
        endOffset,
        spanDays,
      };
    },
    [axisStartStr]
  );

  /* ── Auto-scroll to today on mount ── */
  useEffect(() => {
    if (!scrollRef.current) return;
    const todayIndex = dateAxis.findIndex((d) => d.isToday);
    if (todayIndex === -1) return;
    const scrollTarget =
      todayIndex * CELL_WIDTH - scrollRef.current.clientWidth / 2 + gameColWidth;
    scrollRef.current.scrollLeft = Math.max(0, scrollTarget);
  }, [dateAxis, gameColWidth]);

  /* ── PC 뷰: 마우스 휠 세로 스크롤을 가로 스크롤로 치환 ── */
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const handleWheel = (e) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        container.scrollLeft += e.deltaY;
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, []);

  /* ── PC 뷰: 마우스 드래그 가로 스크롤 (Swipe to Scroll) ── */
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    let isDown = false;
    let startX;
    let scrollLeftVal;
    let isDragging = false;
    let dragStartX = 0;

    const handleMouseDown = (e) => {
      // 좌클릭만 허용 (이벤트 바 등 다른 요소 오인 동작 차단)
      if (e.button !== 0) return;
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

    const handleMouseUp = (e) => {
      isDown = false;
      container.classList.remove('gantt-container--dragging');
      
      // 실제 마우스를 드래그하여 이동했다면 클릭 이벤트를 강제 캡처/차단
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
      const walk = (x - startX) * 1.3; // 감속/가속도 조정
      
      if (Math.abs(e.pageX - dragStartX) > 5) {
        isDragging = true;
      }
      
      if (isDragging) {
        e.preventDefault();
        container.scrollLeft = scrollLeftVal - walk;
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
  }, []);

  /* ── Get theme color for game ── */
  const getGameColor = useCallback(
    (gameName) => {
      return gamesConfig?.[gameName]?.theme?.color || '#6366f1';
    },
    [gamesConfig]
  );

  /* ── Determine display label for event type ── */
  const getDisplayTypeName = useCallback((ev) => {
    if (ev.type === '공식방송') return '공식방송';
    if (ev.type === '후반업데이트') return '후반업데이트';
    if (ev.type === '전반업데이트') return '전반업데이트';
    if (ev.type === '오프라인이벤트') return '오프라인이벤트';
    return ev.type;
  }, []);

  /* ── Render a single event bar ── */
  const renderEventBar = useCallback(
    (ev, gameName, isCollapsed) => {
      const bar = getBarStyle(ev);
      if (!bar) return null;

      const color = getGameColor(gameName);
      const isFixed = ev.is_fixed === true;
      const displayType = getDisplayTypeName(ev);
      const isStream = ev.type === '공식방송';

      // 해당 게임의 동적 레인 맵에서 본 이벤트 타입의 인덱스 추적
      const lanes = gameLanesMap[gameName] || ['전반업데이트', '후반업데이트', '공식방송', '오프라인이벤트'];
      const laneIndex = lanes.indexOf(ev.type) !== -1 ? lanes.indexOf(ev.type) : 0;
      const topPos = `${laneIndex * 36 + 6}px`;

      if (isCollapsed) {
        return (
          <div
            key={ev.id || `${gameName}-${ev.type}-${ev.start_date}`}
            className="gantt-bar-collapsed"
            style={{
              left: `${bar.left}px`,
              width: `${bar.width}px`,
              backgroundColor: isFixed ? color : '#475569',
              borderStyle: isFixed ? 'solid' : 'dashed',
            }}
            onClick={(e) => {
              e.stopPropagation();
              onEventClick?.(ev, displayType);
            }}
            title={`${ev.version || ''} ${displayType}`}
          />
        );
      }

      const isOfflineEvent = ev.type === '오프라인이벤트';
      if (isOfflineEvent) {
        return (
          <div
            key={ev.id || `${gameName}-offline-${ev.start_date}`}
            className="gantt-bar gantt-bar-offline"
            style={{
              left: `${bar.left}px`,
              width: `${bar.width}px`,
              top: topPos,
              transform: 'none',
              height: '28px',
              '--bar-color': color,
              backgroundColor: `rgba(${hexToRgb(color)}, 0.06)`,
              border: `1.5px solid ${color}`,
              boxShadow: `0 0 10px rgba(${hexToRgb(color)}, 0.15)`,
              color: '#ffffff',
              fontWeight: 700,
            }}
            onClick={(e) => {
              e.stopPropagation();
              onEventClick?.(ev, displayType);
            }}
            title={`${ev.title} (장소: ${ev.location || '—'})`}
          >
            <span className="gantt-bar-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>📍</span>
              <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{ev.title}</span>
            </span>
          </div>
        );
      }

      if (isStream) {
        const flagBgColor = isFixed ? color : '#475569';
        const labelTextColor = isFixed ? color : '#94a3b8';
        const badgeLabel = isFixed ? 'LIVE' : '예상';

        return (
          <div
            key={ev.id || `${gameName}-stream-${ev.start_date}`}
            className={`gantt-bar-stream ${isFixed ? '' : 'gantt-bar-stream--predicted'}`}
            style={{
              left: `${bar.left}px`,
              top: `${laneIndex * 36 + 2}px`,
              transform: 'none',
            }}
            onClick={(e) => {
              e.stopPropagation();
              onEventClick?.(ev, displayType);
            }}
          >
            <div className="gantt-stream-flag" style={{ backgroundColor: flagBgColor, border: isFixed ? 'none' : '1px solid #64748b' }}>
              <Radio size={11} className="gantt-live-icon" />
              <span className="gantt-live-badge">{badgeLabel}</span>
            </div>
            <span className="gantt-stream-label" style={{ color: labelTextColor }}>
              {ev.version ? `v${ev.version} 방송` : '방송'}
            </span>
          </div>
        );
      }

      const isSystemType = ['전반업데이트', '후반업데이트'].includes(ev.type);
      const cleanVer = ev.version ? ev.version.replace(/\s*(전반|후반).*$/, '').trim() : '?';
      const label = isSystemType
        ? (isFixed
          ? `[확정] v${cleanVer} ${EVENT_TYPE_LABELS[ev.type] || ev.type}`
          : `[예상] v${cleanVer} ${EVENT_TYPE_LABELS[ev.type] || ev.type}`)
        : (isFixed
          ? `[확정] ${ev.title}`
          : `[예상] ${ev.title}`);

      return (
        <div
          key={ev.id || `${gameName}-${ev.type}-${ev.start_date}`}
          className={`gantt-bar ${isFixed ? 'gantt-bar-confirmed' : 'gantt-bar-predicted'}`}
          style={{
            left: `${bar.left}px`,
            width: `${bar.width}px`,
            top: topPos,
            transform: 'none',
            height: '28px',
            '--bar-color': color,
            backgroundColor: isFixed ? color : undefined,
            borderColor: isFixed ? color : undefined,
          }}
          onClick={(e) => {
            e.stopPropagation();
            onEventClick?.(ev, displayType);
          }}
          title={label}
        >
          <span className="gantt-bar-label">{label}</span>
        </div>
      );
    },
    [getBarStyle, getGameColor, getDisplayTypeName, onEventClick, gameLanesMap]
  );

  /* ── Today column index ── */
  const todayIndex = useMemo(
    () => dateAxis.findIndex((d) => d.isToday),
    [dateAxis]
  );

  /* ── Total width of date grid ── */
  const totalGridWidth = dateAxis.length * CELL_WIDTH;

  return (
    <div className="gantt-view-wrapper">
      <div className="gantt-container" ref={scrollRef}>
        <div
          className="gantt-grid"
          style={{ width: `${gameColWidth + totalGridWidth}px` }}
        >
          {/* ═══ Header Row ═══ */}
          <div className="gantt-header">
            <div
              className="gantt-header-game gantt-sticky-intersect"
              style={{ width: `${gameColWidth}px`, minWidth: `${gameColWidth}px` }}
            >
              <span className="gantt-header-game-label">게임</span>
            </div>

            <div className="gantt-header-dates">
              {dateAxis.map((day, i) => (
                <div
                  key={day.dateStr}
                  className={`gantt-header-cell${day.isToday ? ' gantt-header-today' : ''}${day.isWeekend ? ' gantt-header-weekend' : ''}`}
                  style={{ width: `${CELL_WIDTH}px`, minWidth: `${CELL_WIDTH}px` }}
                >
                  <span className="gantt-header-date">{day.label}</span>
                  <span className="gantt-header-day">{day.dayName}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ═══ Body Rows ═══ */}
          <div className="gantt-body">
            {gameNames.map((gameName) => {
              const isCollapsed = activeGames && activeGames[gameName] === false;
              const gameEvents = eventsByGame[gameName] || [];
              const color = getGameColor(gameName);
              
              const lanes = gameLanesMap[gameName] || ['전반업데이트', '후반업데이트', '공식방송', '오프라인이벤트'];
              const rowH = isCollapsed ? ROW_HEIGHT_COLLAPSED : (lanes.length * 36 + 12);

              return (
                <div
                  key={gameName}
                  className={`gantt-row${isCollapsed ? ' gantt-row-collapsed' : ''}`}
                  style={{ height: `${rowH}px` }}
                >
                  <div
                    className="gantt-row-game gantt-sticky-col"
                    style={{
                      width: `${gameColWidth}px`,
                      minWidth: `${gameColWidth}px`,
                      '--game-color': color,
                    }}
                    onClick={() => onToggleGame && onToggleGame(gameName)}
                  >
                    <span className="gantt-game-indicator" style={{ backgroundColor: color }} />
                    
                    <div className="gantt-game-meta-group">
                      <span className="gantt-game-name">{isMobile ? getShortGameName(gameName) : gameName}</span>
                      {!isCollapsed && (gamesConfig?.[gameName]?.officialUrl || gamesConfig?.[gameName]?.youtubeUrl) && (
                        <div className="gantt-game-links">
                          {gamesConfig?.[gameName]?.officialUrl && (
                            <a
                              href={gamesConfig[gameName].officialUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="gantt-game-link-btn"
                              onClick={(e) => e.stopPropagation()}
                              title={`${gameName} 공식 사이트 / 다운로드`}
                            >
                              <Globe size={11} />
                              <span>공식 사이트</span>
                            </a>
                          )}
                          {gamesConfig?.[gameName]?.youtubeUrl && (
                            <a
                              href={gamesConfig[gameName].youtubeUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="gantt-game-youtube-btn"
                              onClick={(e) => e.stopPropagation()}
                              title={`${gameName} 공식 유튜브 채널`}
                            >
                              <Youtube size={12} />
                            </a>
                          )}
                        </div>
                      )}
                    </div>

                    {isCollapsed ? (
                      <ChevronRight size={14} className="gantt-chevron" />
                    ) : (
                      <ChevronDown size={14} className="gantt-chevron" />
                    )}
                  </div>

                  <div className="gantt-row-cells" style={{ width: `${totalGridWidth}px` }}>
                    {dateAxis.map((day, i) => (
                      <div
                        key={day.dateStr}
                        className={`gantt-cell${day.isToday ? ' gantt-cell-today' : ''}${day.isWeekend ? ' gantt-cell-weekend' : ''}`}
                        style={{ width: `${CELL_WIDTH}px`, minWidth: `${CELL_WIDTH}px` }}
                      />
                    ))}

                    {todayIndex >= 0 && (
                      <div
                        className="gantt-today-line"
                        style={{ left: `${todayIndex * CELL_WIDTH + CELL_WIDTH / 2}px` }}
                      />
                    )}

                    <div className="gantt-bars-layer">
                      {gameEvents.map((ev) => renderEventBar(ev, gameName, isCollapsed))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ═══ 간트 차트 하단 영역 (별도 컴포넌트로 분리, 캐러셀 상태 격리) ═══ */}
      <GanttBottomLayout
        events={events}
        gamesConfig={gamesConfig}
        activeGames={activeGames}
        onEventClick={onEventClick}
        recommendedVideos={recommendedVideos}
        isMobile={isMobile}
      />
    </div>
  );
}
