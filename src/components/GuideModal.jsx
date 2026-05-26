import { useState, useEffect, useRef } from 'react';
import { X, Info, Video, ExternalLink } from 'lucide-react';
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
    return () => cancelAnimationFrame(frame);
  }, [isOpen]);

  /* ── Close with exit animation ── */
  const handleClose = () => {
    if (closingRef.current) return;
    closingRef.current = true;
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
            <Info size={20} className="guide-title-icon" />
            대시보드 안내 및 이력
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
            onClick={() => setActiveTab('guide')}
          >
            이용 안내
          </button>
          <button 
            className={`guide-modal__tab ${activeTab === 'patches' ? 'guide-modal__tab--active' : ''}`}
            onClick={() => setActiveTab('patches')}
          >
            패치 노트
          </button>
        </div>

        {/* ── Scrollable Content ── */}
        <div className="guide-content">
          {activeTab === 'guide' && (
            <div className="guide-sections">
              {/* 📺 신설: 동영상 대시보드 튜토리얼 퀵배너 */}
              <div className="guide-video-banner">
                <div className="guide-video-banner__body">
                  <div className="guide-video-banner__icon-wrap">
                    <Video size={20} />
                  </div>
                  <div className="guide-video-banner__text-group">
                    <span className="guide-video-banner__label">TUTORIAL VIDEO</span>
                    <h4 className="guide-video-banner__title">대시보드 200% 활용 가이드 영상</h4>
                    <p className="guide-video-banner__desc">캘린더 조작법부터 스마트 알림, 예상 일정 알고리즘의 원리까지 한 번에 쉽게 이해하세요!</p>
                  </div>
                </div>
                <a 
                  href="https://youtu.be/YrVYqVkYFs8" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="guide-video-banner__btn"
                >
                  <span>영상 보러가기</span>
                  <ExternalLink size={12} />
                </a>
              </div>
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
          확인했습니다
        </button>
      </div>
    </div>
  );
}
