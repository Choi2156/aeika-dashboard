import { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Play, Volume2, Info, Clock } from 'lucide-react';
import '../styles/components.css';

/**
 * 실시간 오늘의 라이브 소식 배너 캐러셀 (LiveBannerBoard)
 * PC 뷰에서 상단 필터바와 간트 차트 사이 공간에 와이드 형태로 렌더링됩니다.
 * 슬라이더 가로 깨짐 버그 완치 및 넷플릭스 스타일의 우측 이미지 페이드아웃 마스크 레이아웃이 적용되었습니다.
 */
export default function LiveBannerBoard({ events, gamesConfig, activeGames, onEventClick }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const autoPlayTimerRef = useRef(null);

  // 1. 오늘 날짜 기준 (시간 정보 제거한 0시 정렬 문자열)
  const todayStr = useMemo(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  // 날짜 간 일수 차이 계산 헬퍼
  const getDaysDiff = (dateStr1, dateStr2) => {
    if (!dateStr1 || !dateStr2) return 999;
    const d1 = new Date(dateStr1);
    const d2 = new Date(dateStr2);
    d1.setHours(0, 0, 0, 0);
    d2.setHours(0, 0, 0, 0);
    return Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
  };

  // 2. 현재 진행 중이거나 7일 이내 도래할 일정 필터링 및 전후반 중복 제거
  const liveEvents = useMemo(() => {
    if (!events || events.length === 0) return [];
    
    const activeCandidates = events.filter((ev) => {
      if (!ev.start_date) return false;
      
      // activeGames 필터링 추가
      if (activeGames && activeGames[ev.game] === false) {
        return false;
      }
      
      // A. 현재 진행 중인 일정
      if (ev.end_date && todayStr >= ev.start_date && todayStr <= ev.end_date) {
        return true;
      }
      
      // B. 다가오는 7일 이내의 일정 (D-7 ~ D-1)
      const diff = getDaysDiff(todayStr, ev.start_date);
      if (diff > 0 && diff <= 7) {
        return true;
      }
      
      return false;
    });

    const filtered = [];
    const cleanVersion = (v) => v ? v.replace(/\s*후반.*$/, '').trim() : '';

    activeCandidates.forEach((ev) => {
      if (ev.type !== '전반업데이트' && ev.type !== '후반업데이트') {
        filtered.push(ev);
        return;
      }

      const currentVer = cleanVersion(ev.version);

      if (ev.type === '전반업데이트') {
        const hasHalfActive = activeCandidates.some(
          (other) =>
            other.game === ev.game &&
            other.type === '후반업데이트' &&
            cleanVersion(other.version) === currentVer
        );
        if (hasHalfActive) {
          return;
        }
      }

      filtered.push(ev);
    });

    return filtered;
  }, [events, todayStr, activeGames]);

  // 3. 오토 플레이 제어
  useEffect(() => {
    if (liveEvents.length <= 1 || isHovered) {
      if (autoPlayTimerRef.current) {
        clearInterval(autoPlayTimerRef.current);
      }
      return;
    }

    autoPlayTimerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % liveEvents.length);
    }, 5000);

    return () => {
      if (autoPlayTimerRef.current) {
        clearInterval(autoPlayTimerRef.current);
      }
    };
  }, [liveEvents, isHovered]);

  // 3-2. liveEvents 배열 축소 시 currentIndex가 범위를 초과하지 않도록 바운드 제어
  useEffect(() => {
    if (liveEvents.length === 0) {
      setCurrentIndex(0);
    } else if (currentIndex >= liveEvents.length) {
      setCurrentIndex(0);
    }
  }, [liveEvents.length, currentIndex]);

  // 수동 제어 핸들러
  const handlePrev = (e) => {
    if (e) e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + liveEvents.length) % liveEvents.length);
  };

  const handleNext = (e) => {
    if (e) e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % liveEvents.length);
  };

  // 모바일 터치 스와이프 제어 헬퍼
  const touchStartXRef = useRef(null);
  const handleTouchStart = (e) => {
    touchStartXRef.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e) => {
    if (touchStartXRef.current === null) return;
    const diffX = touchStartXRef.current - e.changedTouches[0].clientX;
    if (Math.abs(diffX) > 50) {
      if (diffX > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
    touchStartXRef.current = null;
  };

  // 일정 타입별 배너 타이틀/뱃지 텍스트 파싱 (D-Day 연산 및 표시 내용 뱃지 정밀 분기)
  const getBannerMeta = (ev) => {
    const isFixed = ev.is_fixed === true;
    const diff = getDaysDiff(todayStr, ev.start_date);
    const isUpcoming = diff > 0 && diff <= 7;
    
    let badgeText = isFixed ? 'LIVE' : '예측 라이브';
    let titleText = '';
    let actionIcon = <Play size={11} />;

    // D-Day 다가오는 스케줄의 경우 표시 내용 정밀 분기
    if (isUpcoming) {
      badgeText = `D-${diff}`;
      actionIcon = <Clock size={11} />;
      
      const typeLabels = {
        '전반업데이트': '업데이트',
        '후반업데이트': '후반 픽업',
        '공식방송': '공식 방송',
        '오프라인이벤트': '행사',
      };
      const label = typeLabels[ev.type] || '일정';
      
      if (ev.type === '전반업데이트' || ev.type === '후반업데이트') {
        const cleanVer = ev.version ? ev.version.replace(' 후반', '') : '?';
        titleText = `${ev.game} v${cleanVer} ${label} 예정 (${badgeText})`;
      } else {
        titleText = `${ev.game} ${label} [${ev.title}] 예정 (${badgeText})`;
      }
    } else {
      // 기존 진행 중인 LIVE 스펙 보존
      if (ev.banner_text) {
        titleText = ev.banner_text;
      } else {
        if (ev.type === '전반업데이트' || ev.type === '후반업데이트') {
          const cleanVer = ev.version ? ev.version.replace(' 후반', '') : '?';
          titleText = `${ev.game} v${cleanVer} 진행 중!`;
        } else if (ev.type === '공식방송') {
          badgeText = isFixed ? 'STREAMING' : '방송 예정';
          titleText = `${ev.game} v${ev.version || '?'} 공식 방송 진행 중!`;
          actionIcon = <Volume2 size={11} />;
        } else if (ev.type === '오프라인이벤트' || ev.type === '행사') {
          badgeText = isFixed ? 'FESTIVAL' : '행사 예정';
          titleText = `${ev.game} 행사 [${ev.title}] 진행 중!`;
          actionIcon = <Info size={11} />;
        } else {
          titleText = `${ev.game} ${ev.title} 진행 중!`;
        }
      }
    }

    return { badgeText, titleText, actionIcon };
  };

  const getDisplayTypeName = (ev) => {
    if (ev.type === '공식방송') return '공식방송';
    if (ev.type === '후반업데이트') return '후반업데이트';
    if (ev.type === '전반업데이트') return '전반업데이트';
    return ev.type;
  };

  // 라이브 일정이 없을 때의 고품격 웰컴 배너 (비수기 디폴트 배너)
  if (liveEvents.length === 0) {
    return (
      <div 
        className="live-banner-board live-banner-board--welcome"
        style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)',
          borderColor: 'rgba(99, 102, 241, 0.2)'
        }}
      >
        <div className="live-banner-board__glow" />
        <div className="live-banner-board__content">
          <div className="welcome-badge">
            <Info size={12} />
            <span>대시보드 알림</span>
          </div>
          <h2 className="welcome-title">현재 진행 중인 대형 라이브 일정이 없습니다.</h2>
          <p className="welcome-subtitle">
            서브컬처 게임들의 다가오는 예상/확정 스케줄 및 특별 공식 방송 일정은 하단 PC 간트 차트에서 한눈에 확인해 보세요!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="live-banner-board"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      title="클릭하여 상세 정보 팝업 보기"
    >
      {/* 1. 슬라이더 가로 트랙 레일 (자식 크기가 width: 100% 이고 고정 너비로 슬라이딩) */}
      <div 
        className="live-banner-track"
        style={{ 
          transform: `translateX(-${currentIndex * 100}%)`,
          width: '100%'
        }}
      >
        {liveEvents.map((ev, idx) => {
          const { badgeText, titleText, actionIcon } = getBannerMeta(ev);
          const displayType = getDisplayTypeName(ev);
          const color = gamesConfig?.[ev.game]?.theme?.color || '#818cf8';
          const imgSrc = ev.custom_img 
            ? `./assets/${ev.custom_img}` 
            : gamesConfig?.[ev.game]?.defaultImg;

          return (
            <div
              key={ev.id || `slide-${idx}`}
              className="live-banner-slide"
              onClick={() => onEventClick?.(ev, displayType)}
              style={{
                '--banner-theme-color': color,
              }}
            >
              {/* 우측 이미지 컨테이너 (왼쪽으로 자연스럽게 녹아내리는 페이드아웃 마스크 장착) */}
              <div className="live-banner-slide__img-container">
                <img src={imgSrc} alt={ev.title} className="live-banner-slide__img" />
                <div className="live-banner-slide__img-mask" />
                {gamesConfig?.[ev.game]?.copyright && (
                  <span className="live-banner-copyright-label">
                    {gamesConfig[ev.game].copyright}
                  </span>
                )}
              </div>

              {/* 장식용 그라데이션 보더 광채 */}
              <div 
                className="live-banner-board__glow" 
                style={{ boxShadow: `0 0 25px rgba(${hexToRgb(color)}, 0.08)` }} 
              />

              {/* 좌측 콘텐츠 텍스트 정보판 (z-index 및 max-width로 가독성 가림막 차단) */}
              <div className="live-banner-board__content">
                <div className="live-banner-meta-row">
                  <div className="live-banner-badge" style={{ backgroundColor: color, color: '#0f172a' }}>
                    {actionIcon}
                    <span>{badgeText}</span>
                  </div>
                  <span className="live-banner-game-badge" style={{ borderColor: color, color: color }}>
                    {ev.game}
                  </span>
                </div>

                <h2 className="live-banner-title">{titleText}</h2>
                
                {ev.detail && (
                  <p className="live-banner-detail">
                    {ev.detail.length > 110 
                      ? `${ev.detail.substring(0, 110)}...` 
                      : ev.detail}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 2. 네비게이션 버튼 (슬라이더 트랙 바깥 고정 오버레이) */}
      {liveEvents.length > 1 && (
        <>
          <button 
            className="live-banner-nav live-banner-nav--prev" 
            onClick={handlePrev}
            type="button"
            aria-label="이전 소식"
          >
            <ChevronLeft size={16} />
          </button>
          <button 
            className="live-banner-nav live-banner-nav--next" 
            onClick={handleNext}
            type="button"
            aria-label="다음 소식"
          >
            <ChevronRight size={16} />
          </button>
        </>
      )}

      {/* 3. 점형 인디케이터 */}
      {liveEvents.length > 1 && (
        <div className="live-banner-indicators">
          {liveEvents.map((ev, idx) => {
            const color = gamesConfig?.[ev.game]?.theme?.color || '#818cf8';
            return (
              <span
                key={idx}
                className={`live-banner-dot ${idx === currentIndex ? 'live-banner-dot--active' : ''}`}
                style={{
                  backgroundColor: idx === currentIndex ? color : undefined,
                  opacity: idx === currentIndex ? 1 : 0.35
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(idx);
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// 테마 컬러 광채 처리를 위한 HEX ➔ RGB 파서 유틸리티
function hexToRgb(hex) {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}
