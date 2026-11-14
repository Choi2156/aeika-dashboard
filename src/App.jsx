import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { useScheduleData } from './hooks/useScheduleData';
import { usePwaInstall } from './hooks/usePwaInstall';
import { trackModalOpen, trackScheduleEventClick, trackNoticeTickerClick, trackCalendarOpen } from './utils/analytics';
import Header from './components/Header';
import GameFilterBar from './components/GameFilterBar';
import LiveBannerBoard from './components/LiveBannerBoard';
import GanttView from './views/GanttView';
import CalendarView from './views/CalendarView';
import ListView from './views/ListView';
import GanttBottomLayout from './components/GanttBottomLayout';
import Footer from './components/Footer';
import NoticeTickerBanner from './components/NoticeTickerBanner';
import SectionErrorBoundary from './components/common/SectionErrorBoundary';
import { getNowKSTParts } from './utils/dateKST';

// 코드 스플리팅: 초기 번들 용량 절감을 위해 팝업 모달을 온디맨드 lazy 로딩
const DetailModal = lazy(() => import('./components/DetailModal'));
const GuideModal = lazy(() => import('./components/GuideModal'));
const LicenseModal = lazy(() => import('./components/LicenseModal'));
const SupportModal = lazy(() => import('./components/SupportModal'));
const NoticeModal = lazy(() => import('./components/NoticeModal'));
const CalendarModal = lazy(() => import('./components/CalendarModal'));
const InstallModal = lazy(() => import('./components/InstallModal'));

import './styles/variables.css';
import './styles/base.css';

// ==========================================
// 🚨 [점검 모드 마스터 설정 스위치]
// ==========================================
export const MAINTENANCE_CONFIG = {
  active: false,
  message:
    '임시 테스트 공개 기간 동안은 본 알림 배너가 항상 노출됩니다. 점검 중에도 기존 UI 및 차트 기능은 정상 작동하지만, 일시적인 데이터 손상이나 실시간 업데이트 지연이 발생할 수 있는 점 이용자 여러분의 너른 양해 부탁드립니다.',
};

const DEFAULT_SETTINGS = {
  theme: 'dark',
  currentView: 'gantt',
  activeGames: {},
};

export default function App() {
  const {
    events,
    gamesConfig,
    recommendedVideos,
    briefingData,
    patchNotes,
    notices = [],
    meta,
    loading,
    error,
  } = useScheduleData();

  // 모바일 기기 최초 접속 시 상세 일정('list') 디폴트화
  const [currentView, setCurrentView] = useState(() => {
    const isMobile =
      typeof window !== 'undefined' &&
      (window.innerWidth <= 768 || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent));
    return isMobile ? 'list' : 'gantt';
  });
  const [viewDirection, setViewDirection] = useState('center');

  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isLicenseOpen, setIsLicenseOpen] = useState(false);
  const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedEventTypeName, setSelectedEventTypeName] = useState('');
  const appRef = useRef(null);

  const [theme, setTheme] = useState('dark');
  const [isStorageConsentEnabled, setIsStorageConsentEnabled] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isInstallOpen, setIsInstallOpen] = useState(false);
  const [calendarModalTarget, setCalendarModalTarget] = useState({ year: null, month: null });
  const [jumpTodayTrigger, setJumpTodayTrigger] = useState(0);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false
  );

  const {
    isStandalone: isAppInstalled,
    canNativePrompt,
    platform: installPlatform,
    triggerInstall,
  } = usePwaInstall();

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 스크롤 스파이 (이력 현상 적용으로 경계 깜빡임 방지)
  const [isShrunk, setIsShrunk] = useState(false);
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const isMobile = window.innerWidth <= 768;
          const shrinkThreshold = isMobile ? 165 : 160;
          const expandThreshold = 90;
          const scrollY = window.scrollY;

          setIsShrunk((prev) => {
            if (!prev && scrollY > shrinkThreshold) return true;
            if (prev && scrollY < expandThreshold) return false;
            return prev;
          });
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);
    document.documentElement.style.colorScheme = theme === 'light' ? 'light' : 'dark';
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', theme === 'light' ? '#e4eaf2' : '#0b0c10');
    }
  }, [theme]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentView]);

  const [activeGames, setActiveGames] = useState({});

  useEffect(() => {
    const savedConsent = localStorage.getItem('subculture_dashboard_consent') === 'true';
    if (savedConsent) {
      setIsStorageConsentEnabled(true);
      const savedSettingsStr = localStorage.getItem('subculture_dashboard_settings');
      if (savedSettingsStr) {
        try {
          const parsed = JSON.parse(savedSettingsStr);
          const merged = { ...DEFAULT_SETTINGS, ...parsed };
          if (merged.theme === 'dark' || merged.theme === 'light') {
            setTheme(merged.theme);
          }
          if (
            merged.currentView === 'gantt' ||
            merged.currentView === 'calendar' ||
            merged.currentView === 'list'
          ) {
            setCurrentView(merged.currentView);
          }
        } catch (e) {
          console.error('Failed to restore master dashboard settings:', e);
        }
      }
    }
  }, []);

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
              const isMatch = configKeys.every((k) => parsedKeys.includes(k));
              if (isMatch) {
                setActiveGames(savedGames);
                return;
              }
            }
          } catch (e) {
            console.error('Failed to restore active games cache:', e);
          }
        }
      }

      const initial = {};
      Object.keys(gamesConfig).forEach((g) => {
        initial[g] = true;
      });
      setActiveGames(initial);
    }
  }, [gamesConfig]);

  const persistSettings = (partialSettings) => {
    if (!isStorageConsentEnabled) return;
    try {
      const savedSettingsStr = localStorage.getItem('subculture_dashboard_settings');
      const current = savedSettingsStr ? JSON.parse(savedSettingsStr) : { ...DEFAULT_SETTINGS };
      const updated = {
        ...current,
        theme,
        currentView,
        activeGames,
        ...partialSettings,
      };
      localStorage.setItem('subculture_dashboard_settings', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to persist dashboard settings:', e);
    }
  };

  const handleToggleStorageConsent = (isEnabled) => {
    setIsStorageConsentEnabled(isEnabled);
    localStorage.setItem('subculture_dashboard_consent', isEnabled ? 'true' : 'false');
    if (isEnabled) {
      persistSettings({ theme, currentView, activeGames });
    } else {
      localStorage.removeItem('subculture_dashboard_settings');
    }
  };

  const handleThemeChange = (nextTheme) => {
    setTheme(nextTheme);
    setTimeout(() => persistSettings({ theme: nextTheme }), 0);
  };

  const handleViewChange = (nextView) => {
    const order = { gantt: 0, calendar: 1, list: 2 };
    if (order[nextView] !== undefined && order[currentView] !== undefined) {
      setViewDirection(order[nextView] > order[currentView] ? 'right' : 'left');
    } else {
      setViewDirection('center');
    }
    setCurrentView(nextView);
    setTimeout(() => persistSettings({ currentView: nextView }), 0);
  };

  const handleToggleGame = (game) => {
    setActiveGames((prev) => {
      const next = { ...prev, [game]: !prev[game] };
      setTimeout(() => persistSettings({ activeGames: next }), 0);
      return next;
    });
  };

  const handleSelectAll = (isActive) => {
    setActiveGames((prev) => {
      const next = {};
      Object.keys(prev).forEach((game) => {
        next[game] = isActive;
      });
      setTimeout(() => persistSettings({ activeGames: next }), 0);
      return next;
    });
  };

  const handleEventClick = useCallback((event, displayTypeName, source = 'unknown') => {
    trackScheduleEventClick(event, displayTypeName, source);
    trackModalOpen('detail');
    setSelectedEvent(event);
    setSelectedEventTypeName(displayTypeName);
  }, []);

  const handleOpenNotice = useCallback((notice = null) => {
    if (notice) {
      trackNoticeTickerClick(notice);
    }
    trackModalOpen('notice');
    setSelectedNotice(notice);
    setIsNoticeModalOpen(true);
  }, []);

  const handleCloseNotice = useCallback(() => {
    setIsNoticeModalOpen(false);
    setSelectedNotice(null);
  }, []);

  const handleOpenCalendarModal = useCallback(
    (targetYear = null, targetMonth = null, source = 'control_bar') => {
      const { year: kstY, month: kstM } = getNowKSTParts();
      const y = targetYear || kstY;
      const m = targetMonth || kstM;
      setCalendarModalTarget({ year: y, month: m });
      trackModalOpen('calendar');
      trackCalendarOpen({ type: 'modal', source, year: y, month: m });
      setIsCalendarOpen(true);
    },
    []
  );

  const handleJumpToToday = useCallback(() => {
    setJumpTodayTrigger((c) => c + 1);
  }, []);

  const handleInstallAction = useCallback(async () => {
    if (canNativePrompt) {
      const result = await triggerInstall();
      if (result?.outcome === 'accepted' || result?.outcome === 'dismissed') {
        return;
      }
    }
    setIsInstallOpen(true);
  }, [canNativePrompt, triggerInstall]);

  return (
    <div ref={appRef} className="app" data-theme={theme}>
      <div className="app-ambient-aurora" aria-hidden="true" />
      {MAINTENANCE_CONFIG.active && (
        <div className="maintenance-banner">
          <div className="maintenance-banner__content">
            <span className="maintenance-banner__icon">⚠️</span>
            <div className="maintenance-banner__text-group">
              <span className="maintenance-banner__title">사이트 점검중</span>
              <span className="maintenance-banner__desc">{MAINTENANCE_CONFIG.message}</span>
            </div>
          </div>
        </div>
      )}

      <Header
        onOpenSupport={() => {
          trackModalOpen('support');
          setIsSupportOpen(true);
        }}
        onOpenGuide={() => {
          trackModalOpen('guide');
          setIsGuideOpen(true);
        }}
        theme={theme}
        onThemeChange={handleThemeChange}
        isStorageConsentEnabled={isStorageConsentEnabled}
        onToggleStorageConsent={handleToggleStorageConsent}
        meta={meta}
        notices={notices}
        onOpenNotice={handleOpenNotice}
        isInstallVisible={!isAppInstalled}
        canNativeInstall={canNativePrompt}
        onOpenInstall={handleInstallAction}
      />

      <main className="main-content">
        {loading && (
          <div className="app-loading">
            <div className="app-loading__spinner"></div>
            <p className="app-loading__text">일정 데이터를 불러오는 중입니다...</p>
          </div>
        )}

        {error && (
          <div className="app-error">
            <p className="app-error__text">데이터를 로드하는 도중 오류가 발생했습니다.</p>
            <span className="app-error__text" style={{ opacity: 0.7, fontSize: '0.8rem' }}>
              {error}
            </span>
          </div>
        )}

        {!loading && !error && (
          <div className="main-view">
            <SectionErrorBoundary
              sectionName="LiveBannerBoard"
              sectionTitle="실시간 하이라이트 배너를 불러오는 중 문제가 발생했습니다."
              resetKey={`${currentView}-${Object.values(activeGames).join('')}`}
            >
              <LiveBannerBoard
                events={events}
                gamesConfig={gamesConfig}
                activeGames={activeGames}
                onEventClick={handleEventClick}
              />
            </SectionErrorBoundary>

            <GameFilterBar
              activeGames={activeGames}
              gamesConfig={gamesConfig}
              onToggleGame={handleToggleGame}
              onSelectAll={handleSelectAll}
              currentView={currentView}
              onViewChange={handleViewChange}
              onJumpToToday={handleJumpToToday}
              isShrunk={isShrunk}
            />

            <SectionErrorBoundary
              sectionName={currentView}
              sectionTitle="선택한 일정 뷰를 표시하는 중 문제가 발생했습니다."
              resetKey={`${currentView}-${Object.values(activeGames).join('')}`}
            >
              <div
                key={currentView}
                className="view-stage"
                data-view={currentView}
                data-dir={viewDirection}
              >
                {currentView === 'gantt' && (
                  <GanttView
                    events={events}
                    gamesConfig={gamesConfig}
                    activeGames={activeGames}
                    onToggleGame={handleToggleGame}
                    onEventClick={handleEventClick}
                    jumpTodayTrigger={jumpTodayTrigger}
                  />
                )}

                {currentView === 'calendar' && (
                  <CalendarView
                    events={events}
                    gamesConfig={gamesConfig}
                    activeGames={activeGames}
                    onEventClick={handleEventClick}
                    onOpenCalendarModal={handleOpenCalendarModal}
                    jumpTodayTrigger={jumpTodayTrigger}
                  />
                )}

                {currentView === 'list' && (
                  <ListView
                    events={events}
                    gamesConfig={gamesConfig}
                    activeGames={activeGames}
                    onEventClick={handleEventClick}
                    jumpTodayTrigger={jumpTodayTrigger}
                  />
                )}
              </div>
            </SectionErrorBoundary>

            {(currentView === 'gantt' || currentView === 'calendar') && (
              <SectionErrorBoundary
                sectionName="GanttBottomLayout"
                sectionTitle="추천 미디어 및 공지사항 영역을 불러오는 중 문제가 발생했습니다."
                resetKey={Object.values(activeGames).join('')}
              >
                <GanttBottomLayout
                  events={events}
                  gamesConfig={gamesConfig}
                  activeGames={activeGames}
                  onEventClick={handleEventClick}
                  recommendedVideos={recommendedVideos}
                  notices={notices}
                  onOpenNotice={handleOpenNotice}
                  isMobile={isMobile}
                />
              </SectionErrorBoundary>
            )}
          </div>
        )}
      </main>

      <Suspense fallback={null}>
        {selectedEvent && (
          <DetailModal
            event={selectedEvent}
            events={events}
            displayTypeName={selectedEventTypeName}
            gamesConfig={gamesConfig}
            onClose={() => setSelectedEvent(null)}
          />
        )}

        {isGuideOpen && (
          <GuideModal
            isOpen={isGuideOpen}
            onClose={() => setIsGuideOpen(false)}
            patchNotes={patchNotes}
            isAppInstalled={isAppInstalled}
            onOpenInstall={() => {
              setIsGuideOpen(false);
              handleInstallAction();
            }}
          />
        )}

        {isInstallOpen && (
          <InstallModal
            isOpen={isInstallOpen}
            onClose={() => setIsInstallOpen(false)}
            canNativePrompt={canNativePrompt}
            platform={installPlatform}
            onNativeInstall={triggerInstall}
          />
        )}

        {isLicenseOpen && (
          <LicenseModal isOpen={isLicenseOpen} onClose={() => setIsLicenseOpen(false)} />
        )}

        {isSupportOpen && (
          <SupportModal isOpen={isSupportOpen} onClose={() => setIsSupportOpen(false)} />
        )}

        {isNoticeModalOpen && (
          <NoticeModal
            isOpen={isNoticeModalOpen}
            onClose={handleCloseNotice}
            notices={notices}
            selectedNotice={selectedNotice}
          />
        )}

        {isCalendarOpen && (
          <CalendarModal
            isOpen={isCalendarOpen}
            onClose={() => setIsCalendarOpen(false)}
            meta={meta}
            events={events}
            gamesConfig={gamesConfig}
            activeGames={activeGames}
            targetYear={calendarModalTarget.year}
            targetMonth={calendarModalTarget.month}
          />
        )}
      </Suspense>

      <Footer
        onOpenLicense={() => {
          trackModalOpen('license');
          setIsLicenseOpen(true);
        }}
      />
    </div>
  );
}
