import { useState, useEffect, useRef } from 'react';
import { useScheduleData } from './hooks/useScheduleData';
import Header from './components/Header';
import GameFilterBar from './components/GameFilterBar';
import GanttView from './views/GanttView';
import ListView from './views/ListView';
import DetailModal from './components/DetailModal';
import GuideModal from './components/GuideModal';
import LiveBannerBoard from './components/LiveBannerBoard';
import DashboardInfoBar from './components/DashboardInfoBar';
import Footer from './components/Footer';

import './styles/variables.css';
import './styles/base.css';

export default function App() {
  const { events, gamesConfig, recommendedVideos, briefingData, meta, loading, error } = useScheduleData();
  const [currentView, setCurrentView] = useState('gantt');
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedEventTypeName, setSelectedEventTypeName] = useState('');
  const appRef = useRef(null);
  
  // 1. 테마 모드 상태 ('dark' | 'light')
  const [theme, setTheme] = useState('dark');
  
  // 2. 로컬 스토리지 보존 동의 상태 (기본값: false)
  const [isStorageConsentEnabled, setIsStorageConsentEnabled] = useState(false);
  
  // 테마 변경 시 document.body 전체에 data-theme 속성을 연계 바인딩하여 배경/스크롤바 등 무결점 통합 전환 보장
  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
  }, [theme]);
  
  // 게임 활성화 상태 관리
  const [activeGames, setActiveGames] = useState({});

  // 3. 마운트 시 저장소에서 이전 설정(동의 유저에 한해) 세밀 복원
  useEffect(() => {
    const isMobile = window.innerWidth <= 768 || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
    const savedConsent = localStorage.getItem('subculture_dashboard_consent') === 'true';
    
    if (savedConsent && !isMobile) {
      setIsStorageConsentEnabled(true);
      
      const savedTheme = localStorage.getItem('subculture_dashboard_theme');
      if (savedTheme === 'dark' || savedTheme === 'light') {
        setTheme(savedTheme);
      }
      
      const savedView = localStorage.getItem('subculture_dashboard_view');
      if (savedView === 'gantt' || savedView === 'list') {
        setCurrentView(savedView);
      }
    }
  }, []);

  // 4. gamesConfig 로딩 시점 필터 복원 철벽 방어선
  useEffect(() => {
    if (gamesConfig) {
      const isMobile = window.innerWidth <= 768 || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
      const savedConsent = localStorage.getItem('subculture_dashboard_consent') === 'true';
      
      if (savedConsent && !isMobile) {
        const savedGames = localStorage.getItem('subculture_dashboard_active_games');
        if (savedGames) {
          try {
            const parsed = JSON.parse(savedGames);
            const configKeys = Object.keys(gamesConfig);
            const parsedKeys = Object.keys(parsed);
            const isMatch = configKeys.every(k => parsedKeys.includes(k));
            if (isMatch) {
              setActiveGames(parsed);
              return;
            }
          } catch (e) {
            console.error('Failed to restore active games cache:', e);
          }
        }
      }

      const initial = {};
      Object.keys(gamesConfig).forEach((game) => {
        initial[game] = true; // 기본값: 모두 활성화
      });
      setActiveGames(initial);
    }
  }, [gamesConfig]);

  // 5. 동의 유저 대상 자동 상태 백업 저장 세션
  useEffect(() => {
    const isMobile = window.innerWidth <= 768 || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
    if (isStorageConsentEnabled && !isMobile) {
      localStorage.setItem('subculture_dashboard_consent', 'true');
      localStorage.setItem('subculture_dashboard_theme', theme);
      localStorage.setItem('subculture_dashboard_view', currentView);
      if (Object.keys(activeGames).length > 0) {
        localStorage.setItem('subculture_dashboard_active_games', JSON.stringify(activeGames));
      }
    }
  }, [isStorageConsentEnabled, theme, currentView, activeGames]);

  // 6. 설정 보존 철회 시 로컬 샌드박스 데이터 100% 영구 흔적 소거
  const handleToggleStorageConsent = (isEnabled) => {
    if (isEnabled) {
      setIsStorageConsentEnabled(true);
    } else {
      setIsStorageConsentEnabled(false);
      localStorage.removeItem('subculture_dashboard_consent');
      localStorage.removeItem('subculture_dashboard_theme');
      localStorage.removeItem('subculture_dashboard_view');
      localStorage.removeItem('subculture_dashboard_active_games');
    }
  };

  const handleToggleGame = (gameName) => {
    setActiveGames((prev) => ({
      ...prev,
      [gameName]: !prev[gameName],
    }));
  };

  const handleSelectAll = (isActive) => {
    setActiveGames((prev) => {
      const next = {};
      Object.keys(prev).forEach((game) => {
        next[game] = isActive;
      });
      return next;
    });
  };

  const handleEventClick = (event, displayTypeName) => {
    setSelectedEvent(event);
    setSelectedEventTypeName(displayTypeName);
  };

  // 초고성능 마우스 무브 네온 안개 트래킹 (리렌더링 0회로 성능 영향도 0%)
  const handleMouseMove = (e) => {
    if (!appRef.current) return;
    const rect = appRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    appRef.current.style.setProperty('--mouse-x', `${x}px`);
    appRef.current.style.setProperty('--mouse-y', `${y}px`);
  };

  return (
    <div 
      ref={appRef}
      className="app"
      data-theme={theme}
      onMouseMove={handleMouseMove}
    >
      <Header />

      <DashboardInfoBar meta={meta} />

      <GameFilterBar
        activeGames={activeGames}
        gamesConfig={gamesConfig}
        onToggleGame={handleToggleGame}
        onSelectAll={handleSelectAll}
        currentView={currentView}
        onViewChange={setCurrentView}
        onOpenGuide={() => setIsGuideOpen(true)}
        meta={meta}
        theme={theme}
        onThemeChange={setTheme}
        isStorageConsentEnabled={isStorageConsentEnabled}
        onToggleStorageConsent={handleToggleStorageConsent}
      />

      <main className="main-content">
        {loading && (
          <div className="app-loading">
            <div className="app-loading__spinner"></div>
            <p className="app-loading__text">스케줄 데이터를 불러오는 중입니다...</p>
          </div>
        )}

        {error && (
          <div className="app-error">
            <p className="app-error__text">데이터를 로드하는 도중 오류가 발생했습니다.</p>
            <span className="app-error__text" style={{ opacity: 0.7, fontSize: '0.8rem' }}>{error}</span>
          </div>
        )}

        {!loading && !error && (
          <div className="main-view">
            {currentView === 'gantt' && (
              <LiveBannerBoard
                events={events}
                gamesConfig={gamesConfig}
                onEventClick={handleEventClick}
              />
            )}

            {currentView === 'gantt' && (
              <GanttView
                events={events}
                gamesConfig={gamesConfig}
                recommendedVideos={recommendedVideos}
                briefingData={briefingData}
                activeGames={activeGames}
                onToggleGame={handleToggleGame}
                onEventClick={handleEventClick}
              />
            )}
            {currentView === 'list' && (
              <ListView
                events={events}
                gamesConfig={gamesConfig}
                activeGames={activeGames}
                onEventClick={handleEventClick}
              />
            )}
          </div>
        )}
      </main>

      <DetailModal
        event={selectedEvent}
        displayTypeName={selectedEventTypeName}
        gamesConfig={gamesConfig}
        onClose={() => setSelectedEvent(null)}
      />

      <GuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />

      <Footer />
    </div>
  );
}
