import {
  Youtube,
  MessageSquare,
  Heart,
  HelpCircle,
  Sun,
  Moon,
  Database,
  Megaphone,
  ChevronRight,
} from 'lucide-react';
import VisitorCounter from './VisitorCounter';
import {
  trackChannelClick,
  trackEvent,
  trackThemeToggle,
  trackModalOpen,
  trackStorageConsentToggle,
} from '../utils/analytics';

const APP_VERSION = 'v1.3.0';

/**
 * Header 컴포넌트 (v1.3.0 Obsidian Command Header)
 * - 좌측: 브랜드 엠블럼 + 타이틀 + 버전 배지 + 최신 공지 캡슐
 * - 우측: 유틸리티 액션 독 (채널, 제보, 후원, 안내, 설정 저장, 테마 전환)
 */
export default function Header({
  onOpenSupport,
  onOpenGuide,
  theme,
  onThemeChange,
  isStorageConsentEnabled,
  onToggleStorageConsent,
  meta,
  notices = [],
  onOpenNotice,
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

  const primaryNotice = notices && notices.length > 0 ? notices[0] : null;
  const formattedUpdated = meta?.last_updated ? meta.last_updated.split(' ')[0] : '';

  return (
    <header className="header">
      {/* 1. 좌측: 브랜드 아이덴티티 & 인라인 공지 캡슐 */}
      <div className="header__brand-cluster">
        <div className="header__emblem" aria-hidden="true" />
        <div className="header__title-group">
          <div className="header__title-row">
            <h1 className="header__title">서브컬처 게임 일정 대시보드</h1>
            <span className="header__version">{APP_VERSION}</span>
            {formattedUpdated && (
              <span className="header__updated">갱신 {formattedUpdated}</span>
            )}
          </div>

          {primaryNotice ? (
            <button
              type="button"
              className="header__notice-inline"
              onClick={() => onOpenNotice && onOpenNotice(primaryNotice)}
              title="공지사항 상세 보기"
            >
              <Megaphone size={12} className="header__notice-icon" />
              <span className="header__notice-tag">{primaryNotice.category || '공지'}</span>
              <span className="header__notice-text">{primaryNotice.title}</span>
              <ChevronRight size={12} className="header__notice-arrow" />
            </button>
          ) : (
            <p className="header__subtitle">공식 확정 · 업데이트 주기 기반 타임라인</p>
          )}
        </div>
      </div>

      {/* 2. 우측: 유틸리티 액션 독 */}
      <div className="header__actions">
        <VisitorCounter />

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
          <MessageSquare size={13} className="header__feedback-icon" />
          <span>제보</span>
        </a>

        <button
          onClick={onOpenSupport}
          type="button"
          className="header__ghost-btn"
          title="대시보드 운영 및 개발 후원하기"
        >
          <Heart size={13} className="header__support-icon" />
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
          className={`header__ghost-btn ${
            isStorageConsentEnabled ? 'header__ghost-btn--active' : ''
          }`}
          title="설정 저장 (필터 및 테마 브라우저 보관)"
        >
          <Database size={13} />
          <span>저장</span>
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
