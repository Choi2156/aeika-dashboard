import { useEffect, useRef } from 'react';
import { X, Heart } from 'lucide-react';
import { trackOutboundLink } from '../utils/analytics';
import '../styles/components.css';

/**
 * SupportModal — 대시보드 투네이션(Toonation) 후원 연동 모달
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
      <div className="modal-body modal-body--guide modal-body--support-toonation">
        {/* ── Header ── */}
        <div className="guide-header">
          <div className="guide-header-title">
            <Heart size={20} className="guide-title-icon" style={{ color: 'var(--accent-sky, #38bdf8)' }} />
            <span>후원하기</span>
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
          <div className="toonation-sponsor-container">
            <div className="toonation-sponsor-body">
              <p className="toonation-sponsor-text">
                보내주신 후원은 사이트 유지와 데이터 관리에 소중히 사용됩니다.
              </p>

              {/* QR Code Card */}
              <div className="toonation-qr-card">
                <a
                  href="https://toon.at/donate/7Jmmxh-h32zRAHNKPegc0zgJ60v3fKmsfcHJBbisO_M"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="toonation-qr-wrapper"
                  title="투네이션 후원 페이지 바로가기"
                  onClick={() => {
                    trackOutboundLink({
                      linkCategory: 'donation',
                      platform: 'toonation',
                      targetUrl: 'https://toon.at/donate/7Jmmxh-h32zRAHNKPegc0zgJ60v3fKmsfcHJBbisO_M',
                      title: '투네이션 후원 QR 클릭',
                    });
                  }}
                >
                  <img
                    src="./assets/toonation_qr.png"
                    alt="투네이션 후원 QR 코드"
                    className="toonation-qr-img"
                    loading="lazy"
                  />
                </a>
              </div>

              <div className="toonation-notice-box">
                <p className="toonation-notice-text">
                  💡 모든 기능은 후원 여부와 관계없이 항상 무료로 제공됩니다.
                </p>
              </div>
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
