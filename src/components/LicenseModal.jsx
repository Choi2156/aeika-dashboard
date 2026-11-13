import { X, ShieldAlert } from 'lucide-react';
import ModalShell from './common/ModalShell';
import '../styles/components.css';

/**
 * LicenseModal — 저작권, 면책 조항 및 오픈소스/폰트 라이선스 안내 모달 (v1.3.0)
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
                  1. 게임 저작권 및 상표권 안내
                </div>
                <p className="guide-section-text">
                  대시보드에 사용된 캐릭터 이미지, 공식 아트워크, 아이콘 및 로고의 저작권과 상표권은 각 개발사 및 퍼블리셔에 있습니다.
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
                  본 사이트는 이용자 편의를 위해 제작된 비영리 팬메이드 서비스로, 공식 게임사와 직접적인 제휴 관계가 없습니다.
                </p>
              </div>

              <div className="guide-section">
                <div className="guide-section-heading">
                  2. 일정 산출 기준 및 면책 안내
                </div>
                <p className="guide-section-text">
                  <strong>[확정]</strong> 일정은 각 게임의 공식 공지와 특별 방송을 바탕으로 등록하며,{' '}
                  <strong>[예상]</strong> 일정은 통상 업데이트 주기를 기준으로 산출한 추정치입니다.
                </p>
                <p className="guide-section-text">
                  개발사 일정 변경이나 점검 시간 조정으로 실제 인게임 일정과 차이가 날 수 있으니, 과금이나 주요 재화 사용 전에는 게임 내 공식 공지를 꼭 확인해 주세요.
                </p>
              </div>

              <div className="guide-section">
                <div className="guide-section-heading">
                  3. 오픈소스 및 폰트 라이선스
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
                <div className="guide-section-heading">4. 운영 및 후원 안내</div>
                <p className="guide-section-text">
                  본 서비스는 광고 없이 운영하는 무료 팬 사이트입니다. 보내주신 자율 후원은 별도의 유료 기능이나 대가 없이 도메인·서버 유지 및 데이터 관리에 사용됩니다.
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
