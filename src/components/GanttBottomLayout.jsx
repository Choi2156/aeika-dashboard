import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Radio,
  Youtube,
  MapPin,
  Megaphone,
  ChevronRight as ChevronRightIcon,
  Video,
  Shuffle,
  Film,
  Sparkles,
  ExternalLink,
  Play,
} from 'lucide-react';
import NoticeCategoryBadge from './NoticeCategoryBadge';
import {
  getCleanSummaryText,
  formatEventTypeLabel,
  cleanEventDisplayTitle,
  formatEventVersion,
} from '../utils/eventTextParser';
import {
  getTodayDateKST,
  formatDateObj,
  addDaysToDate,
  formatDisplayDate,
  diffDays,
} from '../utils/dateKST';
import {
  trackVideoClick,
  trackChannelClick,
  trackShuffleClick,
  trackCarouselNavigation,
  trackShortsInlinePlay,
} from '../utils/analytics';
import '../styles/GanttView.css';

function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getVideoAddedTime(video) {
  if (!video?.addedAt) return 0;
  const ts = new Date(video.addedAt).getTime();
  return Number.isFinite(ts) ? ts : 0;
}

function weightedShuffle(items, getWeight) {
  return items
    .map((item, idx) => {
      const weight = Math.max(0.05, getWeight(item, idx));
      const u = Math.max(1e-9, Math.random());
      return { item, score: Math.pow(u, 1 / weight) };
    })
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.item);
}

function getRecencyAgeWeight(addedTime, nowMs) {
  if (!addedTime) return 0.25;
  const ageDays = Math.max(0, (nowMs - addedTime) / 86400000);
  return 1 / (1 + ageDays / 14);
}

function allocateVideosWithShuffle(allVideos, activeGames, targetCount = 6) {
  if (!allVideos || allVideos.length === 0) return [];

  const activeGameNames =
    activeGames && Object.keys(activeGames).length > 0
      ? Object.keys(activeGames).filter((name) => activeGames[name] !== false)
      : Array.from(new Set(allVideos.map((v) => v.game)));

  const n = activeGameNames.length;
  if (n === 0) return [];

  const nowMs = Date.now();
  const gameVideoMap = {};
  const gameLatestMap = {};

  activeGameNames.forEach((game) => {
    const pool = allVideos
      .filter((v) => v.game === game && v.id)
      .sort((a, b) => {
        const diff = getVideoAddedTime(b) - getVideoAddedTime(a);
        if (diff !== 0) return diff;
        return (a.order ?? 999) - (b.order ?? 999);
      });

    gameLatestMap[game] = pool.length > 0 ? getVideoAddedTime(pool[0]) : 0;
    // 최신 업로드 순위 가중 셔플 (상위 1~3위가 우선 선별되되 셔플 시 풀 전체 순환)
    gameVideoMap[game] = weightedShuffle(pool, (_, idx) => Math.max(0.2, 1 - idx * 0.16));
  });

  const base = Math.floor(targetCount / n);
  const remainder = targetCount % n;
  const weightedGameOrder = weightedShuffle(activeGameNames, (game) =>
    getRecencyAgeWeight(gameLatestMap[game], nowMs)
  );
  const bonusSet = new Set(weightedGameOrder.slice(0, remainder));

  const selectedVideos = [];
  const selectedIds = new Set();
  const leftovers = [];

  activeGameNames.forEach((game) => {
    const limit = base + (bonusSet.has(game) ? 1 : 0);
    const orderedPool = gameVideoMap[game] || [];
    orderedPool.forEach((video, idx) => {
      if (idx < limit && !selectedIds.has(video.id)) {
        selectedVideos.push(video);
        selectedIds.add(video.id);
      } else if (!selectedIds.has(video.id)) {
        leftovers.push(video);
      }
    });
  });

  // 일부 게임 보유 수가 부족할 경우 타 활성 게임 최신 여분으로 슬롯 보충
  if (selectedVideos.length < targetCount && leftovers.length > 0) {
    const extraOrdered = weightedShuffle(leftovers, (v) =>
      getRecencyAgeWeight(getVideoAddedTime(v), nowMs)
    );
    for (const extra of extraOrdered) {
      if (selectedVideos.length >= targetCount) break;
      if (!selectedIds.has(extra.id)) {
        selectedVideos.push(extra);
        selectedIds.add(extra.id);
      }
    }
  }

  return weightedShuffle(selectedVideos, (v) =>
    getRecencyAgeWeight(getVideoAddedTime(v), nowMs)
  );
}

function allocateLongformVideos(allVideos, activeGames, targetCount = 12) {
  if (!allVideos || allVideos.length === 0) return [];

  const activeGameNames =
    activeGames && Object.keys(activeGames).length > 0
      ? Object.keys(activeGames).filter((name) => activeGames[name] !== false)
      : Array.from(new Set(allVideos.map((v) => v.game)));

  if (activeGameNames.length === 0) return [];

  const activeSet = new Set(activeGameNames);
  const seenIds = new Set();
  const filtered = [];
  for (const v of allVideos) {
    if (activeSet.has(v.game) && v.id && !seenIds.has(v.id)) {
      seenIds.add(v.id);
      filtered.push(v);
    }
  }

  const sorted = filtered.sort((a, b) => {
    const dateA = a.addedAt ? new Date(a.addedAt).getTime() : 0;
    const dateB = b.addedAt ? new Date(b.addedAt).getTime() : 0;
    return dateB - dateA;
  });

  if (sorted.length <= targetCount) return sorted;

  const anchorCount = Math.min(2, sorted.length);
  const anchored = sorted.slice(0, anchorCount);
  const remainingCount = targetCount - anchorCount;
  const candidatePool = sorted.slice(anchorCount, Math.min(sorted.length, targetCount + 10));
  const sampled = shuffleArray(candidatePool).slice(0, remainingCount);

  const finalSelection = [...anchored, ...sampled];
  finalSelection.sort((a, b) => {
    const dateA = a.addedAt ? new Date(a.addedAt).getTime() : 0;
    const dateB = b.addedAt ? new Date(b.addedAt).getTime() : 0;
    return dateB - dateA;
  });

  return finalSelection;
}

/**
 * GanttBottomLayout (v1.3.0 Unified Media & Full-Bleed Shorts Hub)
 * - 좌측: [공식 방송·오프라인] / [스토리 풀버전] / [추천 롱폼] 탭 스테이션 + 공지사항 보드
 * - 우측: 여백 없이 꽉 차는 풀블리드 세로형 쇼츠 스테이션
 */
function GanttBottomLayout({
  events,
  gamesConfig,
  activeGames,
  onEventClick,
  recommendedVideos,
  notices = [],
  onOpenNotice,
  isMobile,
}) {
  const [activeMediaTab, setActiveMediaTab] = useState('streams'); // 'streams' | 'stories' | 'others'
  const [pageIndex, setPageIndex] = useState(0);
  const [currentShortIndex, setCurrentShortIndex] = useState(0);
  const [isPlayingShort, setIsPlayingShort] = useState(false);
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const [isShuffling, setIsShuffling] = useState(false);

  useEffect(() => {
    setIsPlayingShort(false);
  }, [currentShortIndex]);

  useEffect(() => {
    setPageIndex(0);
  }, [activeMediaTab]);

  const today = useMemo(() => getTodayDateKST(), []);
  const todayStr = useMemo(() => formatDateObj(today), [today]);

  const getGameColor = useCallback(
    (gameName) =>
      gamesConfig?.[gameName]?.theme?.color ||
      gamesConfig?.[gameName]?.color ||
      '#6ee7b7',
    [gamesConfig]
  );

  // 1. 공식 방송 및 오프라인 행사
  const recentStreams = useMemo(() => {
    if (!events) return [];
    const rangeStart = formatDateObj(addDaysToDate(today, -14));
    const rangeEnd = formatDateObj(addDaysToDate(today, 21));
    const filtered = events.filter((ev) => {
      const isOffline = ev.type === '오프라인이벤트' || ev.type === '행사';
      if (ev.type !== '공식방송' && !isOffline) return false;
      if (ev.is_fixed !== true && ev.is_fixed !== 'true') return false;
      if (activeGames && activeGames[ev.game] === false) return false;

      if (ev.type === '공식방송') {
        if (ev.date < rangeStart || ev.date > rangeEnd) return false;
      } else if (isOffline) {
        const isEnded = ev.end_date ? ev.end_date < todayStr : ev.date < todayStr;
        if (isEnded) return false;
      }
      return true;
    });
    const future = filtered
      .filter((ev) => ev.date >= todayStr)
      .sort((a, b) => a.date.localeCompare(b.date));
    const past = filtered
      .filter((ev) => ev.date < todayStr)
      .sort((a, b) => b.date.localeCompare(a.date));
    return [...future, ...past].slice(0, 12);
  }, [events, today, todayStr, activeGames]);

  const activeGamesKey = useMemo(() => {
    if (!activeGames) return 'all';
    return Object.keys(activeGames)
      .filter((k) => activeGames[k] !== false)
      .sort()
      .join(',');
  }, [activeGames]);

  // 2. 추천 쇼츠
  const recommendedShorts = useMemo(() => {
    const rawShorts = recommendedVideos?.shorts || [];
    return allocateVideosWithShuffle(rawShorts, activeGames, 6);
  }, [recommendedVideos, activeGamesKey, shuffleSeed]);

  const handleShuffleShorts = useCallback(() => {
    setIsShuffling(true);
    setShuffleSeed((prev) => prev + 1);
    setCurrentShortIndex(0);
    setIsPlayingShort(false);
    setTimeout(() => setIsShuffling(false), 450);
  }, []);

  // 3. 스토리 풀버전
  const storyVideos = useMemo(() => {
    const rawLongform = recommendedVideos?.longform || [];
    const stories = rawLongform.filter((v) => {
      if (v.type !== 'story') return false;
      const text = v.desc || v.title || '';
      if (text && !text.includes('컷편집') && !text.includes('풀버전')) return false;
      return true;
    });
    return allocateLongformVideos(stories, activeGames, 12);
  }, [recommendedVideos, activeGamesKey]);

  // 4. 추천 롱폼
  const otherVideos = useMemo(() => {
    const rawLongform = recommendedVideos?.longform || [];
    const others = rawLongform.filter((v) => {
      if (v.type === 'other') return true;
      const text = v.desc || v.title || '';
      if (v.type === 'story' && text && !text.includes('컷편집') && !text.includes('풀버전')) {
        return true;
      }
      return false;
    });
    return allocateLongformVideos(others, activeGames, 12);
  }, [recommendedVideos, activeGamesKey]);

  // 방송/행사 목록이 비어 있으면 스토리 탭을 기본 선택
  useEffect(() => {
    if (activeMediaTab === 'streams' && recentStreams.length === 0 && storyVideos.length > 0) {
      setActiveMediaTab('stories');
    }
  }, [activeMediaTab, recentStreams.length, storyVideos.length]);

  const itemsPerPage = isMobile ? 2 : 4;
  const activeList =
    activeMediaTab === 'streams'
      ? recentStreams
      : activeMediaTab === 'stories'
      ? storyVideos
      : otherVideos;

  const totalPages = Math.max(1, Math.ceil(activeList.length / itemsPerPage));
  const safePage = Math.min(pageIndex, totalPages - 1);
  const visibleItems = activeList.slice(
    safePage * itemsPerPage,
    safePage * itemsPerPage + itemsPerPage
  );

  const activeMediaCategory =
    activeMediaTab === 'streams'
      ? 'streams'
      : activeMediaTab === 'stories'
      ? 'story'
      : 'other';

  const handlePrevPage = () => {
    trackCarouselNavigation(activeMediaCategory, 'prev');
    setPageIndex((p) => (p - 1 + totalPages) % totalPages);
  };
  const handleNextPage = () => {
    trackCarouselNavigation(activeMediaCategory, 'next');
    setPageIndex((p) => (p + 1) % totalPages);
  };

  const handlePrevShort = () => {
    if (recommendedShorts.length === 0) return;
    trackCarouselNavigation('shorts', 'prev');
    setCurrentShortIndex(
      (prev) => (prev - 1 + recommendedShorts.length) % recommendedShorts.length
    );
  };
  const handleNextShort = () => {
    if (recommendedShorts.length === 0) return;
    trackCarouselNavigation('shorts', 'next');
    setCurrentShortIndex((prev) => (prev + 1) % recommendedShorts.length);
  };

  const recentNotices = notices.slice(0, 4);
  const currentShort = recommendedShorts[currentShortIndex] || null;
  const currentShortColor = currentShort ? getGameColor(currentShort.game) : '#6ee7b7';

  return (
    <div className="media-hub">
      {/* ═══ 좌측: 탭 전환형 미디어 & 방송 스테이션 ═══ */}
      <div className="media-hub__left">
        <div className="media-station">
          <div className="media-station__header">
            <div className="media-station__tabs" role="tablist" aria-label="미디어 카테고리">
              <button
                type="button"
                role="tab"
                aria-selected={activeMediaTab === 'streams'}
                className={`media-station__tab ${
                  activeMediaTab === 'streams' ? 'is-active' : ''
                }`}
                onClick={() => {
                  trackCarouselNavigation('streams', 'tab');
                  setActiveMediaTab('streams');
                }}
              >
                <Radio size={14} />
                <span>공식 방송 · 오프라인</span>
                <span className="media-station__tab-count">{recentStreams.length}</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeMediaTab === 'stories'}
                className={`media-station__tab ${
                  activeMediaTab === 'stories' ? 'is-active' : ''
                }`}
                onClick={() => {
                  trackCarouselNavigation('story', 'tab');
                  setActiveMediaTab('stories');
                }}
              >
                <Film size={14} />
                <span>스토리 풀버전</span>
                <span className="media-station__tab-count">{storyVideos.length}</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeMediaTab === 'others'}
                className={`media-station__tab ${
                  activeMediaTab === 'others' ? 'is-active' : ''
                }`}
                onClick={() => {
                  trackCarouselNavigation('other', 'tab');
                  setActiveMediaTab('others');
                }}
              >
                <Video size={14} />
                <span>추천 롱폼</span>
                <span className="media-station__tab-count">{otherVideos.length}</span>
              </button>
            </div>

            {totalPages > 1 && (
              <div className="media-station__pager">
                <span className="media-station__page-num">
                  {safePage + 1} / {totalPages}
                </span>
                <button
                  type="button"
                  className="media-station__page-btn"
                  onClick={handlePrevPage}
                  aria-label="이전 페이지"
                >
                  <ChevronLeft size={15} />
                </button>
                <button
                  type="button"
                  className="media-station__page-btn"
                  onClick={handleNextPage}
                  aria-label="다음 페이지"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            )}
          </div>

          <div className="media-station__body">
            {activeList.length === 0 ? (
              <div className="media-station__empty">
                <Sparkles size={18} />
                <p>선택한 게임의 미디어 항목이 없습니다.</p>
              </div>
            ) : activeMediaTab === 'streams' ? (
              <div
                key={`streams-${safePage}`}
                className="media-station__grid media-grid-enter"
              >
                {visibleItems.map((ev) => {
                  const color = getGameColor(ev.game);
                  const isOffline = ev.type === '오프라인이벤트' || ev.type === '행사';
                  const cleanTypeLabel = formatEventTypeLabel(ev.type);
                  const imgSrc = ev.custom_img
                    ? `./assets/${ev.custom_img}`
                    : gamesConfig?.[ev.game]?.defaultImg;
                  const dDiff = diffDays(todayStr, ev.date);
                  const isEnded = !isOffline && ev.date < todayStr;
                  const statusLabel = isEnded
                    ? '종료됨'
                    : dDiff === 0
                    ? 'TODAY'
                    : dDiff > 0
                    ? `D-${dDiff}`
                    : '진행 중';

                  const cleanTitle = ev.title
                    ? cleanEventDisplayTitle(ev.title, ev.game)
                    : `${ev.game} ${cleanTypeLabel}`;

                  return (
                    <article
                      key={ev.id || `${ev.game}-${ev.date}`}
                      className="media-card"
                      style={{ '--card-accent': color }}
                      onClick={() =>
                        onEventClick?.(ev, cleanTypeLabel, 'bottom_stream')
                      }
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onEventClick?.(ev, cleanTypeLabel, 'bottom_stream');
                        }
                      }}
                    >
                      <div className="media-card__thumb-wrap">
                        <img
                          src={imgSrc}
                          alt={cleanTitle}
                          className="media-card__thumb"
                          loading="lazy"
                          onError={(e) => {
                            const fallback = gamesConfig?.[ev.game]?.defaultImg;
                            if (fallback && e.currentTarget.src !== fallback) {
                              e.currentTarget.src = fallback;
                            }
                          }}
                        />
                        <span className="media-card__game-tag">{ev.game}</span>
                        <span
                          className={`media-card__status-tag ${
                            isEnded ? 'is-ended' : dDiff === 0 ? 'is-today' : 'is-live'
                          }`}
                        >
                          {statusLabel}
                        </span>
                      </div>
                      <div className="media-card__info">
                        <div className="media-card__meta">
                          <span className="media-card__type">
                            {isOffline ? (
                              <>
                                <MapPin size={11} /> 오프라인 행사
                              </>
                            ) : (
                              <>
                                <Radio size={11} />{' '}
                                {(() => {
                                  const verTag = formatEventVersion(ev.version, { stripPhase: true });
                                  return verTag ? `${verTag} 특별 방송` : '특별 방송';
                                })()}
                              </>
                            )}
                          </span>
                          <span className="media-card__date">
                            {formatDisplayDate(ev.date, true)} {ev.time || ''}
                          </span>
                        </div>
                        <h4 className="media-card__title">{cleanTitle}</h4>
                        {(ev.details || ev.detail) && (
                          <p className="media-card__desc">
                            {getCleanSummaryText(ev.details || ev.detail, 68)}
                          </p>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div
                key={`${activeMediaTab}-${safePage}`}
                className="media-station__grid media-grid-enter"
              >
                {visibleItems.map((video, idx) => {
                  const color = getGameColor(video.game);
                  const thumbUrl = `https://img.youtube.com/vi/${video.id}/mqdefault.jpg`;
                  const isStory = activeMediaTab === 'stories';

                  return (
                    <a
                      key={`${video.id}_${idx}`}
                      href={`https://www.youtube.com/watch?v=${video.id}`}
                      onClick={() =>
                        trackVideoClick(
                          isStory ? 'story' : 'other',
                          video.game,
                          video.title || video.desc,
                          video.id
                        )
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="media-card media-card--video"
                      style={{ '--card-accent': color }}
                    >
                      <div className="media-card__thumb-wrap">
                        <img
                          src={thumbUrl}
                          alt={video.desc || video.title}
                          className="media-card__thumb"
                          loading="lazy"
                        />
                        <span className="media-card__game-tag">{video.game}</span>
                        <span className="media-card__play-badge" aria-hidden="true">
                          <Play size={14} fill="currentColor" />
                        </span>
                        <span className="media-card__duration-tag">
                          {video.duration || (isStory ? '스토리 풀버전' : '추천 영상')}
                        </span>
                      </div>
                      <div className="media-card__info">
                        <h4 className="media-card__title">
                          <span>{video.desc || video.title}</span>
                          <ExternalLink size={12} className="media-card__ext-icon" />
                        </h4>
                      </div>
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 공지사항 통합 보드 */}
        <section className="notice-unified-box">
          <div className="notice-unified-box__header">
            <div className="notice-unified-box__title-group">
              <Megaphone size={15} className="notice-unified-box__icon" />
              <span className="notice-unified-box__title">공지사항 · 패치노트</span>
            </div>
            <button
              type="button"
              className="notice-unified-box__all-btn"
              onClick={() => onOpenNotice && onOpenNotice(null)}
            >
              <span>전체 보기 ({notices.length})</span>
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
                  >
                    <div className="notice-unified-item__meta">
                      <NoticeCategoryBadge
                        category={n.category}
                        isImportant={n.is_important}
                      />
                      <span className="notice-unified-item__title">{n.title}</span>
                    </div>
                    <span className="notice-unified-item__date">{n.date}</span>
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

      {/* ═══ 우측: 추천 쇼츠 스테이션 (Full-Bleed Edge-to-Edge Vertical Stage) ═══ */}
      <div className="media-hub__right">
        <section className="shorts-station">
          <div className="shorts-station__header">
            <div className="shorts-station__title-group">
              <Youtube size={15} className="shorts-station__icon" />
              <h3 className="shorts-station__title">추천 인기 쇼츠</h3>
            </div>
            <div className="shorts-station__controls">
              <button
                type="button"
                className={`shorts-station__shuffle-btn ${
                  isShuffling ? 'is-spinning' : ''
                }`}
                onClick={() => {
                  trackShuffleClick();
                  handleShuffleShorts();
                }}
                title="추천 쇼츠 다시 섞기"
              >
                <Shuffle size={13} />
                <span>셔플</span>
              </button>
              <a
                href="https://www.youtube.com/@AEIKA215"
                onClick={() => trackChannelClick('bottom_shorts')}
                target="_blank"
                rel="noopener noreferrer"
                className="shorts-station__channel-btn"
              >
                <span>채널</span>
                <ExternalLink size={11} />
              </a>
            </div>
          </div>

          {currentShort ? (
            <div className="shorts-station__body">
              <div
                className="shorts-player-container"
                style={{ '--short-accent': currentShortColor }}
              >
                {/* Ambient blurred backdrop so there are never empty black margins */}
                <div
                  className="shorts-player-ambient-bg"
                  style={{
                    backgroundImage: `url(https://img.youtube.com/vi/${currentShort.id}/hqdefault.jpg)`,
                  }}
                  aria-hidden="true"
                />

                {isPlayingShort ? (
                  <iframe
                    className="shorts-player-iframe"
                    width="100%"
                    height="100%"
                    src={`https://www.youtube.com/embed/${currentShort.id}?autoplay=1`}
                    title={`${currentShort.game || '추천'} 쇼츠`}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                ) : (
                  <div
                    key={currentShort.id}
                    className="shorts-player-thumbnail-overlay"
                    onClick={() => {
                      trackVideoClick(
                        'shorts',
                        currentShort.game,
                        currentShort.title || currentShort.desc,
                        currentShort.id
                      );
                      trackShortsInlinePlay(
                        currentShort.game,
                        currentShort.id,
                        currentShort.title || currentShort.desc
                      );
                      setIsPlayingShort(true);
                    }}
                  >
                    <div
                      className="shorts-player-thumb-bg"
                      style={{
                        backgroundImage: `url(https://img.youtube.com/vi/${currentShort.id}/hqdefault.jpg)`,
                      }}
                    />
                    <div className="shorts-player__top-bar">
                      <span
                        className="shorts-player__game-pill"
                        style={{ '--pill-color': currentShortColor }}
                      >
                        {currentShort.game}
                      </span>
                      <span className="shorts-player__counter-pill">
                        {String(currentShortIndex + 1).padStart(2, '0')} /{' '}
                        {String(recommendedShorts.length).padStart(2, '0')}
                      </span>
                    </div>

                    <div className="shorts-custom-play-btn">
                      <Play size={22} fill="currentColor" />
                    </div>

                    {(currentShort.desc || currentShort.title) && (
                      <div className="shorts-player__caption">
                        <span className="shorts-player__caption-text">
                          {currentShort.desc || currentShort.title}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Clean Sleek Footer Bar (No Rainbow Hollow Dots) */}
              <div className="shorts-hud-bar">
                <button
                  onClick={handlePrevShort}
                  className="shorts-hud-bar__arrow"
                  type="button"
                  aria-label="이전 쇼츠"
                >
                  <ChevronLeft size={15} />
                </button>

                <div className="shorts-dot-indicators" role="tablist" aria-label="추천 쇼츠 목록">
                  {recommendedShorts.map((sh, idx) => {
                    const isActive = idx === currentShortIndex;
                    return (
                      <button
                        key={sh.id || `short-dot-${idx}`}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        className={`shorts-dot ${isActive ? 'shorts-dot--active' : ''}`}
                        onClick={() => setCurrentShortIndex(idx)}
                        style={{
                          '--dot-accent': isActive ? getGameColor(sh.game) : undefined,
                        }}
                        aria-label={`${sh.game} 쇼츠 ${idx + 1}`}
                      />
                    );
                  })}
                </div>

                <button
                  onClick={handleNextShort}
                  className="shorts-hud-bar__arrow"
                  type="button"
                  aria-label="다음 쇼츠"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          ) : (
            <div className="shorts-no-data-card">
              <Youtube size={22} />
              <p>선택된 게임의 추천 쇼츠가 없습니다.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default memo(GanttBottomLayout);
