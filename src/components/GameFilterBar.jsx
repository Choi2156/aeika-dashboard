import { CheckSquare, Square, BarChart2, Calendar as CalendarIcon, ListFilter, Image as ImageIcon, Crosshair } from 'lucide-react';
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
 * GameFilterBar 컴포넌트 (v2.0 통합 스티키 컨트롤 바)
 * 좌측: [전체] 스마트 토글 + 게임별 필터 칩
 * 우측: [오늘로 이동] + 3단 뷰 전환 (기간 표 / 월간 달력 / 상세 일정) + [달력 이미지]
 */
export default function GameFilterBar({
  activeGames,
  gamesConfig,
  onToggleGame,
  onSelectAll,
  currentView,
  onViewChange,
  onOpenCalendar,
  onJumpToToday,
  isShrunk,
}) {
  if (!gamesConfig || Object.keys(gamesConfig).length === 0) return null;

  const gameNames = Object.keys(gamesConfig);
  const allActive = gameNames.every((g) => activeGames[g] !== false);

  const handleToggleAll = () => {
    const nextState = !allActive;
    trackGameFilterAll(nextState ? 'select_all' : 'deselect_all');
    onSelectAll(nextState);
  };

  const handleViewChange = (view) => {
    trackViewModeChange(view);
    if (onViewChange) onViewChange(view);
  };

  // 오늘 날짜 KST 포맷 (MM.DD 요일)
  const { month: mNum, day: dNum, weekdayName } = getNowKSTParts();
  const todayLabel = `${String(mNum).padStart(2, '0')}.${String(dNum).padStart(2, '0')}(${weekdayName})`;

  return (
    <section className={`game-filter-bar ${isShrunk ? 'game-filter-bar--shrunk' : ''}`}>
      {/* 1. 좌측: 전체 토글 + 게임 필터 칩 */}
      <div className="game-filter-bar__left">
        <div className="game-filter-bar__buttons">
          <button
            className={`game-filter-bar__control-btn ${allActive ? 'game-filter-bar__control-btn--active' : ''} ${isShrunk ? 'game-filter-bar__control-btn--icon-only' : ''}`}
            onClick={handleToggleAll}
            type="button"
            title={allActive ? '모든 게임 필터 해제' : '모든 게임 필터 켜기'}
          >
            {allActive ? <CheckSquare size={14} /> : <Square size={14} />}
            <span className="game-filter-bar__control-label">전체</span>
          </button>

          {gameNames.map((gameName) => {
            const isActive = activeGames[gameName] !== false;
            const color = gamesConfig[gameName]?.theme?.color || '#818cf8';
            const iconUrl = gamesConfig[gameName]?.icon;
            const shortName = getShortGameName(gameName);

            return (
              <button
                key={gameName}
                className={`game-filter-btn ${isActive ? 'game-filter-btn--active' : 'game-filter-btn--inactive'} ${isShrunk ? 'game-filter-btn--icon-only' : ''}`}
                onClick={() => {
                  trackGameFilterToggle(gameName, !isActive);
                  onToggleGame(gameName);
                }}
                type="button"
                style={{
                  '--filter-color': color,
                }}
                title={`${gameName} 필터 ${isActive ? '끄기' : '켜기'}`}
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
                <span className="game-filter-btn__label game-filter-btn__label--full">{gameName}</span>
                <span className="game-filter-btn__label game-filter-btn__label--short">{shortName}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. 우측: 오늘로 이동 + 3단 뷰 전환 + 달력 이미지 */}
      <div className="game-filter-bar__right">
        {!isShrunk && (
          <button
            type="button"
            className="control-bar__today-btn"
            onClick={onJumpToToday}
            title="오늘 날짜 위치로 즉시 스크롤 이동"
          >
            <Crosshair size={13} className="control-bar__today-icon" />
            <span className="control-bar__today-label">오늘 {todayLabel}</span>
          </button>
        )}

        <div className="view-switcher" role="tablist" aria-label="일정 보기 방식 전환">
          <button
            type="button"
            role="tab"
            aria-selected={currentView === 'gantt'}
            className={`view-switcher__btn ${currentView === 'gantt' ? 'view-switcher__btn--active' : ''} ${isShrunk ? 'view-switcher__btn--icon-only' : ''}`}
            onClick={() => handleViewChange('gantt')}
            title="게임별 버전·픽업 기간 표 (간트 차트)"
            id="btn-view-gantt"
          >
            <BarChart2 size={14} />
            <span className="view-switcher__label">기간 표</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={currentView === 'calendar'}
            className={`view-switcher__btn ${currentView === 'calendar' ? 'view-switcher__btn--active' : ''} ${isShrunk ? 'view-switcher__btn--icon-only' : ''}`}
            onClick={() => handleViewChange('calendar')}
            title="월간 달력으로 일정 보기"
            id="btn-view-calendar"
          >
            <CalendarIcon size={14} />
            <span className="view-switcher__label">월간 달력</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={currentView === 'list'}
            className={`view-switcher__btn ${currentView === 'list' ? 'view-switcher__btn--active' : ''} ${isShrunk ? 'view-switcher__btn--icon-only' : ''}`}
            onClick={() => handleViewChange('list')}
            title="날짜순 상세 타임라인 목록"
            id="btn-view-list"
          >
            <ListFilter size={14} />
            <span className="view-switcher__label">상세 일정</span>
          </button>
        </div>

        {!isShrunk && onOpenCalendar && (
          <button
            type="button"
            className="control-bar__cal-img-btn"
            onClick={() => onOpenCalendar()}
            title="이달의 종합 캘린더 고화질 이미지 보기 및 다운로드"
          >
            <ImageIcon size={13} />
            <span>달력 이미지</span>
          </button>
        )}
      </div>
    </section>
  );
}
