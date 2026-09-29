import { useEffect, useRef } from 'react';
import { X, ShieldAlert } from 'lucide-react';
import '../styles/components.css';

/**
 * LicenseModal — 저작권, 면책 조항 및 라이선스 상세 모달
 */
export default function LicenseModal({ isOpen, onClose }) {
  const overlayRef = useRef(null);
  const closingRef = useRef(false);

  /* ── Entry animation & History State ── */
  useEffect(() => {
    if (!isOpen) return;
    closingRef.current = false;
    const frame = requestAnimationFrame(() => {
      if (overlayRef.current) {
        overlayRef.current.classList.add('modal-visible');
      }
    });

    // 브라우저 뒤로가기 시 모달만 닫히도록 히스토리 상태 주입
    window.history.pushState({ modal: 'license' }, '');
    const onPopState = () => {
      handleClose();
    };
    window.addEventListener('popstate', onPopState);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('popstate', onPopState);
    };
  }, [isOpen]);

  /* ── Close with exit animation ── */
  const handleClose = () => {
    if (closingRef.current) return;
    closingRef.current = true;

    // 모달이 직접 닫힐 때(오버레이/X 버튼) 히스토리 상태 제거
    if (window.history.state && window.history.state.modal === 'license') {
      window.history.back();
    }

    const overlay = overlayRef.current;
    if (overlay) {
      overlay.classList.remove('modal-visible');
      let closed = false;
      const onEnd = () => {
        if (closed) return;
        closed = true;
        overlay.removeEventListener('transitionend', onEnd);
        onClose();
      };
      overlay.addEventListener('transitionend', onEnd);
      // Fallback
      setTimeout(() => {
        if (closed) return;
        closed = true;
        overlay.removeEventListener('transitionend', onEnd);
        onClose();
      }, 300);
    } else {
      onClose();
    }
  };

  /* ── Escape key ── */
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === overlayRef.current) handleClose();
      }}
    >
      <div className="modal-body modal-body--guide">
        {/* ── Header ── */}
        <div className="guide-header">
          <div className="guide-header-title">
            <ShieldAlert size={20} className="guide-title-icon" style={{ color: 'var(--accent-indigo-light)' }} />
            <span>라이선스 및 안내</span>
          </div>
          <button
            className="modal-close-btn"
            onClick={handleClose}
            aria-label="닫기"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Scrollable Content ── */}
        <div className="guide-content">
          <div className="guide-sections">
            {/* Section 1 */}
            <div className="guide-section">
              <div className="guide-section-heading" style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
                ⚖️ 1. 저작권 및 상표권 안내
              </div>
              <p className="guide-section-text" style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', lineHeight: 1.7 }}>
                본 사이트에 사용된 모든 캐릭터 이미지, 로고, 상표권 및 게임 데이터의 권리는 원제조사 및 공식 퍼블리셔에 있습니다.
              </p>
              <div className="disclaimer-copyrights" style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.68rem', color: 'var(--slate-500)', display: 'flex', flexDirection: 'column', gap: '3px', paddingLeft: '0.5rem', borderLeft: '2px solid rgba(255, 255, 255, 0.08)', marginTop: '0.25rem' }}>
                <div>• Copyright © COGNOSPHERE. All Rights Reserved. (원신 / 스타레일 / 젠존제)</div>
                <div>• Copyright © KURO GAMES. ALL RIGHTS RESERVED. (명조: 워더링 웨이브)</div>
                <div>• Copyright © GRYPHLINE / HYPERGRYPH. All Rights Reserved. (명일방주 / 엔드필드)</div>
              </div>
              <p className="guide-section-text" style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', lineHeight: 1.7, marginTop: '0.25rem' }}>
                본 사이트는 비공식 팬메이드 서비스이며, 원저작권자의 권리를 존중합니다.
              </p>
            </div>

            {/* Section 2 */}
            <div className="guide-section">
              <div className="guide-section-heading" style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
                🔮 2. 일정 안내 및 면책
              </div>
              <p className="guide-section-text" style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', lineHeight: 1.7 }}>
                <strong>[확정]</strong> 표기는 공식 공지를 확인한 일정이지만, 수동 등록 과정에서 오기입이 발생할 수 있습니다. 
                <strong>[예상]</strong> 표기는 이전 주기를 바탕으로 계산한 예상치로 실제 일정과 차이가 있을 수 있습니다.
              </p>
              <p className="guide-section-text" style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', lineHeight: 1.7, marginTop: '0.25rem' }}>
                게임사의 긴급 점검이나 일정 연기 등으로 일정이 변경될 수 있으니 중요 일정은 인게임 공식 공지를 함께 확인해 주시기 바랍니다. 본 사이트의 정보를 참고하여 발생한 손해에 대해서는 책임을 지지 않습니다.
              </p>
            </div>

            {/* Section 3 */}
            <div className="guide-section">
              <div className="guide-section-heading" style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
                📄 3. 오픈소스 라이선스
              </div>
              <p className="guide-section-text" style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', lineHeight: 1.7 }}>
                본 웹사이트 프론트엔드 소스코드는 <strong>MIT License</strong>를 따릅니다. 사용된 아이콘은 Lucide Icons, 폰트는 Google Fonts의 Outfit(OFL) 라이선스를 적용했습니다.
              </p>
            </div>

            {/* Section 4 */}
            <div className="guide-section">
              <div className="guide-section-heading" style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
                ☕ 4. 후원 안내
              </div>
              <p className="guide-section-text" style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', lineHeight: 1.7 }}>
                본 사이트는 개인이 운영하는 무료 팬메이드 서비스입니다. 후원은 별도의 혜택이 없는 순수 자발적 참여이며, 보내주신 후원금은 서비스 유지 및 관리에 전액 사용됩니다.
              </p>
            </div>
          </div>
        </div>

        {/* ── Confirm Button ── */}
        <button className="guide-confirm-btn" onClick={handleClose}>
          닫기
        </button>
      </div>
    </div>
  );
}
