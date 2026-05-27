import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ChevronDown, ChevronRight, ChevronLeft, Radio, Globe, Youtube, MapPin } from 'lucide-react';
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

/**
 * 활성화된 게임 개수에 맞춰 노출 영상(롱폼/숏폼)을 동적으로 분배하는 프리미엄 추천 알고리즘
 */
function allocateVideos(allVideos, activeGames, targetCount = 6) {
  if (!allVideos || allVideos.length === 0) return [];
  
  // activeGames가 주어지지 않았거나 빈 객체일 경우 모든 게임 활성화 상태로 취급
  const activeGameNames = activeGames && Object.keys(activeGames).length > 0
    ? Object.keys(activeGames).filter(name => activeGames[name] !== false)
    : Array.from(new Set(allVideos.map(v => v.game)));
  
  const n = activeGameNames.length;
  if (n === 0) return [];
  
  // 1. 활성화된 게임별 영상 목록 분류 및 내림차순(addedAt 내림차순) 정렬
  const gameVideoMap = {};
  activeGameNames.forEach(game => {
    gameVideoMap[game] = allVideos
      .filter(v => v.game === game)
      .sort((a, b) => {
        const dateA = a.addedAt ? new Date(a.addedAt) : new Date(0);
        const dateB = b.addedAt ? new Date(b.addedAt) : new Date(0);
        return dateB - dateA; // 최신순
      });
  });
  
  // 2. 게임당 기본 보장 할당량 및 잔여 개수 계산
  const base = Math.floor(targetCount / n);
  let remainder = targetCount % n;
  
  // 3. 잔여 보너스 슬롯(+1개) 우선순위 배정
  // 우선순위: 각 게임의 가장 최신 영상의 addedAt이 가장 최근인 순서
  const sortedGamesForBonus = [...activeGameNames].sort((a, b) => {
    const latestA = gameVideoMap[a]?.[0]?.addedAt || '';
    const latestB = gameVideoMap[b]?.[0]?.addedAt || '';
    if (latestA && latestB) return latestB.localeCompare(latestA);
    if (latestA) return -1;
    if (latestB) return 1;
    return 0;
  });
  
  const bonusSet = new Set(sortedGamesForBonus.slice(0, remainder));
  
  // 4. 할당 한도에 맞춰 각 게임별 비디오 슬라이싱 취합
  const selectedVideos = [];
  activeGameNames.forEach(game => {
    const limit = base + (bonusSet.has(game) ? 1 : 0);
    const sliced = gameVideoMap[game]?.slice(0, limit) || [];
    selectedVideos.push(...sliced);
  });
  
  // 5. 취합된 비디오 목록 전체를 최신순으로 2차 정렬하여 세련되게 반환
  return selectedVideos.sort((a, b) => {
    const dateA = a.addedAt ? new Date(a.addedAt) : new Date(0);
    const dateB = b.addedAt ? new Date(b.addedAt) : new Date(0);
    return dateB - dateA;
  });
}

/* ────────────────────────────────────────────
   유튜브 추천 쇼츠 및 롱폼 영상 폴백 데이터셋
   ──────────────────────────────────────────── */
const RECOMMENDED_SHORTS = [
  {
    id: '7JXTFo3jALM',
    url: 'https://youtube.com/shorts/7JXTFo3jALM',
    game: '붕괴: 스타레일',
    addedAt: '2026-05-27T09:30:00Z'
  },
  {
    id: 'XzpEjNb24uU',
    url: 'https://youtube.com/shorts/XzpEjNb24uU',
    game: '명조',
    addedAt: '2026-05-27T10:00:00Z'
  },
  {
    id: 'yYTIHZEmfwM',
    url: 'https://youtube.com/shorts/yYTIHZEmfwM',
    game: '원신',
    addedAt: '2026-05-27T08:30:00Z'
  },
  {
    id: 'yeB6_T3W1o0',
    url: 'https://youtube.com/shorts/yeB6_T3W1o0',
    game: '젠레스 존 제로',
    addedAt: '2026-05-27T09:00:00Z'
  }
];

const LONGFORM_VIDEOS = [
  {
    id: '5w1xdAsMvCg',
    url: 'https://youtu.be/5w1xdAsMvCg',
    game: '젠레스 존 제로',
    type: 'story',
    desc: '메인 스토리 시즌 2 에필로그 - 「뉴: 에리두의 일몰(하)」 (2.8버전) 컷편집 스토리 풀버전',
    addedAt: '2026-05-27T10:30:00Z'
  },
  {
    id: 'YOYFRqSUp7Y',
    url: 'https://youtu.be/YOYFRqSUp7Y',
    game: '명일방주: 엔드필드',
    type: 'story',
    desc: '2장 프로세스 6 - 「천근의 무게」 (1.2버전) 컷편집 스토리 풀버전',
    addedAt: '2026-05-27T09:15:00Z'
  },
  {
    id: 'LNHYjxEm-ek',
    url: 'https://youtu.be/LNHYjxEm-ek',
    game: '명조',
    type: 'story',
    desc: '조수 임무 제3장 제5막 「어젯밤의 뭇별들」 에필로그, 후일담 (3.3버전) 컷편집 스토리 풀버전',
    addedAt: '2026-05-27T09:45:00Z'
  },
  {
    id: 'Fh38s_obFT4',
    url: 'https://youtu.be/Fh38s_obFT4',
    game: '붕괴: 스타레일',
    type: 'story',
    desc: '개척 임무 5장 3막 이상 낙원 - 「그리하여, 웃음소리는 멈추지 않으리」 (4.2버전) 컷편집 스토리 풀버전',
    addedAt: '2026-05-27T09:00:00Z'
  }
];

/* ────────────────────────────────────────────
   GanttView Component
   ──────────────────────────────────────────── */
export default function GanttView({ events, gamesConfig, recommendedVideos, briefingData, activeGames, onToggleGame, onEventClick }) {
  const scrollRef = useRef(null);
  const [hoveredCol, setHoveredCol] = useState(null);
  const [currentShortIndex, setCurrentShortIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Bottom Carousels sliding state indexes
  const [currentStreamIndex, setCurrentStreamIndex] = useState(0);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [currentOtherIndex, setCurrentOtherIndex] = useState(0);
  const [isPlayingShort, setIsPlayingShort] = useState(false);

  useEffect(() => {
    setIsPlayingShort(false);
  }, [currentShortIndex]);

  // 게임 필터 토글로 인해 비디오 목록 개수가 동적으로 바뀔 때 인덱스 범위를 안전하게 케어하는 방어 로직
  useEffect(() => {
    if (recommendedShorts.length === 0) {
      setCurrentShortIndex(0);
    } else if (currentShortIndex >= recommendedShorts.length) {
      setCurrentShortIndex(recommendedShorts.length - 1);
    }
  }, [recommendedShorts.length]);

  useEffect(() => {
    if (recentStreams.length === 0) {
      setCurrentStreamIndex(0);
    } else if (currentStreamIndex >= recentStreams.length) {
      setCurrentStreamIndex(recentStreams.length - 1);
    }
  }, [recentStreams.length]);

  useEffect(() => {
    if (storyVideos.length === 0) {
      setCurrentStoryIndex(0);
    } else if (currentStoryIndex >= storyVideos.length) {
      setCurrentStoryIndex(storyVideos.length - 1);
    }
  }, [storyVideos.length]);

  useEffect(() => {
    if (otherVideos.length === 0) {
      setCurrentOtherIndex(0);
    } else if (currentOtherIndex >= otherVideos.length) {
      setCurrentOtherIndex(otherVideos.length - 1);
    }
  }, [otherVideos.length]);

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

  /* ── ★ 공식 방송 및 오프라인 행사: 오늘 기준 ±14일 범위, 확정 일정만 표시 ── */
  const recentStreams = useMemo(() => {
    if (!events) return [];
    const rangeStart = formatDateStr(addDays(today, -14));
    const rangeEnd   = formatDateStr(addDays(today, 14));
    const filtered = events.filter((ev) =>
      (ev.type === '공식방송' || ev.type === '오프라인이벤트') &&
      ev.is_fixed === true &&
      ev.date >= rangeStart &&
      ev.date <= rangeEnd &&
      (!activeGames || activeGames[ev.game] !== false) // activeGames 필터 적용
    );
    // 미래·오늘 일정(예정)을 앞에, 과거 일정(최신)을 뒤에 배치
    const future = filtered.filter((ev) => ev.date >= todayStr).sort((a, b) => a.date.localeCompare(b.date));
    const past   = filtered.filter((ev) => ev.date <  todayStr).sort((a, b) => b.date.localeCompare(a.date));
    return [...future, ...past].slice(0, 10);
  }, [events, today, todayStr, activeGames]);

  // 추천 비디오 JSON 데이터베이스 연동 및 폴백 바인딩
  const recommendedShorts = useMemo(() => {
    const rawShorts = recommendedVideos?.shorts?.length > 0 ? recommendedVideos.shorts : RECOMMENDED_SHORTS;
    return allocateVideos(rawShorts, activeGames, 6);
  }, [recommendedVideos, activeGames]);

  const recommendedLongforms = useMemo(() => {
    const rawLongforms = recommendedVideos?.longform?.length > 0 ? recommendedVideos.longform : LONGFORM_VIDEOS;
    return allocateVideos(rawLongforms, activeGames, 6);
  }, [recommendedVideos, activeGames]);

  // 스토리 및 기타 롱폼 영상 이원화 분류 파이프라인
  const storyVideos = useMemo(() => {
    return recommendedLongforms.filter((v) => v.type === 'story');
  }, [recommendedLongforms]);

  const otherVideos = useMemo(() => {
    return recommendedLongforms.filter((v) => v.type !== 'story');
  }, [recommendedLongforms]);

  // 캐러셀 슬라이더 화면 크기별 표시 개수 동적 연산
  const visibleCount = isMobile ? 1 : 2;

  // 무한 순환 캐러셀 Core 헬퍼 함수
  const getVisibleItems = useCallback((items, currentIndex, vCount) => {
    if (items.length <= vCount) return items;
    const result = [];
    for (let i = 0; i < vCount; i++) {
      const targetIdx = (currentIndex + i) % items.length;
      result.push(items[targetIdx]);
    }
    return result;
  }, []);

  const visibleStreams = useMemo(() => {
    return getVisibleItems(recentStreams, currentStreamIndex, visibleCount);
  }, [recentStreams, currentStreamIndex, visibleCount, getVisibleItems]);

  const visibleStories = useMemo(() => {
    return getVisibleItems(storyVideos, currentStoryIndex, visibleCount);
  }, [storyVideos, currentStoryIndex, visibleCount, getVisibleItems]);

  const visibleOthers = useMemo(() => {
    return getVisibleItems(otherVideos, currentOtherIndex, visibleCount);
  }, [otherVideos, currentOtherIndex, visibleCount, getVisibleItems]);

  /* 캐러셀 슬라이더 무한 순환 제어 핸들러 */
  const handlePrevStream = () => {
    if (recentStreams.length <= visibleCount) return;
    setCurrentStreamIndex((prev) => (prev - 1 + recentStreams.length) % recentStreams.length);
  };

  const handleNextStream = () => {
    if (recentStreams.length <= visibleCount) return;
    setCurrentStreamIndex((prev) => (prev + 1) % recentStreams.length);
  };

  const handlePrevStory = () => {
    if (storyVideos.length <= visibleCount) return;
    setCurrentStoryIndex((prev) => (prev - 1 + storyVideos.length) % storyVideos.length);
  };

  const handleNextStory = () => {
    if (storyVideos.length <= visibleCount) return;
    setCurrentStoryIndex((prev) => (prev + 1) % storyVideos.length);
  };

  const handlePrevOther = () => {
    if (otherVideos.length <= visibleCount) return;
    setCurrentOtherIndex((prev) => (prev - 1 + otherVideos.length) % otherVideos.length);
  };

  const handleNextOther = () => {
    if (otherVideos.length <= visibleCount) return;
    setCurrentOtherIndex((prev) => (prev + 1) % otherVideos.length);
  };

  /* 수동 추천 쇼츠 슬라이더 넘기기 제어 */
  const handlePrevShort = () => {
    setCurrentShortIndex((prev) => (prev - 1 + recommendedShorts.length) % recommendedShorts.length);
  };

  const handleNextShort = () => {
    setCurrentShortIndex((prev) => (prev + 1) % recommendedShorts.length);
  };

  /* ── 모바일 터치 스와이프 이벤트 핸들러 빌더 (사용성 개선) ── */
  const createTouchHandlers = (onNext, onPrev) => {
    let startX = null;
    let startY = null;
    let lastX = null;
    let lastY = null;

    return {
      onTouchStart: (e) => {
        if (e.touches && e.touches.length > 0) {
          startX = e.touches[0].clientX;
          startY = e.touches[0].clientY;
          lastX = startX;
          lastY = startY;
        }
      },
      onTouchMove: (e) => {
        if (e.touches && e.touches.length > 0) {
          lastX = e.touches[0].clientX;
          lastY = e.touches[0].clientY;
        }
      },
      onTouchEnd: (e) => {
        if (startX === null || lastX === null) return;
        const diffX = startX - lastX;
        const diffY = startY - lastY;
        
        // 가로 스와이프 판정: 최소 40px 이상 이동했고, 가로 방향 이동이 세로 방향보다 더 명확할 때
        if (Math.abs(diffX) > 40 && Math.abs(diffX) > Math.abs(diffY)) {
          if (diffX > 0) {
            onNext();
          } else {
            onPrev();
          }
        }
        startX = null;
        startY = null;
        lastX = null;
        lastY = null;
      },
      onTouchCancel: () => {
        if (startX === null || lastX === null) return;
        const diffX = startX - lastX;
        const diffY = startY - lastY;
        
        if (Math.abs(diffX) > 40 && Math.abs(diffX) > Math.abs(diffY)) {
          if (diffX > 0) {
            onNext();
          } else {
            onPrev();
          }
        }
        startX = null;
        startY = null;
        lastX = null;
        lastY = null;
      }
    };
  };

  const streamTouch = createTouchHandlers(handleNextStream, handlePrevStream);
  const storyTouch = createTouchHandlers(handleNextStory, handlePrevStory);
  const otherTouch = createTouchHandlers(handleNextOther, handlePrevOther);
  const shortsTouch = createTouchHandlers(handleNextShort, handlePrevShort);


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
              <div className="section-header-carousel">
                <h3 className="recent-streams-section__title">
                  <Radio size={15} className="recent-streams-section__title-icon" />
                  <span>공식 방송 및 오프라인 행사 일정</span>
                </h3>
                {recentStreams.length > visibleCount && (
                  <div className="carousel-nav-arrows">
                    <span className="carousel-counter">{currentStreamIndex + 1} / {recentStreams.length}</span>
                    <button
                      onClick={handlePrevStream}
                      className="carousel-arrow-btn"
                      type="button"
                      title="이전 목록 보기"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      onClick={handleNextStream}
                      className="carousel-arrow-btn"
                      type="button"
                      title="다음 목록 보기"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </div>
              <div className="recent-streams-grid" {...streamTouch}>
                {visibleStreams.map((ev) => {
                  const color = getGameColor(ev.game);
                  const isFixed = ev.is_fixed === true;
                  const isOffline = ev.type === '오프라인이벤트';
                  
                  const imgSrc = ev.custom_img 
                     ? `./assets/${ev.custom_img}` 
                     : gamesConfig?.[ev.game]?.defaultImg;

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
                          {isOffline ? (
                            <MapPin size={10} className="recent-stream-card__badge-icon" />
                          ) : (
                            <Radio size={10} className="recent-stream-card__badge-icon" />
                          )}
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
                          <span className="recent-stream-card__version">
                            {isOffline ? '📍 오프라인 행사' : `v${ev.version} 방송`}
                          </span>
                          <span className={`recent-stream-card__status ${isFixed ? 'status-confirmed' : 'status-predicted'}`}>
                            {isFixed ? '확정' : '예상'}
                          </span>
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

          {/* 1-2. 최근 공식 방송 하단: 애이카 아카이브 게임 스토리 풀버전 바로가기 */}
          {storyVideos.length > 0 && (
            <section className="longform-videos-section">
              <div className="section-header-carousel">
                <h3 className="longform-videos-section__title">
                  <Youtube size={15} className="longform-videos-section__title-icon" />
                  <span>애이카 아카이브 게임 스토리 풀버전 바로가기</span>
                </h3>
                {storyVideos.length > visibleCount && (
                  <div className="carousel-nav-arrows">
                    <span className="carousel-counter">{currentStoryIndex + 1} / {storyVideos.length}</span>
                    <button
                      onClick={handlePrevStory}
                      className="carousel-arrow-btn"
                      type="button"
                      title="이전 스토리 보기"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      onClick={handleNextStory}
                      className="carousel-arrow-btn"
                      type="button"
                      title="다음 스토리 보기"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </div>
              <div className="longform-videos-grid" {...storyTouch}>
                {visibleStories.map((video) => {
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
              <div className="section-header-carousel">
                <h3 className="longform-videos-section__title">
                  <Youtube size={15} className="longform-videos-section__title-icon" />
                  <span>애이카 아카이브 추천 기획/공략 영상 바로가기</span>
                </h3>
                {otherVideos.length > visibleCount && (
                  <div className="carousel-nav-arrows">
                    <span className="carousel-counter">{currentOtherIndex + 1} / {otherVideos.length}</span>
                    <button
                      onClick={handlePrevOther}
                      className="carousel-arrow-btn"
                      type="button"
                      title="이전 기획 영상 보기"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      onClick={handleNextOther}
                      className="carousel-arrow-btn"
                      type="button"
                      title="다음 기획 영상 보기"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </div>
              <div className="longform-videos-grid" {...otherTouch}>
                {visibleOthers.map((video) => {
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
            <div className="recommended-shorts-widget recommended-shorts-widget--minimal" {...shortsTouch}>
              
              {recommendedShorts.length > 0 ? (
                <>
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
                      {isPlayingShort ? (
                        <iframe
                          width="100%"
                          height="100%"
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
                          style={{
                            backgroundImage: `url(https://img.youtube.com/vi/${recommendedShorts[currentShortIndex]?.id}/hqdefault.jpg)`
                          }}
                        >
                          <div className="shorts-custom-play-btn">
                            <Youtube size={32} color="#ff0000" fill="#ff0000" className="shorts-play-icon-glow" />
                          </div>
                        </div>
                      )}
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
                </>
              ) : (
                <div className="shorts-no-data-card">
                  <Youtube size={24} color="#64748b" style={{ marginBottom: '6px' }} />
                  <p className="shorts-no-data-card__text">활성화된 게임의 추천 쇼츠가 없습니다.</p>
                  <span className="shorts-no-data-card__sub">필터바에서 다른 게임을 활성화해주세요.</span>
                </div>
              )}

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
