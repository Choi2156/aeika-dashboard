import { Youtube, MessageSquare, Heart } from 'lucide-react';
import VisitorCounter from './VisitorCounter';
import { version } from '../../package.json';

/**
 * Header 컴포넌트
 * 대시보드 타이틀과 경고/설명 서브타이틀만 노출하도록 경량화되었습니다.
 * 우측에 유튜브 홍보, 구글 폼 피드백 제보 링크 및 후원 버튼이 그룹화되어 표시됩니다.
 */
export default function Header({ onOpenSupport }) {
  return (
    <header className="header">
      <div className="header__title-group">
        <h1 className="header__title">
          서브컬쳐 게임 일정 대쉬보드
          <span className="header__version">v{version}</span>
        </h1>
        <div className="header__subtitle-container">
          <p className="header__subtitle">
            여러 게임의 공식 일정과 주기에 맞춘 예상 일정을 표기합니다.
          </p>
          <span className="header__warning">
            ⚠️ 수집 및 연산된 일정(확정/예상)은 오차가 발생할 수 있으며, 모든 저작권은 게임사에 귀속됩니다.
          </span>
        </div>
      </div>

      <div className="header__actions">
        {/* 1. 누적 방문수 */}
        <VisitorCounter />

        {/* 2. 유튜브 채널 구독/홍보 */}
        <a
          href="https://www.youtube.com/@AEIKA215"
          target="_blank"
          rel="noopener noreferrer"
          className="youtube-promo__btn"
          title="애이카 아카이브 유튜브 채널 바로가기"
        >
          <Youtube size={14} className="youtube-promo__icon" />
          <span>채널 바로가기</span>
        </a>

        {/* 3. 제보 및 피드백 */}
        <a
          href="https://docs.google.com/forms/d/e/1FAIpQLSfETPGku14-e4MI8iXNxZ7WkazTopwkLduHNK5d3MAz-5VhIQ/viewform?usp=publish-editor"
          target="_blank"
          rel="noopener noreferrer"
          className="header__feedback-btn"
          title="대시보드 피드백 및 일정 오류 제보하기"
        >
          <MessageSquare size={14} className="header__feedback-icon" />
          <span>제보 및 피드백</span>
        </a>

        {/* 4. 후원하기 */}
        <button
          onClick={onOpenSupport}
          className="header__support-btn"
          title="대시보드 운영 및 개발 후원하기"
        >
          <Heart size={14} className="header__support-icon" />
          <span>후원하기</span>
        </button>
      </div>
    </header>
  );
}
