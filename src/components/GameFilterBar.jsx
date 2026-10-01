import { CheckSquare, Square, Monitor, Smartphone, HelpCircle, Sun, Moon, Database } from 'lucide-react';
import { trackGameFilterToggle, trackGameFilterAll, trackViewModeChange, trackThemeToggle, trackModalOpen, trackStorageConsentToggle } from '../utils/analytics';

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

/**
 * GameFilterBar 컴포넌트
 */
export default function GameFilterBar({
  activeGames,
  gamesConfig,
  onToggleGame,
  onSelectAll,
  currentView,
  onViewChange,
  onOpenGuide,
  meta,
  theme,
  onThemeChange,
  isStorageConsentEnabled,
  onToggleStorageConsent,
  isShrunk,
}) {
  const handleToggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    trackThemeToggle(nextTheme);
    if (onThemeChange) {
      onThemeChange(nextTheme);
    }
  };

  const handleToggleStorage = () => {
    if (isStorageConsentEnabled) {
      if (confirm('설정 저장을 끄시겠습니까?\n저장되어 있던 게임 필터와 테마 설정이 초기화됩니다.')) {
        trackStorageConsentToggle(false);
        onToggleStorageConsent(false);
      }
    } else {
      if (confirm('설정 저장을 켜시겠습니까?\n선택한 게임 필터와 테마 설정이 현재 브라우저에 저장되어 재접속 시에도 유지됩니다.')) {
        trackStorageConsentToggle(true);
        onToggleStorageConsent(true);
      }
    }
  };

  if (!gamesConfig || Object.keys(gamesConfig).length === 0) return null;

  const gameNames = Object.keys(gamesConfig);

  const handleViewChange = (view) => {
    console.log('handleViewChange Clicked! View Target:', view);
    trackViewModeChange(view);
    if (onViewChange) {
      onViewChange(view);
    } else {
      console.error('onViewChange function is undefined!');
    }
  };

  const handleOpenGuide = () => {
    console.log('handleOpenGuide Clicked!');
    trackModalOpen('guide');
    if (onOpenGuide) {
      onOpenGuide();
    } else {
      console.error('onOpenGuide function is undefined!');
    }
  };

  return (
    <section className={`game-filter-bar ${isShrunk ? 'game-filter-bar--shrunk' : ''}`}>
      {/* 1. 왼쪽 그룹: 필터 및 일괄제어 */}
      <div className="game-filter-bar__left">
        <div className="game-filter-bar__controls">
          <button
            className={`game-filter-bar__control-btn ${isShrunk ? 'game-filter-bar__control-btn--icon-only' : ''}`}
            onClick={() => {
              trackGameFilterAll('select_all');
              onSelectAll(true);
            }}
            type="button"
            title="모든 게임 표시"
          >
            <CheckSquare size={14} />
            <span className="game-filter-bar__control-label">전체 표시</span>
          </button>
          <button
            className={`game-filter-bar__control-btn ${isShrunk ? 'game-filter-bar__control-btn--icon-only' : ''}`}
            onClick={() => {
              trackGameFilterAll('deselect_all');
              onSelectAll(false);
            }}
            type="button"
            title="모든 게임 숨기기"
          >
            <Square size={14} />
            <span className="game-filter-bar__control-label">전체 해제</span>
          </button>
        </div>

        <div className="game-filter-bar__buttons">
          {gameNames.map((gameName) => {
            const isActive = activeGames[gameName] !== false;
            const color = gamesConfig[gameName]?.theme?.color || '#818cf8';
            const iconUrl = gamesConfig[gameName]?.icon;

            const hideText = !isActive || isShrunk;

            return (
              <button
                key={gameName}
                className={`game-filter-btn ${isActive ? 'game-filter-btn--active' : 'game-filter-btn--inactive'} ${hideText ? 'game-filter-btn--icon-only' : ''}`}
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
                <span className="game-filter-btn__label">{gameName}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. 오른쪽 그룹: 뷰 전환 및 이용 가이드 */}
      <div className="game-filter-bar__right">
        <div className="game-filter-bar__view-switcher">
          <div className="view-switcher">
            <button
              className={`view-switcher__btn ${currentView === 'gantt' ? 'view-switcher__btn--active' : ''} ${isShrunk ? 'view-switcher__btn--icon-only' : ''}`}
              onClick={() => handleViewChange('gantt')}
              title="PC 간트 뷰"
              id="btn-view-gantt"
            >
              <Monitor size={14} />
              <span className="view-switcher__label">PC</span>
            </button>
            <button
              className={`view-switcher__btn ${currentView === 'list' ? 'view-switcher__btn--active' : ''} ${isShrunk ? 'view-switcher__btn--icon-only' : ''}`}
              onClick={() => handleViewChange('list')}
              title="모바일 리스트 뷰"
              id="btn-view-list"
            >
              <Smartphone size={14} />
              <span className="view-switcher__label">Mobile</span>
            </button>
          </div>

          {/* 테마 버튼 (텍스트 없이 아이콘 단독으로 심플하게 디자인) */}
          <button
            className={`theme-switcher-btn ${isShrunk ? 'theme-switcher-btn--shrunk' : ''}`}
            onClick={handleToggleTheme}
            type="button"
            title={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          {/* 설정 저장 단추 (축소 바에서는 공간 확보를 위해 숨김) */}
          {!isShrunk && (
            <button
              className={`storage-consent-btn ${isStorageConsentEnabled ? 'storage-consent-btn--active' : ''}`}
              onClick={handleToggleStorage}
              type="button"
              title="설정 저장 (필터 및 테마 브라우저 보관)"
            >
              <Database size={12} />
              <span className="storage-consent-btn-label">설정 저장</span>
            </button>
          )}
        </div>

        {/* 이용 안내 버튼 (축소 바에서는 공간 확보를 위해 숨김) */}
        {!isShrunk && (
          <button
            className="game-filter-bar__guide-btn"
            onClick={handleOpenGuide}
            type="button"
            id="open-guide-btn"
            title="이용 안내 보기"
          >
            <HelpCircle size={14} />
            <span className="game-filter-bar__guide-label">이용 안내</span>
          </button>
        )}
      </div>
    </section>
  );
}
