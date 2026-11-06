import { Youtube, MessageSquare, Heart, HelpCircle, Sun, Moon, Database } from 'lucide-react';
import { version } from '../../package.json';
import {
  trackChannelClick,
  trackEvent,
  trackThemeToggle,
  trackModalOpen,
  trackStorageConsentToggle,
} from '../utils/analytics';

/**
 * Header 컴포넌트 (v2.0 슬림 상단 바)
 * 좌측: 타이틀 + 버전 + 간결한 1줄 안내
 * 우측: 고스트 유틸리티 버튼 (채널 바로가기, 제보/피드백, 후원하기, 이용 안내, 설정 저장, 테마 전환)
 */
export default function Header({
  onOpenSupport,
  onOpenGuide,
  theme,
  onThemeChange,
  isStorageConsentEnabled,
  onToggleStorageConsent,
  meta,
}) {
  const handleToggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    trackThemeToggle(nextTheme);
    if (onThemeChange) onThemeChange(nextTheme);
  };

  const handleToggleStorage = () => {
    if (isStorageConsentEnabled) {
      if (confirm('설정 저장을 끄시겠습니까?\n저장되어 있던 게임 필터와 테마 설정이 초기화됩니다.')) {
        trackStorageConsentToggle(false);
        if (onToggleStorageConsent) onToggleStorageConsent(false);
      }
    } else {
      if (confirm('설정 저장을 켜시겠습니까?\n선택한 게임 필터와 테마 설정이 브라우저에 저장되어 재접속 시에도 유지됩니다.')) {
        trackStorageConsentToggle(true);
        if (onToggleStorageConsent) onToggleStorageConsent(true);
      }
    }
  };

  const handleOpenGuide = () => {
    trackModalOpen('guide');
    if (onOpenGuide) onOpenGuide();
  };

  const formattedUpdated = meta?.last_updated ? meta.last_updated.split(' ')[0] : '';

  return (
    <header className="header">
      <div className="header__title-group">
        <h1 className="header__title">
          <span>서브컬쳐 게임 일정 대시보드</span>
          <span className="header__version">v{version}</span>
        </h1>
        <div className="header__subtitle-container">
          <p className="header__subtitle">
            공식 확정 및 주기 기반 예상 일정 아카이브
          </p>
          <span className="header__dot">·</span>
          <span className="header__warning">
            비공식 팬 사이트 (실제 일정과 오차가 있을 수 있음)
          </span>
          {formattedUpdated && (
            <>
              <span className="header__dot">·</span>
              <span className="header__warning">갱신 {formattedUpdated}</span>
            </>
          )}
        </div>
      </div>

      <div className="header__actions">
        <a
          href="https://www.youtube.com/@AEIKA215"
          onClick={() => trackChannelClick('header')}
          target="_blank"
          rel="noopener noreferrer"
          className="header__ghost-btn"
          title="애이카 아카이브 유튜브 채널 바로가기"
        >
          <Youtube size={14} className="youtube-promo__icon" />
          <span>채널</span>
        </a>

        <a
          href="https://docs.google.com/forms/d/e/1FAIpQLSfETPGku14-e4MI8iXNxZ7WkazTopwkLduHNK5d3MAz-5VhIQ/viewform?usp=publish-editor"
          onClick={() => trackEvent('click_feedback_form')}
          target="_blank"
          rel="noopener noreferrer"
          className="header__ghost-btn"
          title="대시보드 피드백 및 일정 오류 제보하기"
        >
          <MessageSquare size={14} className="header__feedback-icon" />
          <span>제보·피드백</span>
        </a>

        <button
          onClick={onOpenSupport}
          type="button"
          className="header__ghost-btn"
          title="대시보드 운영 및 개발 후원하기"
        >
          <Heart size={14} className="header__support-icon" />
          <span>후원</span>
        </button>

        <span className="header__divider" aria-hidden="true" />

        <button
          onClick={handleOpenGuide}
          type="button"
          className="header__ghost-btn"
          id="open-guide-btn"
          title="이용 안내 및 패치노트 보기"
        >
          <HelpCircle size={14} className="header__guide-icon" />
          <span>안내</span>
        </button>

        <button
          onClick={handleToggleStorage}
          type="button"
          className={`header__ghost-btn ${isStorageConsentEnabled ? 'header__ghost-btn--active' : ''}`}
          title="설정 저장 (필터 및 테마 브라우저 보관)"
        >
          <Database size={13} />
          <span>설정 저장</span>
        </button>

        <button
          onClick={handleToggleTheme}
          type="button"
          className="header__ghost-btn header__ghost-btn--icon"
          title={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
          aria-label="테마 전환"
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>
      </div>
    </header>
  );
}
