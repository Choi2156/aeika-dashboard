import React, { useState } from 'react';
import { Mail, ShieldAlert, Github } from 'lucide-react';
import { trackOutboundLink, trackChannelClick, trackClipboardCopy } from '../utils/analytics';
import '../styles/components.css';

/**
 * Footer Component (v1.3.0 슬림 푸터)
 * - 브랜드 로고 + 저작권/면책/라이선스 모달 트리거 및 소셜 링크
 */
export default function Footer({ onOpenLicense }) {
  const [copied, setCopied] = useState(false);

  const handleCopyEmail = () => {
    trackClipboardCopy('email', 'choi21mg@gmail.com');
    navigator.clipboard
      .writeText('choi21mg@gmail.com')
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch((err) => {
        console.error('이메일 주소 복사 실패:', err);
      });
  };

  return (
    <footer className="dashboard-footer">
      <div className="footer-content">
        <div className="footer-top">
          <div className="footer-brand">
            <div className="footer-brand__row">
              <span className="footer-brand__logo">AEIKA ARCHIVE</span>
            </div>
            <p className="footer-brand__sub">
              서브컬처 게임 일정 아카이브 · 비공식 팬 프로젝트 (게임 이미지·상표권은 각 원제작사에 귀속)
            </p>
          </div>

          <div className="footer-social-links">
            <button
              type="button"
              onClick={onOpenLicense}
              className="footer-license-trigger-btn"
              title="저작권, 일정 면책 조항 및 오픈소스·폰트 라이선스 상세 보기"
            >
              <ShieldAlert size={13} />
              <span>저작권 · 면책 · 라이선스 안내</span>
            </button>

            <a
              href="https://github.com/Choi2156"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-social-btn footer-social-btn--github"
              title="GitHub 프로필 보기"
              onClick={() => {
                trackOutboundLink({
                  linkCategory: 'github',
                  platform: 'github',
                  targetUrl: 'https://github.com/Choi2156',
                  title: 'GitHub 프로필',
                });
              }}
            >
              <Github size={15} />
            </a>

            <a
              href="https://www.youtube.com/@AEIKA215"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-social-btn footer-social-btn--youtube"
              title="애이카 아카이브 유튜브 채널 방문"
              onClick={() => trackChannelClick('footer')}
            >
              <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
            </a>

            <div
              className="footer-social-btn footer-social-btn--mail footer-social-btn--mail-text clickable-mail-btn"
              onClick={handleCopyEmail}
              title="클릭하여 이메일 주소 복사"
            >
              <Mail size={13} />
              <span>choi21mg@gmail.com</span>
              {copied && (
                <div className="copy-tooltip-toast">
                  <span>복사되었습니다!</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p className="copyright-line">
            &copy; 2026 AEIKA ARCHIVE. Source code licensed under MIT.
          </p>
        </div>
      </div>
    </footer>
  );
}
