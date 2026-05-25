import { useEffect, useRef } from 'react';
import { X, ShieldAlert } from 'lucide-react';
import '../styles/components.css';

/**
 * LicenseModal — 저작권, 면책 조항 및 라이선스 상세 모달
 */
export default function LicenseModal({ isOpen, onClose }) {
  const overlayRef = useRef(null);
  const closingRef = useRef(false);

  /* ── Entry animation ── */
  useEffect(() => {
    if (!isOpen) return;
    closingRef.current = false;
    const frame = requestAnimationFrame(() => {
      if (overlayRef.current) {
        overlayRef.current.classList.add('modal-visible');
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [isOpen]);

  /* ── Close with exit animation ── */
  const handleClose = () => {
    if (closingRef.current) return;
    closingRef.current = true;
    const overlay = overlayRef.current;
    if (overlay) {
      overlay.classList.remove('modal-visible');
      const onEnd = () => {
        overlay.removeEventListener('transitionend', onEnd);
        onClose();
      };
      overlay.addEventListener('transitionend', onEnd);
      // Fallback
      setTimeout(() => {
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
            <span>라이선스 및 면책조항 상세 고지</span>
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
                ⚖️ 1. 저작권 및 상표권 고지 (Copyright Notice)
              </div>
              <p className="guide-section-text" style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', lineHeight: 1.7 }}>
                본 대시보드 사이트에 수납 표시되는 모든 서브컬처 게임들의 캐릭터 일러스트, 정식 로고, 타이틀 상표권 및 기타 게임 콘텐츠 데이터의 소유권은 원제조사 및 공식 퍼블리셔사에 귀속됩니다.
              </p>
              <div className="disclaimer-copyrights" style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.68rem', color: 'var(--slate-500)', display: 'flex', flexDirection: 'column', gap: '3px', paddingLeft: '0.5rem', borderLeft: '2px solid rgba(255, 255, 255, 0.08)', marginTop: '0.25rem' }}>
                <div>• Copyright © COGNOSPHERE. All Rights Reserved. (원신 / 스타레일 / 젠존제)</div>
                <div>• Copyright © KURO GAMES. ALL RIGHTS RESERVED. (명조: 워더링 웨이브)</div>
                <div>• Copyright © GRYPHLINE / HYPERGRYPH. All Rights Reserved. (명일방주 / 엔드필드)</div>
              </div>
              <p className="guide-section-text" style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', lineHeight: 1.7, marginTop: '0.25rem' }}>
                본 대시보드는 정보 공유 및 게이머 커뮤니티 편의 제공을 최우선으로 기획된 비공식 팬 사이트이며, 권리자들의 지식재산권을 전적으로 침해하지 않고 존중합니다.
              </p>
            </div>

            {/* Section 2 */}
            <div className="guide-section">
              <div className="guide-section-heading" style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
                🔮 2. 데이터 예측 한계 및 면책 (Disclaimers)
              </div>
              <p className="guide-section-text" style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', lineHeight: 1.7 }}>
                대시보드 일정 내 <strong>[확정]</strong> 마크는 제조사 공식 채널 및 공지를 관리자가 직접 확인 후 반영한 팩트입니다. 
                반면 <strong>[예상]</strong> 마크 및 D-Day 타이머는 게임별 고유의 과거 업데이트 주기(예: 6주 패치 사이클, 3주차 후반 배너 등) 상수를 바탕으로 알고리즘이 예측하여 동적 계산한 예상 수치입니다.
              </p>
              <p className="guide-section-text" style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', lineHeight: 1.7, marginTop: '0.25rem' }}>
                제조사들의 예기치 못한 점검 지연, 공식 발표의 사후 번복, 명절 연휴로 인한 주기 조정 등으로 인해 실제 일정과 오차가 발생할 수 있습니다. 
                이에 따라 제공되는 일정 데이터의 완전한 신뢰성은 보증하지 않으며, 투자나 게임 이용 과정에서 발생하는 어떠한 직간접적인 피해 및 법적 결과에 대해서도 본 서비스는 책임지지 않습니다. 중요 일정은 공식 공지를 꼭 교차 확인하십시오.
              </p>
            </div>

            {/* Section 3 */}
            <div className="guide-section">
              <div className="guide-section-heading" style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
                📄 3. 오픈소스 라이선스 & 우회 CDN 호스팅
              </div>
              <p className="guide-section-text" style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', lineHeight: 1.7 }}>
                본 프로젝트의 프론트엔드 소스 코드는 <strong>MIT License</strong> 규격에 따라 무상 배포 및 수정이 가능합니다. 
                사이트 구축에 핵심으로 사용된 벡터 아이콘 셋은 Lucide Icons 오픈 라이선스 규정을 따르며, 타이포그래피 서체는 Google Fonts에서 배포하는 Outfit 폰트(OFL License)가 탑재되었습니다.
              </p>
              <p className="guide-section-text" style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', lineHeight: 1.7, marginTop: '0.25rem' }}>
                대시보드 기동 시 원활한 리소스 관리와 네트워크 트래픽 오버헤드를 극소화하기 위해, 스토리 영상 클립 등의 미디어 콘텐츠는 유튜브 임베디드 소스 방식의 우회 호스팅 구조를 적용하여 안전하게 구동됩니다.
              </p>
            </div>
          </div>
        </div>

        {/* ── Confirm Button ── */}
        <button className="guide-confirm-btn" onClick={handleClose}>
          동의 및 닫기
        </button>
      </div>
    </div>
  );
}
