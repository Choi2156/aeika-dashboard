import { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Play, Volume2, Info, Clock, Sparkles } from 'lucide-react';
import {
  getCleanSummaryText,
  formatEventTypeLabel,
  cleanEventDisplayTitle,
} from '../utils/eventTextParser';
import {
  getTodayStrKST,
  diffDays,
  getNowKSTParts,
  formatDisplayDate,
} from '../utils/dateKST';
import '../styles/components.css';

// 원신 6.x 및 기타 서브컬처 게임 버전 타이틀 포맷터
const getVersionFullTitle = (game, version, allEvents) => {
  if (!version) return '';
  const cleanVer = version.replace(' 후반', '').trim();

  if (game === '원신' && cleanVer.match(/^6\.\d/)) {
    const match = cleanVer.match(/^6\.(\d)/);
    const minor = parseInt(match[1], 10);
    const ordinals = ['첫', '두', '세', '네', '다섯', '여섯', '일곱', '여덟', '아홉', '열'];
    const ord = ordinals[minor] || `${minor + 1}`;

    let subtitle = '???';
    if (allEvents) {
      const mainEvent = allEvents.find(
        (e) =>
          e.game === '원신' &&
          e.type === '전반업데이트' &&
          e.version.replace(' 후반', '').trim() === cleanVer
      );
      if (mainEvent && mainEvent.title) {
        const subMatch = mainEvent.title.match(/-\s*「([^」]+)」/);
        if (subMatch) subtitle = subMatch[1];
      }
    }
    const suffix = version.includes('후반') ? ' 후반' : '';
    return `v${cleanVer}${suffix} 「${ord} 번째 달」 버전 - 「${subtitle}」`;
  }

  if (allEvents) {
    const mainEvent = allEvents.find(
      (e) =>
        e.game === game &&
        e.type === '전반업데이트' &&
        e.version.replace(' 후반', '').trim() === cleanVer
    );
    if (mainEvent && mainEvent.title) {
      let t = mainEvent.title;
      if (version.includes('후반')) {
        t = t.includes('버전') ? t.replace('버전', '버전 후반') : `${t} (후반)`;
      }
      return t;
    }
  }

  return `${cleanVer} 버전${version.includes('후반') ? ' 후반' : ''}`;
};

/**
 * 실시간 하이라이트 배너 캐러셀 (LiveBannerBoard v1.3.0)
 * - 120px 슬림 높이 + 우측 55% 일러스트 자연스러운 다크 인디고 카드 블렌딩
 * - 하단 5초 자동 전환 진행 바 (호버 시 일시정지)
 */
export default function LiveBannerBoard({ events, gamesConfig, activeGames, onEventClick }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const autoPlayTimerRef = useRef(null);

  const todayStr = useMemo(() => getTodayStrKST(), []);

  const getDaysDiff = (dateStr1, dateStr2) => {
    if (!dateStr1 || !dateStr2) return 999;
    return diffDays(dateStr1, dateStr2);
  };

  // 현재 진행 중이거나 7일 이내 도래할 주요 일정 필터링 (전·후반 중복 제거)
  const liveEvents = useMemo(() => {
    if (!events || events.length === 0) return [];

    const activeCandidates = events.filter((ev) => {
      if (!ev.start_date) return false;
      if (activeGames && activeGames[ev.game] === false) {
        return false;
      }
      if (ev.end_date && todayStr >= ev.start_date && todayStr <= ev.end_date) {
        return true;
      }
      const diff = getDaysDiff(todayStr, ev.start_date);
      if (diff > 0 && diff <= 7) {
        return true;
      }
      return false;
    });

    const filtered = [];
    const cleanVersion = (v) => (v ? v.replace(/\s*후반.*$/, '').trim() : '');

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

  // 5초 자동 슬라이드 제어 (호버 시 정지)
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
  }, [liveEvents.length, isHovered, currentIndex]);

  useEffect(() => {
    if (liveEvents.length === 0) {
      setCurrentIndex(0);
    } else if (currentIndex >= liveEvents.length) {
      setCurrentIndex(0);
    }
  }, [liveEvents.length, currentIndex]);

  const handlePrev = (e) => {
    if (e) e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + liveEvents.length) % liveEvents.length);
  };

  const handleNext = (e) => {
    if (e) e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % liveEvents.length);
  };

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

  const getBannerMeta = (ev) => {
    const isFixed = ev.is_fixed === true;
    const diff = getDaysDiff(todayStr, ev.start_date);
    const diffEnd = ev.end_date ? getDaysDiff(todayStr, ev.end_date) : 0;
    const isUpcoming = diff > 0 && diff <= 7;

    let badgeText = isFixed ? 'LIVE' : '예상';
    let titleText = '';
    let actionIcon = <Play size={11} />;
    const typeLabel = formatEventTypeLabel(ev.type);
    const cleanedRawTitle = cleanEventDisplayTitle(ev.title, ev.game);

    const periodText =
      ev.end_date && ev.end_date !== ev.start_date && ev.type !== '공식방송'
        ? `${formatDisplayDate(ev.start_date, false)} ~ ${formatDisplayDate(ev.end_date, false)}`
        : `${formatDisplayDate(ev.start_date, true)}${ev.time ? ` ${ev.time}` : ''}`;

    if (isUpcoming) {
      badgeText = `D-${diff}`;
      actionIcon = <Clock size={11} />;

      if (ev.type === '전반업데이트' || ev.type === '후반업데이트') {
        const fullVer = getVersionFullTitle(ev.game, ev.version, events);
        titleText = `${fullVer} 업데이트 예정`;
      } else if (ev.type === '공식방송') {
        titleText = cleanedRawTitle || `v${ev.version || '?'} 특별 방송 예정`;
      } else if (ev.type === '오프라인이벤트' || ev.type === '행사') {
        titleText = `${cleanedRawTitle} 오픈 예정`;
      } else {
        titleText = `${cleanedRawTitle} 예정`;
      }
    } else {
      if (diffEnd > 0 && ev.type !== '공식방송') {
        badgeText = `진행 중 · ${diffEnd}일 남음`;
      } else if (diffEnd === 0 && ev.end_date === todayStr) {
        badgeText = '오늘 종료';
      }

      if (ev.banner_text) {
        titleText = cleanEventDisplayTitle(ev.banner_text, ev.game);
      } else if (ev.type === '전반업데이트' || ev.type === '후반업데이트') {
        const fullVer = getVersionFullTitle(ev.game, ev.version, events);
        titleText = fullVer;
      } else if (ev.type === '공식방송') {
        if (ev.start_date === todayStr) {
          const { hours: currentHour, minutes: currentMinute } = getNowKSTParts();
          if (ev.time) {
            const [sh, sm] = ev.time.split(':').map(Number);
            const hasStarted = currentHour > sh || (currentHour === sh && currentMinute >= sm);
            if (hasStarted) {
              badgeText = isFixed ? 'ON AIR' : '방송 예정';
              titleText = cleanedRawTitle || `v${ev.version || '?'} 특별 방송 진행 중`;
              actionIcon = <Volume2 size={11} />;
            } else {
              badgeText = `오늘 ${ev.time}`;
              titleText = cleanedRawTitle || `v${ev.version || '?'} 특별 방송`;
              actionIcon = <Clock size={11} />;
            }
          } else {
            badgeText = 'TODAY';
            titleText = cleanedRawTitle || `v${ev.version || '?'} 특별 방송`;
            actionIcon = <Clock size={11} />;
          }
        } else {
          badgeText = isFixed ? 'ON AIR' : '방송 예정';
          titleText = cleanedRawTitle || `v${ev.version || '?'} 특별 방송`;
          actionIcon = <Volume2 size={11} />;
        }
      } else {
        titleText = cleanedRawTitle || `${ev.game} 주요 일정`;
      }
    }

    return { badgeText, titleText, actionIcon, typeLabel, periodText, isFixed };
  };

  const activeEvent = liveEvents[currentIndex] || liveEvents[0] || null;
  const activeColor = gamesConfig?.[activeEvent?.game]?.theme?.color || '#6fe0b6';

  useEffect(() => {
    if (typeof document !== 'undefined' && activeColor) {
      document.documentElement.style.setProperty('--aurora-primary', activeColor);
    }
  }, [activeColor]);

  if (liveEvents.length === 0) {
    return (
      <div className="live-banner-board live-banner-board--welcome">
        <div className="live-banner-board__glow" />
        <div className="live-banner-board__content">
          <div className="welcome-badge">
            <Sparkles size={12} />
            <span>SPOTLIGHT STANDBY</span>
          </div>
          <h2 className="welcome-title">선택된 게임의 진행 중이거나 임박한 하이라이트 일정이 없습니다</h2>
          <p className="welcome-subtitle">
            아래 게임 필터에서 게임을 활성화하거나 타임라인에서 전체 일정을 확인해 보세요.
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
      style={{
        '--active-banner-color': activeColor,
      }}
      title="클릭하여 일정 상세 보기"
    >
      {/* 1. 슬라이더 가로 트랙 */}
      <div
        className="live-banner-track"
        style={{
          transform: `translate3d(-${currentIndex * 100}%, 0, 0)`,
          width: '100%',
        }}
      >
        {liveEvents.map((ev, idx) => {
          const isSlideActive = idx === currentIndex;
          const { badgeText, titleText, actionIcon, typeLabel, periodText, isFixed } =
            getBannerMeta(ev);
          const displayType = formatEventTypeLabel(ev.type);
          const color = gamesConfig?.[ev.game]?.theme?.color || '#6fe0b6';
          const gameIcon = gamesConfig?.[ev.game]?.icon;
          const imgSrc = ev.custom_img
            ? `./assets/${ev.custom_img}`
            : gamesConfig?.[ev.game]?.defaultImg;

          return (
            <div
              key={ev.id || `slide-${idx}`}
              className={`live-banner-slide ${isSlideActive ? 'live-banner-slide--active' : ''}`}
              onClick={() => onEventClick?.(ev, displayType, 'live_banner')}
              style={{
                '--banner-theme-color': color,
              }}
            >
              {/* 우측 62% 일러스트 영역 (--bg-card 부드러운 블렌딩 마스크) */}
              <div className="live-banner-slide__img-container">
                <img
                  src={imgSrc}
                  alt={ev.title}
                  className="live-banner-slide__img"
                  onError={(e) => {
                    const fallback = gamesConfig?.[ev.game]?.defaultImg;
                    if (fallback && e.currentTarget.src !== fallback) {
                      e.currentTarget.src = fallback;
                    }
                  }}
                />
                <div className="live-banner-slide__img-mask" />
                {gamesConfig?.[ev.game]?.copyright && (
                  <span className="live-banner-copyright-label">
                    {gamesConfig[ev.game].copyright}
                  </span>
                )}
              </div>

              <div
                className="live-banner-board__glow"
                style={{ boxShadow: `inset 0 0 42px rgba(${hexToRgb(color)}, 0.14)` }}
              />

              {/* 좌측 에디토리얼 텍스트 정보 영역 */}
              <div className="live-banner-board__content">
                <div className="live-banner-meta-row">
                  <span
                    className="live-banner-game-badge"
                    style={{
                      backgroundColor: color,
                      color: '#07090f',
                    }}
                  >
                    {gameIcon && (
                      <img
                        src={gameIcon}
                        alt=""
                        className="live-banner-game-badge__icon"
                        aria-hidden="true"
                      />
                    )}
                    <span>{ev.game}</span>
                  </span>

                  <span className="live-banner-type-pill">
                    {typeLabel}
                    {!isFixed && ' · 예상'}
                  </span>

                  <div
                    className="live-banner-badge"
                    style={{
                      borderColor: `rgba(${hexToRgb(color)}, 0.45)`,
                      color: color,
                    }}
                  >
                    {actionIcon}
                    <span>{badgeText}</span>
                  </div>

                  <span className="live-banner-period-pill">{periodText}</span>
                </div>

                <h2 className="live-banner-title">{titleText}</h2>

                {(ev.details || ev.detail) && (
                  <p className="live-banner-detail">
                    {getCleanSummaryText(ev.details || ev.detail, 115)}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 2. 우하단 통합 글래스 컨트롤 독 (화살표가 좌측 텍스트나 캐릭터 얼굴을 가리지 않음) */}
      {liveEvents.length > 1 && (
        <div
          className="live-banner-hud"
          onClick={(e) => e.stopPropagation()}
          role="group"
          aria-label="배너 슬라이드 컨트롤"
        >
          <button
            className="live-banner-hud__arrow"
            onClick={handlePrev}
            type="button"
            aria-label="이전 소식"
          >
            <ChevronLeft size={14} />
          </button>

          <div className="live-banner-indicators" role="tablist" aria-label="배너 슬라이드 선택">
            {liveEvents.map((ev, idx) => {
              const color = gamesConfig?.[ev.game]?.theme?.color || '#6fe0b6';
              const isAct = idx === currentIndex;
              return (
                <button
                  key={idx}
                  type="button"
                  role="tab"
                  aria-selected={isAct}
                  aria-label={`${ev.game} 슬라이드 ${idx + 1}`}
                  className={`live-banner-dot ${isAct ? 'live-banner-dot--active' : ''}`}
                  style={{
                    '--dot-color': color,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIndex(idx);
                  }}
                >
                  {isAct && (
                    <span
                      className={`live-banner-dot__fill ${
                        isHovered ? 'live-banner-dot__fill--paused' : ''
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>

          <span className="live-banner-hud__counter">
            {String(currentIndex + 1).padStart(2, '0')} / {String(liveEvents.length).padStart(2, '0')}
          </span>

          <button
            className="live-banner-hud__arrow"
            onClick={handleNext}
            type="button"
            aria-label="다음 소식"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* 3. 5초 자동 전환 하단 진행 바 (호버 시 일시정지) */}
      {liveEvents.length > 1 && (
        <div className="live-banner-progress" aria-hidden="true">
          <div
            key={currentIndex}
            className={`live-banner-progress__bar ${
              isHovered ? 'live-banner-progress__bar--paused' : ''
            }`}
            style={{
              '--progress-color': activeColor,
            }}
          />
        </div>
      )}
    </div>
  );
}

function hexToRgb(hex) {
  const c = (hex || '#818cf8').replace('#', '');
  const r = parseInt(c.substring(0, 2), 16) || 129;
  const g = parseInt(c.substring(2, 4), 16) || 140;
  const b = parseInt(c.substring(4, 6), 16) || 248;
  return `${r}, ${g}, ${b}`;
}
