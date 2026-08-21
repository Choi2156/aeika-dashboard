import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { ChevronLeft, ChevronRight, Radio, Youtube, MapPin, Megaphone, ChevronRight as ChevronRightIcon, Video } from 'lucide-react';
import NoticeCategoryBadge from './NoticeCategoryBadge';

/* ────────────────────────────────────────────
   Helper Functions
   ──────────────────────────────────────────── */
function getToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDateStr(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/* ────────────────────────────────────────────
   Array Shuffle Helper (Fisher-Yates)
   ──────────────────────────────────────────── */
function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/* ────────────────────────────────────────────
   Video Allocation Algorithm with Smart Shuffle (쇼츠용)
   ──────────────────────────────────────────── */
function allocateVideosWithShuffle(allVideos, activeGames, targetCount = 6) {
  if (!allVideos || allVideos.length === 0) return [];

  const activeGameNames = activeGames && Object.keys(activeGames).length > 0
    ? Object.keys(activeGames).filter(name => activeGames[name] !== false)
    : Array.from(new Set(allVideos.map(v => v.game)));

  const n = activeGameNames.length;
  if (n === 0) return [];

  const gameVideoMap = {};
  activeGameNames.forEach(game => {
    const pool = allVideos.filter(v => v.game === game);
    gameVideoMap[game] = shuffleArray(pool);
  });

  const base = Math.floor(targetCount / n);
  let remainder = targetCount % n;

  const shuffledGameOrder = shuffleArray(activeGameNames);
  const bonusSet = new Set(shuffledGameOrder.slice(0, remainder));

  const selectedVideos = [];
  activeGameNames.forEach(game => {
    const limit = base + (bonusSet.has(game) ? 1 : 0);
    const sliced = gameVideoMap[game]?.slice(0, limit) || [];
    selectedVideos.push(...sliced);
  });

  return shuffleArray(selectedVideos);
}

/* ────────────────────────────────────────────
   Longform Video Allocation (최신순)
   ──────────────────────────────────────────── */
function allocateLongformVideos(allVideos, activeGames, targetCount = 6) {
  if (!allVideos || allVideos.length === 0) return [];

  const activeGameNames = activeGames && Object.keys(activeGames).length > 0
    ? Object.keys(activeGames).filter(name => activeGames[name] !== false)
    : Array.from(new Set(allVideos.map(v => v.game)));

  const n = activeGameNames.length;
  if (n === 0) return [];

  const gameVideoMap = {};
  activeGameNames.forEach(game => {
    gameVideoMap[game] = allVideos
      .filter(v => v.game === game)
      .sort((a, b) => {
        const dateA = a.addedAt ? new Date(a.addedAt) : new Date(0);
        const dateB = b.addedAt ? new Date(b.addedAt) : new Date(0);
        return dateB - dateA;
      });
  });

  const base = Math.floor(targetCount / n);
  let remainder = targetCount % n;

  const sortedGamesForBonus = [...activeGameNames].sort((a, b) => {
    const latestA = gameVideoMap[a]?.[0]?.addedAt || '';
    const latestB = gameVideoMap[b]?.[0]?.addedAt || '';
    if (latestA && latestB) return latestB.localeCompare(latestA);
    if (latestA) return -1;
    if (latestB) return 1;
    return 0;
  });

  const bonusSet = new Set(sortedGamesForBonus.slice(0, remainder));

  const selectedVideos = [];
  activeGameNames.forEach(game => {
    const limit = base + (bonusSet.has(game) ? 1 : 0);
    const sliced = gameVideoMap[game]?.slice(0, limit) || [];
    selectedVideos.push(...sliced);
  });

  return selectedVideos.sort((a, b) => {
    const dateA = a.addedAt ? new Date(a.addedAt) : new Date(0);
    const dateB = b.addedAt ? new Date(b.addedAt) : new Date(0);
    return dateB - dateA;
  });
}

/* ────────────────────────────────────────────
   Touch Swipe Handler Builder
   ──────────────────────────────────────────── */
function createTouchHandlers(onNext, onPrev) {
  let startX = null;
  let startY = null;
  let lastX = null;
  let lastY = null;

  const resolve = () => {
    if (startX === null || lastX === null) return;
    const diffX = startX - lastX;
    const diffY = startY - lastY;
    if (Math.abs(diffX) > 40 && Math.abs(diffX) > Math.abs(diffY)) {
      if (diffX > 0) { onNext(); } else { onPrev(); }
    }
    startX = null; startY = null; lastX = null; lastY = null;
  };

  return {
    onTouchStart: (e) => {
      if (e.touches && e.touches.length > 0) {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        lastX = startX; lastY = startY;
      }
    },
    onTouchMove: (e) => {
      if (e.touches && e.touches.length > 0) {
        lastX = e.touches[0].clientX;
        lastY = e.touches[0].clientY;
      }
    },
    onTouchEnd: resolve,
    onTouchCancel: resolve,
  };
}

/* ════════════════════════════════════════════
   GanttBottomLayout Component
   ════════════════════════════════════════════ */
function GanttBottomLayout({
  events,
  gamesConfig,
  activeGames,
  onEventClick,
  recommendedVideos,
  notices = [],
  onOpenNotice,
  isMobile
}) {

  /* ── Carousel / Slider State ── */
  const [currentShortIndex, setCurrentShortIndex] = useState(0);
  const [isPlayingShort, setIsPlayingShort] = useState(false);
  const [currentStreamIndex, setCurrentStreamIndex] = useState(0);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [currentOtherIndex, setCurrentOtherIndex] = useState(0);

  useEffect(() => { setIsPlayingShort(false); }, [currentShortIndex]);

  /* ── Date ── */
  const today = useMemo(() => getToday(), []);
  const todayStr = useMemo(() => formatDateStr(today), [today]);

  /* ── Game Color Helper ── */
  const getGameColor = useCallback(
    (gameName) => gamesConfig?.[gameName]?.theme?.color || gamesConfig?.[gameName]?.color || '#6366f1',
    [gamesConfig]
  );

  /* ── 1. Recent Streams & Offline Events (확정된 방송 및 행사만 정밀 필터링 - 라이브 원본 복원) ── */
  const recentStreams = useMemo(() => {
    if (!events) return [];
    const rangeStart = formatDateStr(addDays(today, -14));
    const rangeEnd   = formatDateStr(addDays(today, 14));
    const filtered = events.filter((ev) => {
      if (ev.type !== '공식방송' && ev.type !== '오프라인이벤트') return false;
      if (ev.is_fixed !== true) return false; // 예상 일정(_pred)은 제외하고 확정 일정만 노출!
      if (activeGames && activeGames[ev.game] === false) return false;
      
      if (ev.type === '공식방송') {
        // 공식 방송은 ±14일 기준 유지
        if (ev.date < rangeStart || ev.date > rangeEnd) return false;
      } else if (ev.type === '오프라인이벤트') {
        // 오프라인 행사는 종료되지 않은 예정된 것만 표시
        const isEnded = ev.end_date ? ev.end_date < todayStr : ev.date < todayStr;
        if (isEnded) return false;
      }
      return true;
    });
    const future = filtered.filter((ev) => ev.date >= todayStr).sort((a, b) => a.date.localeCompare(b.date));
    const past   = filtered.filter((ev) => ev.date <  todayStr).sort((a, b) => b.date.localeCompare(a.date));
    return [...future, ...past].slice(0, 10);
  }, [events, today, todayStr, activeGames]);

  // 활성화된 게임 목록의 고유 키 (참조 변경으로 인한 불필요한 셔플 재실행 방지)
  const activeGamesKey = useMemo(() => {
    if (!activeGames) return 'all';
    return Object.keys(activeGames).filter(k => activeGames[k] !== false).sort().join(',');
  }, [activeGames]);

  /* ── 2. 추천 쇼츠 데이터 (새로고침 시 및 활성 게임 변경 시에만 1회 스마트 셔플) ── */
  const recommendedShorts = useMemo(() => {
    const rawShorts = recommendedVideos?.shorts || [];
    return allocateVideosWithShuffle(rawShorts, activeGames, 6);
  }, [recommendedVideos, activeGamesKey]);

  /* ── 3-1. 스토리 풀버전 롱폼 비디오 데이터 ── */
  const storyVideos = useMemo(() => {
    const rawLongform = recommendedVideos?.longform || [];
    const stories = rawLongform.filter((v) => v.type === 'story');
    return allocateLongformVideos(stories, activeGames, 6);
  }, [recommendedVideos, activeGames]);

  /* ── 3-2. 일반 롱폼 비디오 데이터 (롱폼 추천 영상) ── */
  const otherVideos = useMemo(() => {
    const rawLongform = recommendedVideos?.longform || [];
    const others = rawLongform.filter((v) => v.type === 'other');
    return allocateLongformVideos(others, activeGames, 6);
  }, [recommendedVideos, activeGames]);

  /* ── Index Bounds Safety ── */
  useEffect(() => {
    if (recommendedShorts.length === 0) { setCurrentShortIndex(0); }
    else if (currentShortIndex >= recommendedShorts.length) { setCurrentShortIndex(recommendedShorts.length - 1); }
  }, [recommendedShorts.length, currentShortIndex]);

  useEffect(() => {
    if (recentStreams.length === 0) { setCurrentStreamIndex(0); }
    else if (currentStreamIndex >= recentStreams.length) { setCurrentStreamIndex(recentStreams.length - 1); }
  }, [recentStreams.length, currentStreamIndex]);

  useEffect(() => {
    if (storyVideos.length === 0) { setCurrentStoryIndex(0); }
    else if (currentStoryIndex >= storyVideos.length) { setCurrentStoryIndex(storyVideos.length - 1); }
  }, [storyVideos.length, currentStoryIndex]);

  useEffect(() => {
    if (otherVideos.length === 0) { setCurrentOtherIndex(0); }
    else if (currentOtherIndex >= otherVideos.length) { setCurrentOtherIndex(otherVideos.length - 1); }
  }, [otherVideos.length, currentOtherIndex]);

  /* ── Carousel Visible Items ── */
  const visibleCount = isMobile ? 1 : 2;

  const getVisibleItems = useCallback((items, currentIndex, vCount) => {
    if (!items || items.length === 0) return [];
    if (items.length <= vCount) return items;
    const result = [];
    for (let i = 0; i < vCount; i++) {
      const targetIdx = (currentIndex + i) % items.length;
      result.push(items[targetIdx]);
    }
    return result;
  }, []);

  const visibleStreams = useMemo(() => getVisibleItems(recentStreams, currentStreamIndex, visibleCount), [recentStreams, currentStreamIndex, visibleCount, getVisibleItems]);
  const visibleStories = useMemo(() => getVisibleItems(storyVideos, currentStoryIndex, visibleCount), [storyVideos, currentStoryIndex, visibleCount, getVisibleItems]);
  const visibleOthers  = useMemo(() => getVisibleItems(otherVideos, currentOtherIndex, visibleCount), [otherVideos, currentOtherIndex, visibleCount, getVisibleItems]);

  /* ── Carousel Navigation Handlers ── */
  const handlePrevStream = () => { if (recentStreams.length <= visibleCount) return; setCurrentStreamIndex((prev) => (prev - 1 + recentStreams.length) % recentStreams.length); };
  const handleNextStream = () => { if (recentStreams.length <= visibleCount) return; setCurrentStreamIndex((prev) => (prev + 1) % recentStreams.length); };
  
  const handlePrevStory = () => { if (storyVideos.length <= visibleCount) return; setCurrentStoryIndex((prev) => (prev - 1 + storyVideos.length) % storyVideos.length); };
  const handleNextStory = () => { if (storyVideos.length <= visibleCount) return; setCurrentStoryIndex((prev) => (prev + 1) % storyVideos.length); };

  const handlePrevOther = () => { if (otherVideos.length <= visibleCount) return; setCurrentOtherIndex((prev) => (prev - 1 + otherVideos.length) % otherVideos.length); };
  const handleNextOther = () => { if (otherVideos.length <= visibleCount) return; setCurrentOtherIndex((prev) => (prev + 1) % otherVideos.length); };

  const handlePrevShort = () => { setCurrentShortIndex((prev) => (prev - 1 + recommendedShorts.length) % recommendedShorts.length); };
  const handleNextShort = () => { setCurrentShortIndex((prev) => (prev + 1) % recommendedShorts.length); };

  /* ── Touch Handlers ── */
  const streamTouch = useMemo(() => createTouchHandlers(handleNextStream, handlePrevStream), [handleNextStream, handlePrevStream]);
  const storyTouch = useMemo(() => createTouchHandlers(handleNextStory, handlePrevStory), [handleNextStory, handlePrevStory]);
  const otherTouch = useMemo(() => createTouchHandlers(handleNextOther, handlePrevOther), [handleNextOther, handlePrevOther]);
  const shortsTouch = useMemo(() => createTouchHandlers(handleNextShort, handlePrevShort), [handleNextShort, handlePrevShort]);

  const recentNotices = notices.slice(0, 3);

  return (
    <div className="gantt-bottom-layout">
      {/* ═══ 1. 좌측 영역: 최근 공식 방송 리스트 및 추천 롱폼 영상 ═══ */}
      <div className="gantt-bottom-left">
        
        {/* 1-1. 공식 방송 및 오프라인 행사 일정 (원래 1줄 2개 캐러셀) */}
        {recentStreams.length > 0 && (
          <section className="recent-streams-section">
            <div className="section-header-carousel">
              <h3 className="recent-streams-section__title">
                <Radio size={15} className="recent-streams-section__title-icon" />
                <span>공식 방송 및 오프라인 행사 일정</span>
              </h3>
              {recentStreams.length > visibleCount && (
                <div className="carousel-nav-arrows">
                  <span className="carousel-counter">{currentStreamIndex + 1} / {recentStreams.length}</span>
                  <button onClick={handlePrevStream} className="carousel-arrow-btn" type="button" title="이전 목록 보기"><ChevronLeft size={16} /></button>
                  <button onClick={handleNextStream} className="carousel-arrow-btn" type="button" title="다음 목록 보기"><ChevronRight size={16} /></button>
                </div>
              )}
            </div>
            <div className="recent-streams-grid" {...streamTouch}>
              {visibleStreams.map((ev) => {
                const color = getGameColor(ev.game);
                const isFixed = ev.is_fixed === true;
                const isOffline = ev.type === '오프라인이벤트';
                const imgSrc = ev.custom_img ? `./assets/${ev.custom_img}` : gamesConfig?.[ev.game]?.defaultImg;

                return (
                  <div
                    key={ev.id || `recent-stream-${ev.date}`}
                    className="recent-stream-card"
                    onClick={() => onEventClick?.(ev, isOffline ? '오프라인이벤트' : '공식방송')}
                    style={{ '--theme-color': color }}
                    title="클릭하여 상세 정보 팝업 보기"
                  >
                    <div className="recent-stream-card__thumb-wrapper">
                      <img src={imgSrc} alt={ev.title} className="recent-stream-card__thumb" />
                      <div className="recent-stream-card__badge" style={{ backgroundColor: color }}>
                        {isOffline ? <MapPin size={10} className="recent-stream-card__badge-icon" /> : <Radio size={10} className="recent-stream-card__badge-icon" />}
                        <span>{ev.game}</span>
                      </div>
                      {gamesConfig?.[ev.game]?.copyright && (
                        <span className="card-copyright-label">{gamesConfig[ev.game].copyright}</span>
                      )}
                    </div>
                    <div className="recent-stream-card__content">
                      <div className="recent-stream-card__meta-row">
                        <span className="recent-stream-card__version">
                          {isOffline ? '📍 오프라인 행사' : `v${ev.version} 방송`}
                        </span>
                        {(!isOffline && ev.date < todayStr) ? (
                          <span className="recent-stream-card__status status-ended">종료됨</span>
                        ) : (
                          <span className={`recent-stream-card__status ${isFixed ? 'status-confirmed' : 'status-predicted'}`}>
                            {isFixed ? '확정' : '예상'}
                          </span>
                        )}
                      </div>
                      <h4 className="recent-stream-card__title">
                        {ev.title ? ev.title.replace(/「|」/g, '') : `${ev.game} 공식 특별 방송`}
                      </h4>
                      <p className="recent-stream-card__date">
                        {isOffline ? '행사일자' : '방송일자'}: {ev.date} {ev.time || (isOffline ? '' : '20:00')} {!isOffline && '(KST)'}
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

        {/* 1-2. 스토리 풀버전 바로보기 (1줄 2개 캐러셀) */}
        {storyVideos.length > 0 && (
          <section className="longform-videos-section">
            <div className="section-header-carousel">
              <h3 className="longform-videos-section__title">
                <Youtube size={15} className="longform-videos-section__title-icon" />
                <span>스토리 풀버전 바로보기</span>
              </h3>
              {storyVideos.length > visibleCount && (
                <div className="carousel-nav-arrows">
                  <span className="carousel-counter">{currentStoryIndex + 1} / {storyVideos.length}</span>
                  <button onClick={handlePrevStory} className="carousel-arrow-btn" type="button" title="이전 스토리 보기"><ChevronLeft size={16} /></button>
                  <button onClick={handleNextStory} className="carousel-arrow-btn" type="button" title="다음 스토리 보기"><ChevronRight size={16} /></button>
                </div>
              )}
            </div>
            <div className="longform-videos-grid" {...storyTouch}>
              {visibleStories.map((video) => {
                const color = getGameColor(video.game);
                const thumbUrl = `https://img.youtube.com/vi/${video.id}/mqdefault.jpg`;
                return (
                  <a key={video.id} href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noopener noreferrer" className="longform-video-card" style={{ '--theme-color': color }} title="클릭하여 유튜브에서 스토리 풀버전 감상하기">
                    <div className="longform-video-card__thumb-wrapper">
                      <img src={thumbUrl} alt={video.title} className="longform-video-card__thumb" />
                      <div className="longform-video-card__duration-badge"><span>{video.duration || '풀버전'}</span></div>
                      <div className="longform-video-card__game-badge" style={{ backgroundColor: color }}><span>{video.game}</span></div>
                      {gamesConfig?.[video.game]?.copyright && (<span className="card-copyright-label">{gamesConfig[video.game].copyright}</span>)}
                    </div>
                    <div className="longform-video-card__content">
                      {video.desc && <p className="longform-video-card__desc">{video.desc}</p>}
                    </div>
                  </a>
                );
              })}
            </div>
          </section>
        )}

        {/* 1-3. 롱폼 추천 영상 (일반 롱폼 / 하이라이트 등 - 1줄 2개 캐러셀) */}
        <section className="longform-videos-section other-longform-section">
          <div className="section-header-carousel">
            <h3 className="longform-videos-section__title">
              <Video size={15} className="longform-videos-section__title-icon" />
              <span>롱폼 추천 영상</span>
            </h3>
            {otherVideos.length > visibleCount && (
              <div className="carousel-nav-arrows">
                <span className="carousel-counter">{currentOtherIndex + 1} / {otherVideos.length}</span>
                <button onClick={handlePrevOther} className="carousel-arrow-btn" type="button" title="이전 영상 보기">
                  <ChevronLeft size={16} />
                </button>
                <button onClick={handleNextOther} className="carousel-arrow-btn" type="button" title="다음 영상 보기">
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
          {otherVideos.length > 0 ? (
            <div className="longform-videos-grid" {...otherTouch}>
              {visibleOthers.map((video) => {
                const color = getGameColor(video.game);
                const thumbUrl = `https://img.youtube.com/vi/${video.id}/mqdefault.jpg`;
                return (
                  <a key={video.id} href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noopener noreferrer" className="longform-video-card" style={{ '--theme-color': color }} title="클릭하여 유튜브에서 영상 감상하기">
                    <div className="longform-video-card__thumb-wrapper">
                      <img src={thumbUrl} alt={video.title} className="longform-video-card__thumb" />
                      <div className="longform-video-card__duration-badge"><span>영상</span></div>
                      <div className="longform-video-card__game-badge" style={{ backgroundColor: color }}><span>{video.game}</span></div>
                      {gamesConfig?.[video.game]?.copyright && (<span className="card-copyright-label">{gamesConfig[video.game].copyright}</span>)}
                    </div>
                    <div className="longform-video-card__content">
                      {video.desc && <p className="longform-video-card__desc">{video.desc}</p>}
                    </div>
                  </a>
                );
              })}
            </div>
          ) : (
            <div className="streams-no-data-card">
              <p className="streams-no-data-card__text">현재 선택된 게임의 추천 롱폼 영상이 없습니다.</p>
            </div>
          )}
        </section>

      </div>

      {/* ═══ 2. 우측 영역: 추천 쇼츠 슬라이더 + 공지사항 일체형 박스 ═══ */}
      <div className="gantt-bottom-right">
        <section className="recommended-shorts-section">
          <h3 className="recommended-shorts-section__title">
            <Youtube size={15} className="recommended-shorts-section__title-icon" />
            <span>추천 인기 쇼츠</span>
          </h3>
          <div className="recommended-shorts-widget recommended-shorts-widget--minimal" {...shortsTouch}>
            {recommendedShorts.length > 0 ? (
              <>
                <div className="shorts-slider-main">
                  <button onClick={handlePrevShort} className="shorts-slider-arrow shorts-slider-arrow--left" type="button" title="이전 쇼츠 보기">
                    <ChevronLeft size={20} />
                  </button>
                  <div className="shorts-player-container">
                    {isPlayingShort ? (
                      <iframe
                        width="100%" height="100%"
                        src={`https://www.youtube.com/embed/${recommendedShorts[currentShortIndex]?.id}?autoplay=1`}
                        title={`${recommendedShorts[currentShortIndex]?.game || '추천'} 쇼츠`}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                      ></iframe>
                    ) : (
                      <div
                        className="shorts-player-thumbnail-overlay"
                        onClick={() => setIsPlayingShort(true)}
                        title="클릭하여 쇼츠 감상하기"
                        style={{ backgroundImage: `url(https://img.youtube.com/vi/${recommendedShorts[currentShortIndex]?.id}/hqdefault.jpg)` }}
                      >
                        <div className="shorts-custom-play-btn">
                          <Youtube size={32} color="#ff0000" fill="#ff0000" className="shorts-play-icon-glow" />
                        </div>
                      </div>
                    )}
                  </div>
                  <button onClick={handleNextShort} className="shorts-slider-arrow shorts-slider-arrow--right" type="button" title="다음 쇼츠 보기">
                    <ChevronRight size={20} />
                  </button>
                </div>

                <div className="shorts-dot-indicators">
                  {recommendedShorts.map((sh, idx) => {
                    const gameColor = getGameColor(sh.game);
                    const isActive = idx === currentShortIndex;
                    return (
                      <span
                        key={sh.id || `short-dot-${idx}`}
                        className={`shorts-dot ${isActive ? 'shorts-dot--active' : ''}`}
                        onClick={() => setCurrentShortIndex(idx)}
                        style={{ backgroundColor: isActive ? gameColor : undefined, borderColor: gameColor }}
                        title={`${sh.game} 쇼츠로 이동`}
                      />
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="shorts-no-data-card">
                <Youtube size={24} color="#64748b" style={{ marginBottom: '6px' }} />
                <p className="shorts-no-data-card__text">활성화된 게임의 추천 쇼츠가 없습니다.</p>
                <span className="shorts-no-data-card__sub">필터바에서 다른 게임을 활성화해주세요.</span>
              </div>
            )}

            <a href="https://www.youtube.com/@AEIKA215" target="_blank" rel="noopener noreferrer" className="shorts-channel-direct-btn" title="유튜브 채널 방문하여 더 많은 영상보기">
              <Youtube size={13} />
              <span>애이카 아카이브 바로가기</span>
            </a>
          </div>
        </section>

        {/* 2-2. 신규 공지사항 통합 박스 위젯 (단일 일체형 디자인) */}
        <section className="notice-unified-box">
          <div className="notice-unified-box__header">
            <div className="notice-unified-box__title-group">
              <Megaphone size={15} className="notice-unified-box__icon" />
              <span className="notice-unified-box__title">공지사항</span>
            </div>
            <button
              className="notice-unified-box__all-btn"
              onClick={() => onOpenNotice && onOpenNotice(null)}
              title="전체 공지사항 목록 열기"
            >
              <span>전체보기</span>
              <ChevronRightIcon size={13} />
            </button>
          </div>

          <div className="notice-unified-box__body">
            {recentNotices.length > 0 ? (
              <ul className="notice-unified-list">
                {recentNotices.map((n) => (
                  <li
                    key={n.id}
                    className="notice-unified-item"
                    onClick={() => onOpenNotice && onOpenNotice(n)}
                    title="클릭하여 상세 공지 보기"
                  >
                    <div className="notice-unified-item__meta">
                      <NoticeCategoryBadge
                        category={n.category}
                        isImportant={n.is_important}
                      />
                      <span className="notice-unified-item__date">{n.date}</span>
                    </div>
                    <p className="notice-unified-item__title">{n.title}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="notice-unified-empty">
                <p>등록된 공지사항이 없습니다.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default memo(GanttBottomLayout);
