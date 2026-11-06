import { X, ShieldAlert } from 'lucide-react';
import ModalShell from './common/ModalShell';
import '../styles/components.css';

/**
 * LicenseModal — 저작권, 면책 조항 및 오픈소스/폰트 라이선스 상세 모달 (v2.0 ModalShell 통합)
 */
export default function LicenseModal({ isOpen, onClose }) {
  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      modalKey="license"
      dialogClassName="modal-body modal-body--guide"
    >
      {({ requestClose }) => (
        <>
          <div className="guide-header">
            <div className="guide-header-title">
              <ShieldAlert size={18} className="guide-title-icon" />
              <span>저작권 · 면책 · 라이선스 안내</span>
            </div>
            <button className="modal-close-btn" onClick={requestClose} aria-label="닫기">
              <X size={18} />
            </button>
          </div>

          <div className="guide-content">
            <div className="guide-sections">
              <div className="guide-section">
                <div className="guide-section-heading">
                  1. 게임 자산 저작권 및 상표권 안내
                </div>
                <p className="guide-section-text">
                  본 사이트에 사용된 모든 게임 캐릭터 이미지, 공식 아트워크, 아이콘, 로고 및 상표권에 대한 모든 지적재산권은 각 원제작사 및 공식 퍼블리셔에 귀속됩니다.
                </p>
                <div className="disclaimer-copyrights">
                  <div>
                    • © COGNOSPHERE. All Rights Reserved. (원신 / 붕괴: 스타레일 / 젠레스 존 제로)
                  </div>
                  <div>• © KURO GAMES. ALL RIGHTS RESERVED. (명조: 워더링 웨이브)</div>
                  <div>
                    • © GRYPHLINE / HYPERGRYPH. All Rights Reserved. (명일방주: 엔드필드)
                  </div>
                </div>
                <p className="guide-section-text">
                  본 대시보드는 게임 이용자의 편의를 위해 제작된 비영리·비공식 팬메이드 아카이브이며, 공식 게임사와 직접적인 제휴 관계가 없습니다.
                </p>
              </div>

              <div className="guide-section">
                <div className="guide-section-heading">
                  2. 일정 산출 기준 및 면책 조항
                </div>
                <p className="guide-section-text">
                  <strong>[확정]</strong> 표기 일정은 각 게임의 공식 라운지·카페·특별 방송 공지를 바탕으로 등록된 일정이며,{' '}
                  <strong>[예상]</strong> 표기 일정은 각 게임의 통상 업데이트 주기를 기반으로 자동 산출된 추정치입니다.
                </p>
                <p className="guide-section-text">
                  개발사 사정에 따른 버전 단축·연장, 점검 시간 변경 또는 수기 입력 오차로 인해 실제 인게임 일정과 차이가 발생할 수 있으므로, 과금 및 주요 재화 소모 전에는 반드시 게임 내 공식 공지를 확인하시기 바랍니다.
                </p>
              </div>

              <div className="guide-section">
                <div className="guide-section-heading">
                  3. 오픈소스 소프트웨어 및 폰트 라이선스
                </div>
                <ul className="guide-bullet-list">
                  <li>
                    <strong>웹 애플리케이션 소스코드:</strong> MIT License (© 2026 AEIKA ARCHIVE)
                  </li>
                  <li>
                    <strong>프론트엔드 코어 및 아이콘:</strong> React (MIT License), Vite (MIT License), Lucide Icons (ISC License)
                  </li>
                  <li>
                    <strong>웹 폰트 (Google Fonts):</strong> Inter (SIL OFL 1.1), Noto Sans KR (SIL OFL 1.1)
                  </li>
                  <li>
                    <strong>월간 달력 이미지 생성용 폰트:</strong> Pretendard (SIL OFL 1.1)
                  </li>
                </ul>
              </div>

              <div className="guide-section">
                <div className="guide-section-heading">4. 후원 및 운영 안내</div>
                <p className="guide-section-text">
                  본 서비스는 광고 없이 개인이 운영하는 무료 팬 사이트입니다. 후원은 별도의 유료 기능이나 대가가 따르지 않는 자발적 응원이며, 보내주신 후원금은 도메인·트래픽 및 아카이브 유지 관리에 사용됩니다.
                </p>
              </div>
            </div>
          </div>

          <button type="button" className="guide-confirm-btn" onClick={requestClose}>
            확인
          </button>
        </>
      )}
    </ModalShell>
  );
}
