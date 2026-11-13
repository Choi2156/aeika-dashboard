import { X, Smartphone, Monitor, Share, Download, CheckCircle2 } from 'lucide-react';
import ModalShell from './common/ModalShell';
import '../styles/components.css';

/**
 * InstallModal — 브라우저 앱 설치(PWA) 안내 모달
 */
export default function InstallModal({
  isOpen,
  onClose,
  canNativePrompt,
  platform = 'desktop',
  onNativeInstall,
}) {
  const handleDirectInstall = async () => {
    if (!onNativeInstall) return;
    const res = await onNativeInstall();
    if (res?.outcome === 'accepted') {
      onClose?.();
    }
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      modalKey="install"
      dialogClassName="modal-body modal-body--guide"
    >
      {({ requestClose }) => (
        <>
          <div className="guide-header">
            <div className="guide-header-title">
              <Smartphone size={18} className="guide-title-icon" />
              <span>앱으로 설치하기</span>
            </div>
            <button className="modal-close-btn" onClick={requestClose} aria-label="닫기">
              <X size={18} />
            </button>
          </div>

          <div className="guide-content">
            <div className="guide-sections">
              {canNativePrompt && (
                <div className="install-prompt-banner">
                  <div className="install-prompt-banner__text">
                    <strong>원클릭 설치 가능</strong>
                    <span>지금 브라우저에서 바로 전용 앱 창으로 설치할 수 있습니다.</span>
                  </div>
                  <button
                    type="button"
                    className="install-prompt-banner__btn"
                    onClick={handleDirectInstall}
                  >
                    <Download size={14} />
                    <span>지금 설치</span>
                  </button>
                </div>
              )}

              <div className="guide-section">
                <div className="guide-section-heading">
                  <Monitor size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '6px' }} />
                  PC (Chrome / Edge)
                </div>
                <ul className="guide-bullet-list">
                  <li>
                    상단 주소창 오른쪽 끝의 <strong>앱 설치(화면+화살표)</strong> 아이콘을 클릭한 뒤 <strong>설치</strong>를 누릅니다.
                  </li>
                  <li>
                    아이콘이 보이지 않으면 브라우저 우측 상단 메뉴(<code>⋮</code> 또는 <code>⋯</code>) ➔ <strong>전송, 저장 및 공유 / 앱</strong> ➔ <strong>페이지를 앱으로 설치</strong>를 선택하세요.
                  </li>
                </ul>
              </div>

              <div className="guide-section">
                <div className="guide-section-heading">
                  <Smartphone size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '6px' }} />
                  Android (Chrome / 삼성 인터넷){platform === 'android' ? ' · 현재 기기' : ''}
                </div>
                <ul className="guide-bullet-list">
                  <li>
                    우측 상단·하단 메뉴(<code>⋮</code> 또는 <code>≡</code>) ➔ <strong>앱 설치</strong> 또는 <strong>현재 페이지 추가 ➔ 홈 화면</strong>을 선택합니다.
                  </li>
                  <li>
                    인앱 브라우저(카카오톡 등)에서는 먼저 <strong>다른 브라우저로 열기(Chrome)</strong> 후 진행해 주세요.
                  </li>
                </ul>
              </div>

              <div className="guide-section">
                <div className="guide-section-heading">
                  <Share size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '6px' }} />
                  iPhone / iPad (Safari){platform === 'ios' ? ' · 현재 기기' : ''}
                </div>
                <ul className="guide-bullet-list">
                  <li>
                    Safari 하단(또는 상단)의 <strong>공유 버튼(네모+위 화살표)</strong>을 탭합니다.
                  </li>
                  <li>
                    메뉴를 내려 <strong>홈 화면에 추가</strong> ➔ 우측 상단 <strong>추가</strong>를 누르면 바탕화면에 앱 아이콘이 생성됩니다.
                  </li>
                </ul>
              </div>

              <div className="toonation-notice-box">
                <p className="toonation-notice-text">
                  <CheckCircle2
                    size={13}
                    style={{ display: 'inline', verticalAlign: '-2px', marginRight: '5px' }}
                  />
                  설치 후에도 일정 데이터는 항상 최신 서버 기준으로 실시간 반영됩니다.
                </p>
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
