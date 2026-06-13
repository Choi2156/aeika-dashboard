import { useState, useEffect, useRef } from 'react';
import { useScheduleData } from './hooks/useScheduleData';
import Header from './components/Header';
import GameFilterBar from './components/GameFilterBar';
import GanttView from './views/GanttView';
import ListView from './views/ListView';
import DetailModal from './components/DetailModal';
import GuideModal from './components/GuideModal';
import LicenseModal from './components/LicenseModal';
import LiveBannerBoard from './components/LiveBannerBoard';
import DashboardInfoBar from './components/DashboardInfoBar';
import Footer from './components/Footer';
import SupportModal from './components/SupportModal';

import './styles/variables.css';
import './styles/base.css';

// ==========================================
// 🚨 [점검 모드 마스터 설정 스위치]
// ==========================================
export const MAINTENANCE_CONFIG = {
  active: false, // 점검 중 상태 활성화 여부 (true = 활성화, false = 비활성화)
  message: "임시 테스트 공개 기간 동안은 본 알림 배너가 항상 노출됩니다. 점검 중에도 기존 UI 및 차트 기능은 정상 작동하지만, 일시적인 데이터 손상이나 실시간 업데이트 지연이 발생할 수 있는 점 이용자 여러분의 너른 양해 부탁드립니다." // 상단 배너에 노출할 점검 안내 상세 텍스트
};

// 확장성을 위한 마스터 설정 스키마 기본값 정의 (추후 완전히 새로운 필드가 추가되어도 크래시 없이 하위호환)
const DEFAULT_SETTINGS = {
  theme: 'dark',
  currentView: 'gantt',
  activeGames: {},
};

export default function App() {
  const { events, gamesConfig, recommendedVideos, briefingData, patchNotes, meta, loading, error } = useScheduleData();
  
  // 1. 모바일 기기 최초 접속 시 모바일 직관 뷰('list') 디폴트화 보증을 위한 Lazy Initializer 이식
  const [currentView, setCurrentView] = useState(() => {
    const isMobile = typeof window !== 'undefined' && 
      (window.innerWidth <= 768 || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent));
    return isMobile ? 'list' : 'gantt';
  });

  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isLicenseOpen, setIsLicenseOpen] = useState(false); // 신설 면책/라이선스 상세 모달
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedEventTypeName, setSelectedEventTypeName] = useState('');
  const appRef = useRef(null);
  
  // 2. 테마 모드 상태 ('dark' | 'light')
  const [theme, setTheme] = useState('dark');
  
  // 3. 로컬 스토리지 보존 동의 상태 (기본값: false)
  const [isStorageConsentEnabled, setIsStorageConsentEnabled] = useState(false);

  // 3.5. 후원 모달 오픈 상태
  const [isSupportOpen, setIsSupportOpen] = useState(false);

  // 4. 스크롤 스파이 훅 탑재: 헤더와 인포바가 다 넘어가는 시점(150px)에 메뉴바 콤팩트 축소
  const [isShrunk, setIsShrunk] = useState(false);
  useEffect(() => {
    const handleScroll = () => {
      const isMobile = window.innerWidth <= 768;
      const threshold = isMobile ? 280 : 150; // 모바일에선 더 늦게(280px) 축소되도록 임계치 상향!
      setIsShrunk(window.scrollY > threshold);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // 테마 변경 시 document.body 전체에 data-theme 속성을 연계 바인딩하여 배경/스크롤바 등 무결점 통합 전환 보장
  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
  }, [theme]);
  
  // 게임 활성화 상태 관리
  const [activeGames, setActiveGames] = useState({});
  
  // 5. [개선] 단일 직렬화 객체 복원 엔진 (동의 유저에 한해 모바일/PC 통합 자동 복구 및 하위호환)
  useEffect(() => {
    const savedConsent = localStorage.getItem('subculture_dashboard_consent') === 'true';
    if (savedConsent) {
      setIsStorageConsentEnabled(true);
      
      const savedSettingsStr = localStorage.getItem('subculture_dashboard_settings');
      if (savedSettingsStr) {
        try {
          const parsed = JSON.parse(savedSettingsStr);
          // 마스터 템플릿과 병합함으로써 추후 신규 컬럼 필드가 추가되더라도 누락 없이 안전 융합
          const merged = { ...DEFAULT_SETTINGS, ...parsed };
          
          if (merged.theme === 'dark' || merged.theme === 'light') {
            setTheme(merged.theme);
          }
          if (merged.currentView === 'gantt' || merged.currentView === 'list') {
            setCurrentView(merged.currentView);
          }
        } catch (e) {
          console.error('Failed to restore master dashboard settings from local storage:', e);
        }
      }
    }
  }, []);

  // 6. gamesConfig 로딩 시점에 활성화 게임 필터 복원
  useEffect(() => {
    if (gamesConfig) {
      const savedConsent = localStorage.getItem('subculture_dashboard_consent') === 'true';
      if (savedConsent) {
        const savedSettingsStr = localStorage.getItem('subculture_dashboard_settings');
        if (savedSettingsStr) {
          try {
            const parsed = JSON.parse(savedSettingsStr);
            const savedGames = parsed.activeGames;
            if (savedGames) {
              const configKeys = Object.keys(gamesConfig);
              const parsedKeys = Object.keys(savedGames);
              const isMatch = configKeys.every(k => parsedKeys.includes(k));
              if (isMatch) {
                setActiveGames(savedGames);
                return;
              }
            }
          } catch (e) {
            console.error('Failed to restore active games cache from master settings object:', e);
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

  // 7. [개선] 단일 직렬화 객체 자동 실시간 백업 세션 (모바일/PC 통합 세션 백업 보장)
  useEffect(() => {
    if (isStorageConsentEnabled) {
      try {
        localStorage.setItem('subculture_dashboard_consent', 'true');
        
        const settingsObj = {
          theme,
          currentView,
          activeGames
        };
        localStorage.setItem('subculture_dashboard_settings', JSON.stringify(settingsObj));
      } catch (e) {
        console.warn('LocalStorage 쓰기 차단 또는 용량 초과:', e);
      }
    }
  }, [isStorageConsentEnabled, theme, currentView, activeGames]);

  // 8. 설정 보존 철회 시 로컬 저장소 흔적 100% 소거
  const handleToggleStorageConsent = (isEnabled) => {
    if (isEnabled) {
      setIsStorageConsentEnabled(true);
    } else {
      setIsStorageConsentEnabled(false);
      try {
        localStorage.removeItem('subculture_dashboard_consent');
        localStorage.removeItem('subculture_dashboard_settings');
      } catch (e) {
        console.warn('LocalStorage 삭제 차단:', e);
      }
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
      {MAINTENANCE_CONFIG.active && (
        <div className="maintenance-banner">
          <div className="maintenance-banner__content">
            <span className="maintenance-banner__icon">⚠️</span>
            <div className="maintenance-banner__text-group">
              <span className="maintenance-banner__title">사이트 점검중</span>
              <span className="maintenance-banner__desc">
                {MAINTENANCE_CONFIG.message}
              </span>
            </div>
          </div>
        </div>
      )}

      <Header onOpenSupport={() => setIsSupportOpen(true)} />

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
        isShrunk={isShrunk} // 스크롤 축소 신호 주입
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
                activeGames={activeGames}
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
        events={events}
        displayTypeName={selectedEventTypeName}
        gamesConfig={gamesConfig}
        onClose={() => setSelectedEvent(null)}
      />

      <GuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        patchNotes={patchNotes}
      />

      <LicenseModal
        isOpen={isLicenseOpen}
        onClose={() => setIsLicenseOpen(false)}
      />

      <SupportModal
        isOpen={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
      />

      <Footer onOpenLicense={() => setIsLicenseOpen(true)} />
    </div>
  );
}
