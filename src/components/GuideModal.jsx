import { useEffect, useRef } from 'react';
import { X, Info } from 'lucide-react';
import '../styles/components.css';

/**
 * GuideModal — 대시보드 이용 안내서
 *
 * Props:
 *   isOpen  – boolean
 *   onClose – Callback to close the modal
 */
export default function GuideModal({ isOpen, onClose }) {
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
            <Info size={20} className="guide-title-icon" />
            대시보드 이용 안내서
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
              <div className="guide-section-heading">
                🌐 1. 서비스 글로벌 기준 (KST)
              </div>
              <p className="guide-section-text">
                본 대쉬보드는 파편화된 해외 및 글로벌 서브컬쳐 게임들의 주요
                타임라인을 통합 제공합니다. 서버 시차로 인한 혼선을 원천 방지하기
                위해 모든 일정의 활성화 및 표기 기준점은 한국 서버(KST)
                표준시를 절대 원칙으로 삼습니다.
              </p>
            </div>

            {/* Section 2 */}
            <div className="guide-section">
              <div className="guide-section-heading">
                ⚠️ 2. 데이터 출처 및 무결성 공지 (수동 관리 방식)
              </div>
              <p className="guide-section-text">
                차트 내 [확정] 마커가 활성화된 일정은 제조사 오피셜 공지를 확인 후
                관리자가 직접 수동으로 데이터를 검증 및 주입하는 방식으로
                운영됩니다. 중요 집행 전에는 공식 공지를 반드시 크로스
                체크하시기 바랍니다.
              </p>
            </div>

            {/* Section 3 */}
            <div className="guide-section">
              <div className="guide-section-heading">
                🔮 3. 시스템 예측(예상) 스케줄 메커니즘
              </div>
              <p className="guide-section-text">
                [예상] 마커 일정은 시스템 알고리즘 연산 결과입니다. 각 게임 제조사
                고유의 정규 패치 사이클 상수를 대입하여 산출하므로, 대형 명절이나
                돌발 연기 변수가 생길 경우 실제 공지와 차이가 발생할 수
                있습니다.
              </p>
            </div>

            {/* Section 4 */}
            <div className="guide-section">
              <div className="guide-section-heading">
                📊 4. 간트 차트 및 인터페이스 조작법
              </div>
              <ul className="guide-bullet-list">
                <li>
                  버전/후반 업데이트 구조화 — 각 게임의 메이저 버전 업데이트와
                  후반 업데이트가 타임라인에 구조적으로 구분 표시됩니다.
                </li>
                <li>
                  공식 방송 플래그 — 제조사의 공식 특별 방송 일정이 별도 마커로
                  차트에 표시됩니다.
                </li>
                <li>
                  게임 토글 접기 — 게임별 행을 토글하여 관심 있는 게임만
                  선택적으로 펼치거나 접을 수 있습니다.
                </li>
                <li>
                  상세 정보 팝업 및 이미지 복구 — 각 이벤트 막대를 클릭하면 상세
                  팝업이 열리며 관련 이미지와 메타데이터를 확인할 수 있습니다.
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* ── Confirm Button ── */}
        <button className="guide-confirm-btn" onClick={handleClose}>
          확인했습니다
        </button>
      </div>
    </div>
  );
}
