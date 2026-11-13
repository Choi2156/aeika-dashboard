import { useState, useEffect, useRef, useCallback } from 'react';
import {
  CheckSquare,
  Square,
  Image as ImageIcon,
  Crosshair,
  BarChart2,
  Calendar as CalendarIcon,
  ListFilter,
} from 'lucide-react';
import { getNowKSTParts } from '../utils/dateKST';
import {
  trackGameFilterToggle,
  trackGameFilterAll,
  trackViewModeChange,
} from '../utils/analytics';

function getShortGameName(gameName) {
  const mapping = {
    '붕괴: 스타레일': '스타레일',
    '젠레스 존 제로': '젠존제',
    '원신': '원신',
    '명조': '명조',
    '명일방주: 엔드필드': '엔드필드',
  };
  return mapping[gameName] || gameName;
}

/**
 * GameFilterBar 컴포넌트 (v1.3.0 Unified Schedule Workspace Bar)
 * - 좌측: 전체 토글 + 5대 게임 필터 캡슐
 * - 우측: 오늘 위치 이동 + 달력 이미지 + 물리 슬라이딩 글라이더 기반 3단 뷰 스위처
 */
export default function GameFilterBar({
  activeGames,
  gamesConfig,
  onToggleGame,
  onSelectAll,
  currentView = 'gantt',
  onViewChange,
  onOpenCalendar,
  onJumpToToday,
  isShrunk,
}) {
  const switcherRef = useRef(null);
  const btnRefs = useRef({});
  const [glider, setGlider] = useState({ width: 0, left: 0, ready: false });

  const updateGlider = useCallback(() => {
    const activeBtn = btnRefs.current[currentView];
    if (!activeBtn) return;
    setGlider({
      width: activeBtn.offsetWidth,
      left: activeBtn.offsetLeft,
      ready: true,
    });
  }, [currentView]);

  useEffect(() => {
    updateGlider();
    const rafId = requestAnimationFrame(updateGlider);
    const timerId = setTimeout(updateGlider, 180);

    let ro = null;
    if (typeof ResizeObserver !== 'undefined' && switcherRef.current) {
      ro = new ResizeObserver(updateGlider);
      ro.observe(switcherRef.current);
      Object.values(btnRefs.current).forEach((el) => {
        if (el) ro.observe(el);
      });
    }

    window.addEventListener('resize', updateGlider);
    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timerId);
      if (ro) ro.disconnect();
      window.removeEventListener('resize', updateGlider);
    };
  }, [updateGlider, isShrunk]);

  if (!gamesConfig || Object.keys(gamesConfig).length === 0) return null;

  const gameNames = Object.keys(gamesConfig);
  const activeCount = gameNames.filter((g) => activeGames[g] !== false).length;
  const allActive = activeCount === gameNames.length;

  const handleToggleAll = () => {
    const nextState = !allActive;
    trackGameFilterAll(nextState ? 'select_all' : 'deselect_all');
    onSelectAll(nextState);
  };

  const handleViewSwitch = (view) => {
    trackViewModeChange(view);
    if (onViewChange) onViewChange(view);
  };

  // 오늘 날짜 KST 포맷 (MM.DD 요일)
  const { month: mNum, day: dNum, weekdayName } = getNowKSTParts();
  const todayLabel = `${String(mNum).padStart(2, '0')}.${String(dNum).padStart(2, '0')}(${weekdayName})`;

  return (
    <section className={`game-filter-bar ${isShrunk ? 'game-filter-bar--shrunk' : ''}`}>
      {/* 1. 좌측: 전체 토글 + 5대 게임 필터 캡슐 */}
      <div className="game-filter-bar__left">
        <div className="game-filter-bar__buttons" role="group" aria-label="게임별 일정 필터">
          <button
            className={`game-filter-bar__control-btn ${
              allActive ? 'game-filter-bar__control-btn--active' : ''
            } ${isShrunk ? 'game-filter-bar__control-btn--icon-only' : ''}`}
            onClick={handleToggleAll}
            type="button"
            aria-pressed={allActive}
            title={allActive ? '모든 게임 필터 해제' : '모든 게임 필터 켜기'}
          >
            {allActive ? <CheckSquare size={14} /> : <Square size={14} />}
            <span className="game-filter-bar__control-label">
              전체 <em className="game-filter-bar__count">{activeCount}/{gameNames.length}</em>
            </span>
          </button>

          {gameNames.map((gameName) => {
            const isActive = activeGames[gameName] !== false;
            const color = gamesConfig[gameName]?.theme?.color || '#6fe0b6';
            const iconUrl = gamesConfig[gameName]?.icon;
            const shortName = getShortGameName(gameName);

            return (
              <button
                key={gameName}
                className={`game-filter-btn ${
                  isActive ? 'game-filter-btn--active' : 'game-filter-btn--inactive'
                } ${isShrunk ? 'game-filter-btn--icon-only' : ''}`}
                onClick={() => {
                  trackGameFilterToggle(gameName, !isActive);
                  onToggleGame(gameName);
                }}
                type="button"
                aria-pressed={isActive}
                style={{
                  '--filter-color': color,
                }}
                title={`${gameName} 일정 ${isActive ? '숨기기' : '표시하기'}`}
              >
                {iconUrl ? (
                  <img
                    className="game-filter-btn__icon-img"
                    src={iconUrl}
                    alt={gameName}
                  />
                ) : (
                  <span
                    className="game-filter-btn__indicator"
                    style={{
                      backgroundColor: isActive ? color : 'transparent',
                      borderColor: color,
                    }}
                  />
                )}
                <span className="game-filter-btn__label game-filter-btn__label--full">
                  {gameName}
                </span>
                <span className="game-filter-btn__label game-filter-btn__label--short">
                  {shortName}
                </span>
                <span
                  className="game-filter-btn__dot"
                  style={{ backgroundColor: color }}
                  aria-hidden="true"
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. 우측: 오늘 위치 이동 + 달력 이미지 + 3단 메인 뷰 스위처 */}
      <div className="game-filter-bar__right">
        <button
          type="button"
          className="control-bar__today-btn"
          onClick={onJumpToToday}
          title="오늘 날짜 위치로 즉시 이동"
          aria-label={`오늘 (${todayLabel}) 위치로 이동`}
        >
          <Crosshair size={13} className="control-bar__today-icon" />
          <span className="control-bar__today-label control-bar__today-label--full">
            오늘 {todayLabel}
          </span>
          <span className="control-bar__today-label control-bar__today-label--short">오늘</span>
        </button>

        {onOpenCalendar && !isShrunk && (
          <button
            type="button"
            className="control-bar__cal-img-btn"
            onClick={() => onOpenCalendar()}
            title="이달의 종합 달력 고화질 이미지 보기 및 다운로드"
            aria-label="이달의 종합 달력 이미지 보기"
          >
            <ImageIcon size={13} />
            <span className="control-bar__cal-img-label">달력 이미지</span>
          </button>
        )}

        <nav
          className={`view-switcher ${glider.ready ? 'has-glider' : ''}`}
          role="tablist"
          aria-label="일정 표시 방식 전환"
          ref={switcherRef}
        >
          <span
            className="view-switcher__glider"
            aria-hidden="true"
            style={{
              width: `${glider.width}px`,
              transform: `translate3d(${glider.left}px, 0, 0)`,
              opacity: glider.ready ? 1 : 0,
            }}
          />
          <button
            ref={(el) => {
              btnRefs.current.gantt = el;
            }}
            className={`view-switcher__btn ${
              currentView === 'gantt' ? 'view-switcher__btn--active' : ''
            } ${isShrunk ? 'view-switcher__btn--icon-only' : ''}`}
            onClick={() => handleViewSwitch('gantt')}
            type="button"
            role="tab"
            aria-selected={currentView === 'gantt'}
            title="간트 차트 (기간 비교)"
          >
            <BarChart2 size={14} />
            <span className="view-switcher__label">간트 차트</span>
          </button>

          <button
            ref={(el) => {
              btnRefs.current.calendar = el;
            }}
            className={`view-switcher__btn ${
              currentView === 'calendar' ? 'view-switcher__btn--active' : ''
            } ${isShrunk ? 'view-switcher__btn--icon-only' : ''}`}
            onClick={() => handleViewSwitch('calendar')}
            type="button"
            role="tab"
            aria-selected={currentView === 'calendar'}
            title="캘린더 (월간 달력)"
          >
            <CalendarIcon size={14} />
            <span className="view-switcher__label">캘린더</span>
          </button>

          <button
            ref={(el) => {
              btnRefs.current.list = el;
            }}
            className={`view-switcher__btn ${
              currentView === 'list' ? 'view-switcher__btn--active' : ''
            } ${isShrunk ? 'view-switcher__btn--icon-only' : ''}`}
            onClick={() => handleViewSwitch('list')}
            type="button"
            role="tab"
            aria-selected={currentView === 'list'}
            title="타임라인 (상세 일정)"
          >
            <ListFilter size={14} />
            <span className="view-switcher__label">타임라인</span>
          </button>
        </nav>
      </div>
    </section>
  );
}
