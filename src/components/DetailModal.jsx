import { useEffect, useRef } from 'react';
import { X, ExternalLink } from 'lucide-react';
import '../styles/components.css';

// 원신 6.x 정식 버전 명칭 포맷터 헬퍼
const formatVersionBadge = (game, version, allEvents) => {
  if (!version) return '';
  if (game === '원신') {
    const cleanVer = version.replace(' 후반', '').trim();
    const match = cleanVer.match(/^6\.(\d)/);
    if (match) {
      const minor = parseInt(match[1], 10);
      const ordinals = ["첫", "두", "세", "네", "다섯", "여섯", "일곱", "여덟", "아홉", "열"];
      const ord = ordinals[minor] || `${minor + 1}`;
      
      let subtitle = '???';
      if (allEvents) {
        const mainEvent = allEvents.find(e => 
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
 * DetailModal — Event Detail Popup
 *
 * Props:
 *   event          – The event object (or null if closed)
 *   events         – Array of all events (for dynamic lookup)
 *   displayTypeName – e.g. '버전 업데이트', '후반업데이트', '공식방송'
 *   gamesConfig    – Game configuration map
 *   onClose        – Callback to close the modal
 */
export default function DetailModal({ event, events, displayTypeName, gamesConfig, onClose }) {
  const overlayRef = useRef(null);
  const closingRef = useRef(false);

  /* ── Entry animation ── */
  useEffect(() => {
    if (!event) return;
    closingRef.current = false;
    // Trigger CSS transition on next frame
    const frame = requestAnimationFrame(() => {
      if (overlayRef.current) {
        overlayRef.current.classList.add('modal-visible');
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [event]);

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
      // Fallback if transitionend never fires
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
    if (!event) return;
    const onKey = (e) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [event]);

  if (!event) return null;

  /* ── Derived data ── */
  const gameConfig = gamesConfig?.[event.game] || {};
  const themeColor = gameConfig?.theme?.color || '#6366f1';
  const gameName = gameConfig?.name || event.game || '';
  const isStream = event.type === '공식방송';

  // Image: custom_img takes priority, then game default (gameConfig.defaultImg)
  const imageSrc = event.custom_img
    ? `./assets/${event.custom_img}`
    : gameConfig?.defaultImg || null;

  const isConfirmed = event.is_fixed === true || event.is_fixed === 'true';

  /* ── Format date for display ── */
  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return dateStr;
  };

  return (
    <div
      ref={overlayRef}
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === overlayRef.current) handleClose();
      }}
    >
      <div className="modal-body modal-body--detail">
        {/* ── Header ── */}
        <div className="modal-header">
          <div className="modal-header-info">
            <div className="modal-header-top-row">
              <span
                className="badge-game"
                style={{ backgroundColor: themeColor }}
              >
                {gameName}
              </span>
              {event.version && (
                <span className="badge-version">{formatVersionBadge(event.game, event.version, events)}</span>
              )}
              <span
                className={
                  isConfirmed
                    ? 'badge-status--confirmed'
                    : 'badge-status--predicted'
                }
              >
                {isConfirmed ? '확정' : '예상'}
              </span>
            </div>
            <div className="modal-header-title">{event.title || '일정 상세'}</div>
          </div>
          <button
            className="modal-close-btn"
            onClick={handleClose}
            aria-label="닫기"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Image Viewer ── */}
        {imageSrc && (
          <div className="modal-image-wrapper">
            <div className="modal-image-container" style={{ position: 'relative', borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid var(--slate-600)' }}>
              <img
                className="modal-image"
                src={imageSrc}
                alt={event.title || '이벤트 이미지'}
                loading="lazy"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
                style={{ display: 'block', width: '100%', border: 'none' }}
              />
              {gameConfig?.copyright && (
                <span className="image-copyright-label" style={{ right: '8px', bottom: '8px' }}>
                  {gameConfig.copyright}
                </span>
              )}
            </div>
          </div>
        )}

        {/* ── Detail Text ── */}
        {event.detail && (
          <div className="modal-detail-block">{event.detail}</div>
        )}

        {/* ── Metadata ── */}
        <div className="modal-metadata" style={event.ticket_links && event.ticket_links.length > 0 ? { borderBottomLeftRadius: '0px', borderBottomRightRadius: '0px', borderBottom: 'none', margin: '0.75rem 1.25rem 0rem 1.25rem' } : {}}>
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
              <span className="modal-metadata-value" style={{ color: 'var(--accent-indigo-light)', fontWeight: 700 }}>
                📍 {event.location}
              </span>
            </div>
          )}
          {event.time && (
            <div className="modal-metadata-row">
              <span className="modal-metadata-key">시간</span>
              <span className="modal-metadata-value">{event.time}</span>
            </div>
          )}
          {displayTypeName && (
            <div className="modal-metadata-row">
              <span className="modal-metadata-key">유형</span>
              <span className="modal-metadata-value">{displayTypeName}</span>
            </div>
          )}
        </div>

        {/* ── Ticket Links (오프라인 예매처 복수 단추 동적 렌더러) ── */}
        {event.ticket_links && event.ticket_links.length > 0 && event.ticket_links.some(link => link && link.url) && (
          <div className="modal-metadata" style={{ marginTop: '0px', borderTop: 'none', borderTopLeftRadius: '0px', borderTopRightRadius: '0px', margin: '0rem 1.25rem 0.75rem 1.25rem' }}>
            <div className="modal-metadata-row" style={{ flexDirection: 'column', gap: '6px', alignItems: 'stretch' }}>
              <span className="modal-metadata-key" style={{ marginBottom: '2px' }}>🎟️ 예매 바로가기</span>
              <div className="modal-ticket-links" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {event.ticket_links.filter(link => link && link.url).map((linkObj, idx) => (
                  <a
                    key={idx}
                    href={linkObj.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ticket-link-btn"
                  >
                    <span>{linkObj.name || `예매처 ${idx + 1}`}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Link Button ── */}
        {event.link ? (
          <a
            className="modal-link-btn"
            href={event.link}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink size={16} />
            공식 공지 / 사이트 열기
          </a>
        ) : (
          <div className="modal-bottom-spacer" />
        )}
      </div>
    </div>
  );
}
