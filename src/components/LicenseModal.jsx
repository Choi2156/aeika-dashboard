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
                🔮 2. 데이터 수집/예측 한계 및 면책 (Disclaimers)
              </div>
              <p className="guide-section-text" style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', lineHeight: 1.7 }}>
                대시보드 일정 내 <strong>[확정]</strong> 마크는 제조사 공식 채널 및 공지를 확인 후 수동으로 반영한 정보이나, 수동 입력 과정에서 오탈자나 오기입 등 휴먼 에러가 발생할 가능성이 존재합니다. 
                반면 <strong>[예상]</strong> 마크 및 D-Day 타이머는 과거 업데이트 주기를 바탕으로 알고리즘이 예측하여 계산한 예상치이므로 실제 배포 시점과 오차가 발생할 수 있습니다.
              </p>
              <p className="guide-section-text" style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', lineHeight: 1.7, marginTop: '0.25rem' }}>
                제조사의 예기치 못한 패치 일정 연기, 공식 발표의 사후 번복, 긴급 점검 등으로 인해 실제 일정과 오차가 발생할 수 있습니다. 
                따라서 제공되는 모든 일정 데이터의 완전한 신뢰성은 보증하지 않으며, 본 사이트의 정보를 참고하여 발생한 어떠한 직간접적인 손해나 법적 결과에 대해서도 책임을 지지 않습니다. 중요 이벤트 일정은 반드시 인게임 공식 공지사항을 교차 확인해 주시기 바랍니다.
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

            {/* Section 4 */}
            <div className="guide-section">
              <div className="guide-section-heading" style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
                ☕ 4. 자발적 후원금의 성격 및 사용처 (Sponsorship Policy)
              </div>
              <p className="guide-section-text" style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', lineHeight: 1.7 }}>
                본 대시보드는 이용자분들의 순수 자발적 참여로 제공되는 후원(크티) 채널을 운영하고 있습니다. 
                모든 후원금은 서비스 제공을 위한 <strong>실시간 API 조회 토큰 비용 보충, 기능 고도화 유지보수 및 개발자의 카페인 충전</strong>에 전액 소중히 사용됩니다.
              </p>
              <p className="guide-section-text" style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', lineHeight: 1.7, marginTop: '0.25rem' }}>
                후원은 오직 자발적인 응원 팁(Tip)의 형태로만 가동되며, 후원 여부에 따른 이용 권한 차등, 특정 기능 잠금(Paywall), 광고 제거 혜택 차별 등은 절대 존재하지 않습니다. 대시보드의 모든 기능은 로그인 여부와 무관하게 모든 분들께 상시 100% 무료로 개방됩니다.
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
