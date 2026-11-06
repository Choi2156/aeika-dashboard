import { MapPin, Ticket, ExternalLink, X } from 'lucide-react';
import { trackOutboundLink } from '../utils/analytics';
import { parseDetailLines } from '../utils/eventTextParser';
import ModalShell from './common/ModalShell';
import '../styles/components.css';

// 원신 6.x 정식 버전 명칭 포맷터 헬퍼
const formatVersionBadge = (game, version, allEvents) => {
  if (!version) return '';
  if (game === '원신') {
    const cleanVer = version.replace(' 후반', '').trim();
    const match = cleanVer.match(/^6\.(\d)/);
    if (match) {
      const minor = parseInt(match[1], 10);
      const ordinals = ['첫', '두', '세', '네', '다섯', '여섯', '일곱', '여덟', '아홉', '열'];
      const ord = ordinals[minor] || `${minor + 1}`;

      let subtitle = '???';
      if (allEvents) {
        const mainEvent = allEvents.find(
          (e) =>
            e.game === '원신' &&
            e.type === '전반업데이트' &&
            e.version.replace(' 후반', '').trim() === cleanVer
        );
        if (mainEvent && mainEvent.title) {
          const subMatch = mainEvent.title.match(/-\s*「([^」]+)」/);
          if (subMatch) subtitle = subMatch[1];
        }
      }
      const suffix = version.includes('후반') ? ' 후반' : '';
      return `v${cleanVer}${suffix} 「${ord} 번째 달」 버전 - 「${subtitle}」`;
    }
  }
  return `v${version.replace(/^v/, '')}`;
};

/**
 * DetailModal — 일정 상세 모달 (v2.0 ModalShell 통합 & 구조화 상세 뷰)
 */
export default function DetailModal({ event, events, displayTypeName, gamesConfig, onClose }) {
  if (!event) return null;

  const gameConfig = gamesConfig?.[event.game] || {};
  const themeColor = gameConfig?.theme?.color || '#6366f1';
  const textOnBar = gameConfig?.theme?.textOnBar || '#0f172a';
  const gameName = gameConfig?.name || event.game || '';
  const isStream = event.type === '공식방송';

  const imageSrc = event.custom_img
    ? `./assets/${event.custom_img}`
    : gameConfig?.defaultImg || null;

  const isConfirmed = event.is_fixed === true || event.is_fixed === 'true';
  const detailLines = parseDetailLines(event.detail);

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return dateStr;
  };

  return (
    <ModalShell
      isOpen={Boolean(event)}
      onClose={onClose}
      modalKey="detail"
      dialogClassName="modal-body modal-body--detail"
      ariaLabelledBy="detail-modal-title"
    >
      {({ requestClose }) => (
        <>
          {/* ── Header ── */}
          <div className="modal-header">
            <div className="modal-header-info">
              <div className="modal-header-top-row">
                <span
                  className="badge-game"
                  style={{ backgroundColor: themeColor, color: textOnBar }}
                >
                  {gameName}
                </span>
                {event.version && (
                  <span className="badge-version">
                    {formatVersionBadge(event.game, event.version, events)}
                  </span>
                )}
                <span
                  className={
                    isConfirmed ? 'badge-status--confirmed' : 'badge-status--predicted'
                  }
                >
                  {isConfirmed ? '확정' : '예상'}
                </span>
              </div>
              <div id="detail-modal-title" className="modal-header-title">
                {event.title || '일정 상세'}
              </div>
            </div>
            <button className="modal-close-btn" onClick={requestClose} aria-label="닫기">
              <X size={18} />
            </button>
          </div>

          {/* ── Image Viewer ── */}
          {imageSrc && (
            <div className="modal-image-wrapper">
              <div className="modal-image-container">
                <img
                  className="modal-image"
                  src={imageSrc}
                  alt={event.title || '이벤트 이미지'}
                  loading="lazy"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
                {gameConfig?.copyright && (
                  <span className="image-copyright-label" style={{ right: '8px', bottom: '8px' }}>
                    {gameConfig.copyright}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* ── Detail Text (Clean Structured Lines) ── */}
          {detailLines.length > 0 && (
            <div className="modal-detail-block">
              {detailLines.map((line, idx) => (
                <div key={idx} className="modal-detail-line">
                  {detailLines.length > 1 ? `• ${line}` : line}
                </div>
              ))}
            </div>
          )}

          {/* ── Metadata ── */}
          <div className="modal-metadata">
            {isStream ? (
              <div className="modal-metadata-row">
                <span className="modal-metadata-key">방송일</span>
                <span className="modal-metadata-value">
                  {formatDate(event.start_date || event.date)}
                </span>
              </div>
            ) : (
              <>
                <div className="modal-metadata-row">
                  <span className="modal-metadata-key">시작일</span>
                  <span className="modal-metadata-value">
                    {formatDate(event.start_date || event.date)}
                  </span>
                </div>
                {event.end_date && (
                  <div className="modal-metadata-row">
                    <span className="modal-metadata-key">종료일</span>
                    <span className="modal-metadata-value">
                      {formatDate(event.end_date)}
                    </span>
                  </div>
                )}
              </>
            )}
            {event.location && (
              <div className="modal-metadata-row">
                <span className="modal-metadata-key">장소</span>
                <span className="modal-metadata-value modal-metadata-value--highlight">
                  <MapPin size={12} />
                  <span>{event.location}</span>
                </span>
              </div>
            )}
            {event.time && (
              <div className="modal-metadata-row">
                <span className="modal-metadata-key">시간</span>
                <span className="modal-metadata-value">{event.time} (KST)</span>
              </div>
            )}
            {displayTypeName && (
              <div className="modal-metadata-row">
                <span className="modal-metadata-key">유형</span>
                <span className="modal-metadata-value">{displayTypeName}</span>
              </div>
            )}

            {/* ── Ticket Links ── */}
            {event.ticket_links &&
              event.ticket_links.length > 0 &&
              event.ticket_links.some((link) => link && link.url) && (
                <div className="modal-metadata-row modal-metadata-row--tickets">
                  <span className="modal-metadata-key">
                    <Ticket size={12} /> 예매 바로가기
                  </span>
                  <div className="modal-ticket-links">
                    {event.ticket_links
                      .filter((link) => link && link.url)
                      .map((linkObj, idx) => (
                        <a
                          key={idx}
                          href={linkObj.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ticket-link-btn"
                          onClick={() => {
                            trackOutboundLink({
                              linkCategory: 'ticket',
                              platform: linkObj.name || 'ticket_vendor',
                              targetUrl: linkObj.url,
                              game: event.game || '',
                              title: event.title || '',
                            });
                          }}
                        >
                          <span>{linkObj.name || `예매처 ${idx + 1}`}</span>
                          <ExternalLink size={11} />
                        </a>
                      ))}
                  </div>
                </div>
              )}
          </div>

          {/* ── Link Button ── */}
          {event.link ? (
            <a
              className="modal-link-btn"
              href={event.link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                trackOutboundLink({
                  linkCategory: 'official_notice',
                  platform: 'official_site',
                  targetUrl: event.link,
                  game: event.game || '',
                  title: event.title || '',
                });
              }}
            >
              <ExternalLink size={15} />
              <span>공식 공지 / 사이트 열기</span>
            </a>
          ) : (
            <div className="modal-bottom-spacer" />
          )}
        </>
      )}
    </ModalShell>
  );
}
