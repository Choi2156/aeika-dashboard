import { useState, useEffect } from 'react';
import { X, Info, Video, ExternalLink, Download } from 'lucide-react';
import { trackOutboundLink, trackGuideTabSwitch } from '../utils/analytics';
import ModalShell from './common/ModalShell';
import '../styles/components.css';

/**
 * GuideModal — 대시보드 이용 안내 및 패치 노트 (v1.3.0)
 */
export default function GuideModal({
  isOpen,
  onClose,
  patchNotes = [],
  onOpenInstall,
  isAppInstalled = false,
}) {
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
                        주요 기능과 화면 조작 방법을 짧은 영상으로 확인해 보세요.
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
                    1. 3가지 일정 보기 모드 & 주요 기능
                  </div>
                  <ul className="guide-bullet-list">
                    <li>
                      <strong>간트 차트:</strong> 게임별 버전 주기와 전·후반 픽업이 겹치는 구간을 가로 타임라인으로 비교합니다. 드래그·마우스 휠 이동과 주간 이동(±7일)을 지원합니다.
                    </li>
                    <li>
                      <strong>캘린더:</strong> 한 달간의 업데이트, 후반 픽업, 특별 방송, 오프라인 행사를 7열 달력에서 모아보고 고해상도 이미지로 저장할 수 있습니다.
                    </li>
                    <li>
                      <strong>타임라인:</strong> 다가오는 일정을 날짜순 세로 카드로 보여주며, 지난 일정 불러오기와 키워드 검색을 지원합니다.
                    </li>
                    <li>
                      <strong>상단 주요 일정 배너:</strong> 현재 진행 중이거나 7일 이내 시작되는 주요 일정을 상단 슬라이드에서 빠르게 브리핑합니다.
                    </li>
                  </ul>
                </div>

                <div className="guide-section">
                  <div className="guide-section-heading">
                    2. 시간대 및 버전 마감일 표기 기준
                  </div>
                  <ul className="guide-bullet-list">
                    <li>모든 일정과 D-Day 계산은 한국 표준시(KST, UTC+9) 기준입니다.</li>
                    <li>
                      버전 마감일은 다음 버전 시작일과 막대가 겹치지 않도록{' '}
                      <strong>패치 전날</strong>로 표기합니다.
                    </li>
                  </ul>
                </div>

                <div className="guide-section">
                  <div className="guide-section-heading">3. 확정 및 예상 일정 구분</div>
                  <ul className="guide-bullet-list">
                    <li>
                      <strong>[확정]:</strong> 공식 라운지·카페 공지 및 특별 방송으로 발표된 일정입니다.
                    </li>
                    <li>
                      <strong>[예상]:</strong> 게임별 평균 업데이트 주기(통상 6주)로 산출한 추정 일정(점선 테두리)이며, 공식 발표에 따라 변경될 수 있습니다.
                    </li>
                  </ul>
                </div>

                <div className="guide-section">
                  <div className="guide-section-heading">4. 브라우저 앱 설치(바로가기 앱)</div>
                  <ul className="guide-bullet-list">
                    <li>
                      PC(Chrome·Edge) 및 모바일(Android·iOS Safari)에서 별도 스토어 없이 전용 앱 창이나 홈 화면 아이콘으로 설치할 수 있습니다.
                    </li>
                    <li>
                      설치 후에도 모든 일정 데이터는 항상 최신 상태로 실시간 반영됩니다.
                    </li>
                  </ul>
                  {!isAppInstalled && onOpenInstall && (
                    <button
                      type="button"
                      className="guide-install-inline-btn"
                      onClick={onOpenInstall}
                    >
                      <Download size={13} />
                      <span>앱 설치 / 방법 보기</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'patches' && (
              <div className="patch-notes-list">
                {patchNotes.length === 0 ? (
                  <p className="patch-notes-empty">등록된 업데이트 내역이 없습니다.</p>
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
