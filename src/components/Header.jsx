import { Youtube, MessageSquare } from 'lucide-react';

/**
 * Header 컴포넌트
 * 대시보드 타이틀과 경고/설명 서브타이틀만 노출하도록 경량화되었습니다.
 * 우측에 유튜브 홍보와 구글 폼 피드백 제보 링크가 그룹화되어 표시됩니다.
 */
export default function Header() {
  return (
    <header className="header">
      <div className="header__title-group">
        <h1 className="header__title">
          서브컬쳐 게임 일정 대쉬보드
          <span className="header__version">v1.0.3</span>
        </h1>
        <p className="header__subtitle">
          여러 게임의 공식 일정과 주기에 맞춘 예상 일정을 표기합니다.
          <span className="header__warning">
            ⚠️ 공지되지 않은 미래 일정은 과거 주기를 기반으로 한 예상치입니다.
          </span>
        </p>
      </div>

      <div className="header__actions">
        <div className="header__youtube-promo">
          <span className="youtube-promo__text">다양한 게임 소식과 쇼츠는</span>
          <a
            href="https://www.youtube.com/@AEIKA215"
            target="_blank"
            rel="noopener noreferrer"
            className="youtube-promo__btn"
            title="애이카 아카이브 유튜브 채널 바로가기"
          >
            <Youtube size={14} className="youtube-promo__icon" />
            <span>애이카 아카이브!</span>
          </a>
        </div>

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
      </div>
    </header>
  );
}
