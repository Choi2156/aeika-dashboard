import { useState, useEffect, useRef } from 'react';
import { X, Info, Video, ExternalLink } from 'lucide-react';
import { trackOutboundLink, trackGuideTabSwitch } from '../utils/analytics';
import '../styles/components.css';

/**
 * GuideModal — 대시보드 이용 안내서 및 패치 노트
 *
 * Props:
 *   isOpen     – boolean
 *   onClose    – Callback to close the modal
 *   patchNotes – Array of patch notes from json database
 */
export default function GuideModal({ isOpen, onClose, patchNotes = [] }) {
  const overlayRef = useRef(null);
  const closingRef = useRef(false);
  const [activeTab, setActiveTab] = useState('guide'); // 'guide' | 'patches'

  /* 모달이 열릴 때마다 탭을 항상 기본 '이용 안내' 탭으로 리셋 */
  useEffect(() => {
    if (isOpen) {
      setActiveTab('guide');
    }
  }, [isOpen]);

  /* ── Entry animation ── */
  useEffect(() => {
    if (!isOpen) return;
    closingRef.current = false;
    const frame = requestAnimationFrame(() => {
      if (overlayRef.current) {
        overlayRef.current.classList.add('modal-visible');
      }
    });

    // 브라우저 뒤로가기 시 모달만 닫히도록 히스토리 상태 주입
    window.history.pushState({ modal: 'guide' }, '');
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
    if (window.history.state && window.history.state.modal === 'guide') {
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
      <div className="modal-body modal-body--guide">
        {/* ── Header ── */}
        <div className="guide-header">
          <div className="guide-header-title">
            <Info size={20} className="guide-title-icon" />
            이용 안내
          </div>
          <button
            className="modal-close-btn"
            onClick={handleClose}
            aria-label="닫기"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Tabs 스위처 바 ── */}
        <div className="guide-modal__tabs">
          <button 
            className={`guide-modal__tab ${activeTab === 'guide' ? 'guide-modal__tab--active' : ''}`}
            onClick={() => {
              trackGuideTabSwitch('guide');
              setActiveTab('guide');
            }}
          >
            이용 안내
          </button>
          <button 
            className={`guide-modal__tab ${activeTab === 'patches' ? 'guide-modal__tab--active' : ''}`}
            onClick={() => {
              trackGuideTabSwitch('patches');
              setActiveTab('patches');
            }}
          >
            패치 노트
          </button>
        </div>

        {/* ── Scrollable Content ── */}
        <div className="guide-content">
          {activeTab === 'guide' && (
            <div className="guide-sections">
              {/* 📺 동영상 대시보드 튜토리얼 퀵배너 */}
              <div className="guide-video-banner">
                <div className="guide-video-banner__body">
                  <div className="guide-video-banner__icon-wrap">
                    <Video size={20} />
                  </div>
                  <div className="guide-video-banner__text-group">
                    <h4 className="guide-video-banner__title">대시보드 가이드 영상</h4>
                    <p className="guide-video-banner__desc">주요 기능과 활용 팁을 정리한 영상입니다.</p>
                  </div>
                </div>
                <a 
                  href="https://youtu.be/YrVYqVkYFs8" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="guide-video-banner__btn"
                  onClick={() => {
                    trackOutboundLink({
                      linkCategory: 'guide_video',
                      platform: 'youtube',
                      targetUrl: 'https://youtu.be/YrVYqVkYFs8',
                      title: '대시보드 튜토리얼 가이드 영상',
                    });
                  }}
                >
                  <span>영상 보기</span>
                  <ExternalLink size={12} />
                </a>
              </div>

              {/* Section 1 */}
              <div className="guide-section">
                <div className="guide-section-heading">
                  1. 시간대 및 버전 마감 기준
                </div>
                <ul className="guide-bullet-list">
                  <li>모든 일정은 한국 시간(KST) 기준입니다.</li>
                  <li>버전 마감일은 차기 업데이트 시작일과 겹치지 않도록 '패치 전날'을 기준으로 표기합니다. (게임마다 점검 시간과 픽업 종료 시점이 제각각인 점을 고려한 기준입니다.)</li>
                </ul>
              </div>

              {/* Section 2 */}
              <div className="guide-section">
                <div className="guide-section-heading">
                  2. 확정 및 예상 일정
                </div>
                <ul className="guide-bullet-list">
                  <li><strong>[확정]:</strong> 공식 공지를 확인한 후 등록한 일정입니다.</li>
                  <li><strong>[예상]:</strong> 각 게임의 통상 패치 주기를 바탕으로 계산한 예상치이며, 공식 발표에 따라 변동될 수 있습니다.</li>
                </ul>
              </div>

              {/* Section 3 */}
              <div className="guide-section">
                <div className="guide-section-heading">
                  3. 조작 방법
                </div>
                <ul className="guide-bullet-list">
                  <li>각 게임 행을 클릭하면 해당 게임 일정을 접거나 펼칠 수 있습니다.</li>
                  <li>타임라인의 일정을 클릭하면 상세 정보와 관련 이미지를 볼 수 있습니다.</li>
                </ul>
              </div>

              {/* Section 4 */}
              <div className="guide-section">
                <div className="guide-section-heading">
                  4. 설정 저장 안내
                </div>
                <ul className="guide-bullet-list">
                  <li>'설정 저장'을 켜면 선택한 게임 필터와 테마 설정이 현재 브라우저에 저장됩니다.</li>
                  <li>'설정 저장'을 끄면 저장된 브라우저 데이터가 즉시 삭제됩니다.</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'patches' && (
            <div className="patch-notes-list">
              {patchNotes.length === 0 ? (
                <p className="patch-notes-empty">기록된 업데이트 이력이 없습니다.</p>
              ) : (
                patchNotes.map((note, index) => (
                  <div 
                    key={note.version} 
                    className={`patch-note-card ${index === 0 ? 'patch-note-card--latest' : ''}`}
                  >
                    <div className="patch-note-card__header">
                      <div className="patch-note-card__badge-group">
                        <span className="patch-note-card__version">{note.version}</span>
                        {index === 0 && <span className="patch-note-card__latest-badge">LATEST</span>}
                      </div>
                      <span className="patch-note-card__date">{note.date}</span>
                    </div>
                    <h4 className="patch-note-card__title">{note.title}</h4>
                    <ul className="patch-note-card__changes">
                      {note.changes?.map((change, idx) => (
                        <li key={idx} className="patch-note-card__change-item">{change}</li>
                      ))}
                    </ul>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* ── Confirm Button ── */}
        <button className="guide-confirm-btn" onClick={handleClose}>
          닫기
        </button>
      </div>
    </div>
  );
}
