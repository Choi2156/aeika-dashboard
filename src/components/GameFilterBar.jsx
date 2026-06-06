import { CheckSquare, Square, Monitor, Smartphone, HelpCircle, Sun, Moon, Database } from 'lucide-react';

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
    if (onThemeChange) {
      onThemeChange(nextTheme);
    }
  };

  const handleToggleStorage = () => {
    const isMobileDevice = window.innerWidth <= 768 || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
    if (isMobileDevice) {
      alert("⚠️ PC 웹 전용 기능 안내\n\n설정 자동 저장 기능은 안정성을 위해 PC 웹 브라우저 환경에서만 완벽히 지원됩니다. 모바일 기기 및 인앱 브라우저 환경에서는 기기별 보안 정책상 저장 데이터가 사전 예고 없이 자동 소거될 수 있어 사용이 차단됩니다.");
      return;
    }
    
    if (isStorageConsentEnabled) {
      if (confirm("⚙️ 설정 저장 비활성화 안내\n\n설정 자동 저장을 비활성화하시겠습니까? 해제 시 브라우저 내부(로컬스토리지)에 백업된 모든 게임 필터링 토글 및 테마 환경 설정이 즉각 흔적 없이 영구 소거됩니다.")) {
        onToggleStorageConsent(false);
        alert("✨ 로컬 보존 설정이 완전히 해제되었으며, 브라우저 저장소 데이터가 무결하게 강제 소거 완료되었습니다!");
      }
    } else {
      if (confirm("💾 설정 자동 저장 동의 안내\n\n동의 시 사용하시는 게임 필터 토글, 뷰(PC/모바일), 다크/라이트 테마 환경 설정 값이 브라우저의 전용 로컬 저장소에 안전하게 백업되어 재접속 시에도 완벽히 동기화 유지됩니다.\n\n* 본 사이트는 정적 웹페이지로 그 어떠한 개인화 정보도 외부 서버로 전송하지 않으며, 오직 이 브라우저 격리 저장소 내부 영역에만 안전히 보관됩니다. 활성화하시겠습니까?")) {
        onToggleStorageConsent(true);
        alert("💾 설정 자동 저장 기능이 성공적으로 활성화되었습니다! 이후의 변경 사항은 실시간으로 저장 장치에 즉각 자동 보존됩니다.");
      }
    }
  };

  if (!gamesConfig || Object.keys(gamesConfig).length === 0) return null;

  const gameNames = Object.keys(gamesConfig);

  const handleViewChange = (view) => {
    console.log('handleViewChange Clicked! View Target:', view);
    if (onViewChange) {
      onViewChange(view);
    } else {
      console.error('onViewChange function is undefined!');
    }
  };

  const handleOpenGuide = () => {
    console.log('handleOpenGuide Clicked!');
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
            onClick={() => onSelectAll(true)}
            type="button"
            title="모든 게임 표시"
          >
            <CheckSquare size={14} />
            <span className="game-filter-bar__control-label">전체 표시</span>
          </button>
          <button
            className={`game-filter-bar__control-btn ${isShrunk ? 'game-filter-bar__control-btn--icon-only' : ''}`}
            onClick={() => onSelectAll(false)}
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
                onClick={() => onToggleGame(gameName)}
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
              title="PC형 와이드 간트 뷰"
              id="btn-view-gantt"
            >
              <Monitor size={14} />
              <span className="view-switcher__label">PC</span>
            </button>
            <button
              className={`view-switcher__btn ${currentView === 'list' ? 'view-switcher__btn--active' : ''} ${isShrunk ? 'view-switcher__btn--icon-only' : ''}`}
              onClick={() => handleViewChange('list')}
              title="모바일형 직관 리스트 뷰"
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

          {/* 설정 저장 단추 */}
          <button
            className={`storage-consent-btn ${isStorageConsentEnabled ? 'storage-consent-btn--active' : ''} ${isShrunk ? 'storage-consent-btn--icon-only' : ''}`}
            onClick={handleToggleStorage}
            type="button"
            title="개인 필터 및 테마 설정 브라우저 자동 보존"
          >
            <Database size={12} />
            <span className="storage-consent-btn-label">설정 저장</span>
          </button>
        </div>

        <button
          className={`game-filter-bar__guide-btn ${isShrunk ? 'game-filter-bar__guide-btn--icon-only' : ''}`}
          onClick={handleOpenGuide}
          type="button"
          id="open-guide-btn"
          title="이용 안내 보기"
        >
          <HelpCircle size={14} />
          <span className="game-filter-bar__guide-label">이용 안내</span>
        </button>
      </div>
    </section>
  );
}
