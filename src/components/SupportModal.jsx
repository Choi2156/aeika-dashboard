import { useEffect, useRef } from 'react';
import { X, Heart, Coffee, ExternalLink } from 'lucide-react';
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
            <Coffee size={20} className="guide-title-icon" style={{ color: 'var(--accent-sky, #38bdf8)' }} />
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
          <div className="toonation-sponsor-container">
            <div className="toonation-sponsor-brand">
              <Heart size={30} className="toonation-brand-icon" />
              <h4>애이카 아카이브 응원하기</h4>
              <span className="toonation-brand-badge">투네이션 (Toonation)</span>
            </div>

            <div className="toonation-sponsor-body">
              <p className="toonation-sponsor-text">
                보내주신 후원은 사이트 유지와 데이터 관리에 소중히 사용됩니다.
              </p>

              {/* QR Code Section */}
              <div className="toonation-qr-card">
                <div className="toonation-qr-wrapper">
                  <img
                    src="./assets/toonation_qr.png"
                    alt="투네이션 후원 QR 코드"
                    className="toonation-qr-img"
                    loading="lazy"
                  />
                </div>
                <span className="toonation-qr-caption">
                  스마트폰 카메라로 QR 코드를 스캔하면 간편결제 창으로 바로 연결됩니다.
                </span>
                <div className="toonation-payment-methods">
                  <span className="toonation-method-tag">네이버페이</span>
                  <span className="toonation-method-tag">카카오페이</span>
                  <span className="toonation-method-tag">토스페이</span>
                  <span className="toonation-method-tag">신용/체크카드</span>
                  <span className="toonation-method-tag">휴대폰</span>
                </div>
              </div>

              {/* Toonation Link Button */}
              <div className="toonation-action-area">
                <a
                  href="https://toon.at/donate/7Jmmxh-h32zRAHNKPegc0zgJ60v3fKmsfcHJBbisO_M" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="toonation-sponsor-btn"
                  title="투네이션(Toonation) 페이지로 이동하여 후원하기"
                  onClick={() => {
                    trackOutboundLink({
                      linkCategory: 'donation',
                      platform: 'toonation',
                      targetUrl: 'https://toon.at/donate/7Jmmxh-h32zRAHNKPegc0zgJ60v3fKmsfcHJBbisO_M',
                      title: '투네이션 후원 페이지 바로가기',
                    });
                  }}
                >
                  <span>투네이션 후원 페이지 바로가기</span>
                  <ExternalLink size={14} className="toonation-btn-icon" />
                </a>
                <span className="toonation-action-help">
                  ※ 위 버튼을 누르면 투네이션 안전 결제 페이지로 이동하며,<br />
                  네이버/카카오/토스페이 등 원하시는 수단으로 자발적인 후원이 가능합니다.
                </span>
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
