import { X, Heart, CheckCircle2 } from 'lucide-react';
import { trackOutboundLink } from '../utils/analytics';
import ModalShell from './common/ModalShell';
import '../styles/components.css';

/**
 * SupportModal — 대시보드 투네이션(Toonation) 후원 연동 모달 (v2.0 ModalShell 통합)
 */
export default function SupportModal({ isOpen, onClose }) {
  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      modalKey="support"
      dialogClassName="modal-body modal-body--guide modal-body--support-toonation"
    >
      {({ requestClose }) => (
        <>
          <div className="guide-header">
            <div className="guide-header-title">
              <Heart size={18} className="guide-title-icon" />
              <span>후원하기</span>
            </div>
            <button className="modal-close-btn" onClick={requestClose} aria-label="닫기">
              <X size={18} />
            </button>
          </div>

          <div className="guide-content">
            <div className="toonation-sponsor-container">
              <div className="toonation-sponsor-body">
                <p className="toonation-sponsor-text">
                  보내주신 후원은 사이트 유지와 데이터 관리에 소중히 사용됩니다.
                </p>

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
                        targetUrl:
                          'https://toon.at/donate/7Jmmxh-h32zRAHNKPegc0zgJ60v3fKmsfcHJBbisO_M',
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
                    <CheckCircle2
                      size={13}
                      style={{ display: 'inline', verticalAlign: '-2px', marginRight: '5px' }}
                    />
                    모든 기능은 후원 여부와 관계없이 항상 무료로 제공됩니다.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <button type="button" className="guide-confirm-btn" onClick={requestClose}>
            닫기
          </button>
        </>
      )}
    </ModalShell>
  );
}
