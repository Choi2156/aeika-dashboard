import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ChevronDown, ChevronRight, ChevronLeft, Radio, Globe, Youtube } from 'lucide-react';
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

/* Display type name mapping */
const EVENT_TYPE_LABELS = {
  '전반업데이트': '버전 업데이트',
  '후반업데이트': '후반 업데이트',
  '공식방송': '방송',
  '행사': '행사',
};

/* ────────────────────────────────────────────
   유튜브 추천 쇼츠 및 롱폼 영상 폴백 데이터셋
   ──────────────────────────────────────────── */
const RECOMMENDED_SHORTS = [
  {
    id: '7JXTFo3jALM',
    url: 'https://youtube.com/shorts/7JXTFo3jALM',
    game: '붕괴: 스타레일'
  },
  {
    id: 'XzpEjNb24uU',
    url: 'https://youtube.com/shorts/XzpEjNb24uU',
    game: '명조'
  },
  {
    id: 'yYTIHZEmfwM',
    url: 'https://youtube.com/shorts/yYTIHZEmfwM',
    game: '원신'
  },
  {
    id: 'yeB6_T3W1o0',
    url: 'https://youtube.com/shorts/yeB6_T3W1o0',
    game: '젠레스 존 제로'
  }
];

const LONGFORM_VIDEOS = [
  {
    id: '5w1xdAsMvCg',
    url: 'https://youtu.be/5w1xdAsMvCg',
    game: '젠레스 존 제로',
    type: 'story',
    desc: '메인 스토리 시즌 2 에필로그 - 「뉴: 에리두의 일몰(하)」 (2.8버전) 컷편집 스토리 풀버전'
  },
  {
    id: 'YOYFRqSUp7Y',
    url: 'https://youtu.be/YOYFRqSUp7Y',
    game: '명일방주: 엔드필드',
    type: 'story',
    desc: '2장 프로세스 6 - 「천근의 무게」 (1.2버전) 컷편집 스토리 풀버전'
  },
  {
    id: 'LNHYjxEm-ek',
    url: 'https://youtu.be/LNHYjxEm-ek',
    game: '명조',
    type: 'story',
    desc: '조수 임무 제3장 제5막 「어젯밤의 뭇별들」 에필로그, 후일담 (3.3버전) 컷편집 스토리 풀버전'
  },
  {
    id: 'Fh38s_obFT4',
    url: 'https://youtu.be/Fh38s_obFT4',
    game: '붕괴: 스타레일',
    type: 'story',
    desc: '개척 임무 5장 3막 이상 낙원 - 「그리하여, 웃음소리는 멈추지 않으리」 (4.2버전) 컷편집 스토리 풀버전'
  }
];

/* ────────────────────────────────────────────
   GanttView Component
   ──────────────────────────────────────────── */
export default function GanttView({ events, gamesConfig, recommendedVideos, briefingData, activeGames, onToggleGame, onEventClick }) {
  const scrollRef = useRef(null);
  const [hoveredCol, setHoveredCol] = useState(null);
  const [currentShortIndex, setCurrentShortIndex] = useState(0);

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
      const baseLanes = ['전반업데이트', '후반업데이트', '공식방송'];
      
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

  /* ── ★ 최근 진행된 공식 방송 필터링 (최근 순 정렬 및 최대 2개 추출) ── */
  const recentStreams = useMemo(() => {
    if (!events) return [];
    return events
      .filter((ev) => ev.type === '공식방송' && ev.date < todayStr)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 2);
  }, [events, todayStr]);



  // 추천 비디오 JSON 데이터베이스 연동 및 폴백 바인딩
  const recommendedShorts = useMemo(() => {
    return recommendedVideos?.shorts?.length > 0 ? recommendedVideos.shorts : RECOMMENDED_SHORTS;
  }, [recommendedVideos]);

  const recommendedLongforms = useMemo(() => {
    return recommendedVideos?.longform?.length > 0 ? recommendedVideos.longform : LONGFORM_VIDEOS;
  }, [recommendedVideos]);

  // 스토리 및 기타 롱폼 영상 이원화 분류 파이프라인
  const storyVideos = useMemo(() => {
    return recommendedLongforms.filter((v) => v.type === 'story');
  }, [recommendedLongforms]);

  const otherVideos = useMemo(() => {
    return recommendedLongforms.filter((v) => v.type !== 'story');
  }, [recommendedLongforms]);

  /* 수동 추천 쇼츠 슬라이더 넘기기 제어 */
  const handlePrevShort = () => {
    setCurrentShortIndex((prev) => (prev - 1 + recommendedShorts.length) % recommendedShorts.length);
  };

  const handleNextShort = () => {
    setCurrentShortIndex((prev) => (prev + 1) % recommendedShorts.length);
  };

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
      todayIndex * CELL_WIDTH - scrollRef.current.clientWidth / 2 + GAME_COL_WIDTH;
    scrollRef.current.scrollLeft = Math.max(0, scrollTarget);
  }, [dateAxis]);

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
      const lanes = gameLanesMap[gameName] || ['전반업데이트', '후반업데이트', '공식방송'];
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
      const label = isSystemType
        ? (isFixed
          ? `[확정] v${ev.version || '?'} ${EVENT_TYPE_LABELS[ev.type] || ev.type}`
          : `[예상] v${ev.version || '?'} ${EVENT_TYPE_LABELS[ev.type] || ev.type}`)
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
          style={{ width: `${GAME_COL_WIDTH + totalGridWidth}px` }}
        >
          {/* ═══ Header Row ═══ */}
          <div className="gantt-header">
            <div
              className="gantt-header-game gantt-sticky-intersect"
              style={{ width: `${GAME_COL_WIDTH}px`, minWidth: `${GAME_COL_WIDTH}px` }}
            >
              <span className="gantt-header-game-label">게임</span>
            </div>

            <div className="gantt-header-dates">
              {dateAxis.map((day, i) => (
                <div
                  key={day.dateStr}
                  className={`gantt-header-cell${day.isToday ? ' gantt-header-today' : ''}${day.isWeekend ? ' gantt-header-weekend' : ''}${hoveredCol === i ? ' gantt-header-hovered' : ''}`}
                  style={{ width: `${CELL_WIDTH}px`, minWidth: `${CELL_WIDTH}px` }}
                  onMouseEnter={() => setHoveredCol(i)}
                  onMouseLeave={() => setHoveredCol(null)}
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
              
              const lanes = gameLanesMap[gameName] || ['전반업데이트', '후반업데이트', '공식방송'];
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
                      width: `${GAME_COL_WIDTH}px`,
                      minWidth: `${GAME_COL_WIDTH}px`,
                      '--game-color': color,
                    }}
                    onClick={() => onToggleGame && onToggleGame(gameName)}
                  >
                    <span className="gantt-game-indicator" style={{ backgroundColor: color }} />
                    
                    <div className="gantt-game-meta-group">
                      <span className="gantt-game-name">{gameName}</span>
                      {!isCollapsed && gamesConfig?.[gameName]?.officialUrl && (
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
                        className={`gantt-cell${day.isToday ? ' gantt-cell-today' : ''}${day.isWeekend ? ' gantt-cell-weekend' : ''}${hoveredCol === i ? ' gantt-cell-hovered' : ''}`}
                        style={{ width: `${CELL_WIDTH}px`, minWidth: `${CELL_WIDTH}px` }}
                        onMouseEnter={() => setHoveredCol(i)}
                        onMouseLeave={() => setHoveredCol(null)}
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

      {/* ═══ 간트 차트 하단 영역: 최근 공식 방송 및 롱폼 추천(좌) & 추천 쇼츠 슬라이더(우) 2분할 레이아웃 ═══ */}
      <div className="gantt-bottom-layout">
        {/* 1. 좌측 영역: 최근 공식 방송 리스트 및 스토리 풀버전 & 기타 기획 영상 이원화 */}
        <div className="gantt-bottom-left">
          {recentStreams.length > 0 && (
            <section className="recent-streams-section">
              <h3 className="recent-streams-section__title">
                <Radio size={15} className="recent-streams-section__title-icon" />
                <span>최근 진행된 공식 방송 정보</span>
              </h3>
              <div className="recent-streams-grid">
                {recentStreams.map((ev) => {
                  const color = getGameColor(ev.game);
                  const isFixed = ev.is_fixed === true;
                  
                  const imgSrc = ev.custom_img 
                    ? `./assets/${ev.custom_img}` 
                    : gamesConfig?.[ev.game]?.defaultImg;

                  return (
                    <div
                      key={ev.id || `recent-stream-${ev.date}`}
                      className="recent-stream-card"
                      onClick={() => onEventClick?.(ev, '공식방송')}
                      style={{ '--theme-color': color }}
                      title="클릭하여 상세 정보 팝업 보기"
                    >
                      <div className="recent-stream-card__thumb-wrapper">
                        <img src={imgSrc} alt={ev.title} className="recent-stream-card__thumb" />
                        <div className="recent-stream-card__badge" style={{ backgroundColor: color }}>
                          <Radio size={10} className="recent-stream-card__badge-icon" />
                          <span>{ev.game}</span>
                        </div>
                        {gamesConfig?.[ev.game]?.copyright && (
                          <span className="card-copyright-label">
                            {gamesConfig[ev.game].copyright}
                          </span>
                        )}
                      </div>
                      
                      <div className="recent-stream-card__content">
                        <div className="recent-stream-card__meta-row">
                          <span className="recent-stream-card__version">v{ev.version} 방송</span>
                          <span className={`recent-stream-card__status ${isFixed ? 'status-confirmed' : 'status-predicted'}`}>
                            {isFixed ? '확정' : '예상'}
                          </span>
                        </div>
                        <h4 className="recent-stream-card__title">
                          {ev.title ? ev.title.replace(/「|」/g, '') : `${ev.game} 공식 특별 방송`}
                        </h4>
                        <p className="recent-stream-card__date">
                          방송일자: {ev.date} {ev.time || '20:00'} (KST)
                        </p>
                        {ev.detail && (
                          <p className="recent-stream-card__detail">
                            {ev.detail.length > 80 ? `${ev.detail.substring(0, 80)}...` : ev.detail}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* 1-2. 최근 공식 방송 하단: 애이카 아카이브 게임 스토리 풀버전 바로가기 */}
          {storyVideos.length > 0 && (
            <section className="longform-videos-section">
              <h3 className="longform-videos-section__title">
                <Youtube size={15} className="longform-videos-section__title-icon" />
                <span>애이카 아카이브 게임 스토리 풀버전 바로가기</span>
              </h3>
              <div className="longform-videos-grid">
                {storyVideos.map((video) => {
                  const color = getGameColor(video.game);
                  const thumbUrl = `https://img.youtube.com/vi/${video.id}/mqdefault.jpg`;
                  return (
                    <a
                      key={video.id}
                      href={`https://www.youtube.com/watch?v=${video.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="longform-video-card"
                      style={{ '--theme-color': color }}
                      title="클릭하여 유튜브에서 스토리 풀버전 감상하기"
                    >
                      <div className="longform-video-card__thumb-wrapper">
                        <img src={thumbUrl} alt={video.title} className="longform-video-card__thumb" />
                        <div className="longform-video-card__duration-badge">
                          <span>{video.duration || '풀버전'}</span>
                        </div>
                        <div className="longform-video-card__game-badge" style={{ backgroundColor: color }}>
                          <span>{video.game}</span>
                        </div>
                        {gamesConfig?.[video.game]?.copyright && (
                          <span className="card-copyright-label">
                            {gamesConfig[video.game].copyright}
                          </span>
                        )}
                      </div>
                      <div className="longform-video-card__content">
                        <h4 className="longform-video-card__title">{video.title}</h4>
                        {video.desc && <p className="longform-video-card__desc">{video.desc}</p>}
                      </div>
                    </a>
                  );
                })}
              </div>
            </section>
          )}

          {/* 1-3. 스토리 외의 기타 기획/공략 롱폼 영상이 추가될 경우 분리 렌더링 */}
          {otherVideos.length > 0 && (
            <section className="longform-videos-section longform-videos-section--other">
              <h3 className="longform-videos-section__title">
                <Youtube size={15} className="longform-videos-section__title-icon" />
                <span>애이카 아카이브 추천 기획/공략 영상 바로가기</span>
              </h3>
              <div className="longform-videos-grid">
                {otherVideos.map((video) => {
                  const color = getGameColor(video.game);
                  const thumbUrl = `https://img.youtube.com/vi/${video.id}/mqdefault.jpg`;
                  return (
                    <a
                      key={video.id}
                      href={`https://www.youtube.com/watch?v=${video.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="longform-video-card"
                      style={{ '--theme-color': color }}
                      title="클릭하여 유튜브에서 스토리 외 기획 영상 감상하기"
                    >
                      <div className="longform-video-card__thumb-wrapper">
                        <img src={thumbUrl} alt={video.title} className="longform-video-card__thumb" />
                        <div className="longform-video-card__duration-badge">
                          <span>{video.duration || '추천'}</span>
                        </div>
                        <div className="longform-video-card__game-badge" style={{ backgroundColor: color }}>
                          <span>{video.game}</span>
                        </div>
                        {gamesConfig?.[video.game]?.copyright && (
                          <span className="card-copyright-label">
                            {gamesConfig[video.game].copyright}
                          </span>
                        )}
                      </div>
                      <div className="longform-video-card__content">
                        <h4 className="longform-video-card__title">{video.title}</h4>
                        {video.desc && <p className="longform-video-card__desc">{video.desc}</p>}
                      </div>
                    </a>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        {/* 2. 우측 영역: 애이카 아카이브 추천 쇼츠 수동 캐러셀 슬라이더 위젯 */}
        <div className="gantt-bottom-right">
          <section className="recommended-shorts-section">
            <h3 className="recommended-shorts-section__title">
              <Youtube size={15} className="recommended-shorts-section__title-icon" />
              <span>추천 인기 쇼츠</span>
            </h3>
            <div className="recommended-shorts-widget recommended-shorts-widget--minimal">
              
              {/* 이전 버튼 + 중앙 플레이어 + 다음 버튼 슬라이더 메인 그룹 */}
              <div className="shorts-slider-main">
                <button
                  onClick={handlePrevShort}
                  className="shorts-slider-arrow shorts-slider-arrow--left"
                  type="button"
                  title="이전 쇼츠 보기"
                >
                  <ChevronLeft size={20} />
                </button>

                <div className="shorts-player-container">
                  <iframe
                    width="100%"
                    height="100%"
                    src={`https://www.youtube.com/embed/${recommendedShorts[currentShortIndex]?.id}`}
                    title={`${recommendedShorts[currentShortIndex]?.game || '추천'} 쇼츠`}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  ></iframe>
                </div>

                <button
                  onClick={handleNextShort}
                  className="shorts-slider-arrow shorts-slider-arrow--right"
                  type="button"
                  title="다음 쇼츠 보기"
                >
                  <ChevronRight size={20} />
                </button>
              </div>

              {/* 하단 점형 페이지네이션 인디케이터 (대강의 쇼츠 개수 인지용) */}
              <div className="shorts-dot-indicators">
                {recommendedShorts.map((sh, idx) => {
                  const gameColor = getGameColor(sh.game);
                  const isActive = idx === currentShortIndex;
                  return (
                    <span
                      key={sh.id || `short-dot-${idx}`}
                      className={`shorts-dot ${isActive ? 'shorts-dot--active' : ''}`}
                      onClick={() => setCurrentShortIndex(idx)}
                      style={{
                        backgroundColor: isActive ? gameColor : undefined,
                        borderColor: gameColor
                      }}
                      title={`${sh.game} 쇼츠로 이동`}
                    />
                  );
                })}
              </div>

              {/* 최하단 채널 바로가기 버튼 */}
              <a
                href="https://www.youtube.com/@AEIKA215"
                target="_blank"
                rel="noopener noreferrer"
                className="shorts-channel-direct-btn"
                title="유튜브 채널 방문하여 더 많은 영상보기"
              >
                <Youtube size={13} />
                <span>애이카 아카이브 바로가기</span>
              </a>
              
            </div>
          </section>

          {/* 2-2. AI 게임 소식 정리 (추후 공개 예정) */}
          <section className="ai-briefing-section">
            <h3 className="ai-briefing-section__title">
              <span className="ai-briefing-section__title-pulse"></span>
              <span>🤖 AI 게임 소식 정리</span>
            </h3>
            
            <div className="ai-briefing-list">
              <div className="ai-briefing-card ai-briefing-card--upcoming">
                <div className="ai-briefing-card__meta">
                  <span className="ai-briefing-card__category" style={{ backgroundColor: 'rgba(99, 102, 241, 0.15)', color: '#a5b4fc' }}>
                    COMING SOON
                  </span>
                  <span className="ai-briefing-card__game" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', color: '#94a3b8', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    준비 중
                  </span>
                </div>
                <h4 className="ai-briefing-card__title">AI 게임 소식 자동 정리 기능 준비 중</h4>
                <p className="ai-briefing-card__summary">
                  서브컬처 업계 동향 및 공식 패치 정보를 요약하는 AI 에이전트 소식 정리 기능이 곧 공개됩니다.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
