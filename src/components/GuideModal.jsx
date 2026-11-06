import { useState, useEffect } from 'react';
import { X, Info, Video, ExternalLink } from 'lucide-react';
import { trackOutboundLink, trackGuideTabSwitch } from '../utils/analytics';
import ModalShell from './common/ModalShell';
import '../styles/components.css';

/**
 * GuideModal — 대시보드 이용 안내서 및 패치 노트 (v2.0 ModalShell 통합)
 */
export default function GuideModal({ isOpen, onClose, patchNotes = [] }) {
  const [activeTab, setActiveTab] = useState('guide');

  useEffect(() => {
    if (isOpen) setActiveTab('guide');
  }, [isOpen]);

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      modalKey="guide"
      dialogClassName="modal-body modal-body--guide"
    >
      {({ requestClose }) => (
        <>
          <div className="guide-header">
            <div className="guide-header-title">
              <Info size={18} className="guide-title-icon" />
              <span>이용 안내 및 업데이트 내역</span>
            </div>
            <button className="modal-close-btn" onClick={requestClose} aria-label="닫기">
              <X size={18} />
            </button>
          </div>

          <div className="guide-modal__tabs">
            <button
              type="button"
              className={`guide-modal__tab ${
                activeTab === 'guide' ? 'guide-modal__tab--active' : ''
              }`}
              onClick={() => {
                trackGuideTabSwitch('guide');
                setActiveTab('guide');
              }}
            >
              이용 안내
            </button>
            <button
              type="button"
              className={`guide-modal__tab ${
                activeTab === 'patches' ? 'guide-modal__tab--active' : ''
              }`}
              onClick={() => {
                trackGuideTabSwitch('patches');
                setActiveTab('patches');
              }}
            >
              패치 노트
            </button>
          </div>

          <div className="guide-content">
            {activeTab === 'guide' && (
              <div className="guide-sections">
                <div className="guide-video-banner">
                  <div className="guide-video-banner__body">
                    <div className="guide-video-banner__icon-wrap">
                      <Video size={18} />
                    </div>
                    <div className="guide-video-banner__text-group">
                      <h4 className="guide-video-banner__title">대시보드 활용 가이드 영상</h4>
                      <p className="guide-video-banner__desc">
                        주요 기능과 일정 확인 방법을 영상으로 안내합니다.
                      </p>
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

                <div className="guide-section">
                  <div className="guide-section-heading">
                    1. 실시간 5대 게임 브리핑 & 3가지 일정 보기 모드
                  </div>
                  <ul className="guide-bullet-list">
                    <li>
                      <strong>상단 실시간 상태 스트립:</strong> 현재 진행 중인 버전 진행률과 가장 임박한 다음 일정(방송·후반 전환·업데이트)의 D-Day를 한눈에 비교합니다.
                    </li>
                    <li>
                      <strong>기간 표 (간트 차트):</strong> 게임별 버전 업데이트와 전·후반 픽업 기간이 겹치는 구간을 연·월 타임라인으로 비교합니다.
                    </li>
                    <li>
                      <strong>월간 달력:</strong> 좌측 7열 달력 그리드와 우측 상세 인스펙터 패널을 통해 한 달간의 마일스톤을 직관적으로 확인합니다.
                    </li>
                    <li>
                      <strong>상세 일정:</strong> 유형별 필터와 키워드 검색을 지원하는 날짜순 아젠다 리스트로 전체 일정을 탐색합니다.
                    </li>
                  </ul>
                </div>

                <div className="guide-section">
                  <div className="guide-section-heading">
                    2. 시간대 및 버전 마감일 표기 기준
                  </div>
                  <ul className="guide-bullet-list">
                    <li>모든 일정 및 D-Day 연산은 한국 표준시(KST, UTC+9) 기준입니다.</li>
                    <li>
                      버전 마감일은 차기 버전 시작일과 막대가 겹치지 않도록{' '}
                      <strong>패치 전날</strong>을 기준으로 표기합니다.
                    </li>
                  </ul>
                </div>

                <div className="guide-section">
                  <div className="guide-section-heading">3. 확정 및 예상 일정 구분</div>
                  <ul className="guide-bullet-list">
                    <li>
                      <strong>[확정]:</strong> 공식 공지 및 특별 방송을 통해 발표된 일정입니다.
                    </li>
                    <li>
                      <strong>[예상]:</strong> 각 게임의 통상 업데이트 주기를 바탕으로 산출된 예상 일정(점선 테두리)이며, 공식 발표에 따라 변경될 수 있습니다.
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
                      className={`patch-note-card ${
                        index === 0 ? 'patch-note-card--latest' : ''
                      }`}
                    >
                      <div className="patch-note-card__header">
                        <div className="patch-note-card__badge-group">
                          <span className="patch-note-card__version">{note.version}</span>
                          {index === 0 && (
                            <span className="patch-note-card__latest-badge">LATEST</span>
                          )}
                        </div>
                        <span className="patch-note-card__date">{note.date}</span>
                      </div>
                      <h4 className="patch-note-card__title">{note.title}</h4>
                      <ul className="patch-note-card__changes">
                        {note.changes?.map((change, idx) => (
                          <li key={idx} className="patch-note-card__change-item">
                            {change}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <button type="button" className="guide-confirm-btn" onClick={requestClose}>
            닫기
          </button>
        </>
      )}
    </ModalShell>
  );
}
