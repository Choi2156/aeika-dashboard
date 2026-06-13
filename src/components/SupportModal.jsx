import { useEffect, useRef } from 'react';
import { X, Heart, Coffee, ExternalLink } from 'lucide-react';
import '../styles/components.css';

/**
 * SupportModal — 대시보드 크티(Ctee) 후원 연동 모달
 *
 * Props:
 *   isOpen  – boolean
 *   onClose – Callback to close the modal
 */
export default function SupportModal({ isOpen, onClose }) {
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
    window.history.pushState({ modal: 'support' }, '');
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
    if (window.history.state && window.history.state.modal === 'support') {
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
      <div className="modal-body modal-body--guide modal-body--support-ctee">
        {/* ── Header ── */}
        <div className="guide-header">
          <div className="guide-header-title">
            <Coffee size={20} className="guide-title-icon" style={{ color: 'var(--accent-purple, #a78bfa)' }} />
            <span>개발자에게 커피 사주기</span>
          </div>
          <button
            className="modal-close-btn"
            onClick={handleClose}
            aria-label="닫기"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Content ── */}
        <div className="guide-content">
          <div className="ctee-sponsor-container">
            <div className="ctee-sponsor-brand">
              <Heart size={32} className="ctee-brand-icon" />
              <h4>애이카 아카이브 응원하기</h4>
              <span className="ctee-brand-badge">크티 (Ctee)</span>
            </div>

            <div className="ctee-sponsor-body">
              <p className="ctee-sponsor-text">
                여러분의 소중한 후원은 대시보드의 지속적인 <strong>개발 및 유지보수(주로 AI 토큰 비용)</strong>와 개발자의 <strong>카페인 보충</strong>에 소중히 사용됩니다.
              </p>

              <div className="ctee-notice-box">
                <span className="ctee-notice-title">💡 안내 사항</span>
                <p className="ctee-notice-text">
                  어디까지나 원활한 서비스를 위한 후원 기능입니다. 사이트의 모든 기능은 제한 없이 100% 무료로 제공되며, 본 후원 기능은 오직 자발적인 팁의 형태로만 존재합니다.
                </p>
              </div>
            </div>

            {/* Ctee Link Button */}
            <div className="ctee-action-area">
              <a
                href="https://ctee.kr/place/aeika215/donation" 
                target="_blank"
                rel="noopener noreferrer"
                className="ctee-sponsor-btn"
                title="크티(Ctee) 페이지로 이동하여 후원하기"
              >
                <span>크티 후원 페이지 바로가기</span>
                <ExternalLink size={14} className="ctee-btn-icon" />
              </a>
              <span className="ctee-action-help">
                ※ 위 버튼을 누르면 크티 후원 페이지로 안전하게 이동하며,<br />
                해당 페이지의 <strong>[응원하기]</strong> 버튼을 통해 자발적인 후원이 가능합니다.
              </span>
            </div>
          </div>
        </div>

        {/* ── Footer Button ── */}
        <button className="guide-confirm-btn" onClick={handleClose}>
          닫기
        </button>
      </div>
    </div>
  );
}
