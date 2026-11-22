import { useMemo, useState, useEffect } from 'react';
import {
  MapPin,
  Ticket,
  ExternalLink,
  Clock,
  Calendar as CalendarIcon,
  X,
  Maximize2,
  AlertTriangle,
} from 'lucide-react';
import { trackOutboundLink } from '../utils/analytics';
import {
  parseStructuredDetail,
  formatEventTypeLabel,
  cleanEventDisplayTitle,
  hasScheduleWarning,
} from '../utils/eventTextParser';
import { getTodayStrKST, diffDays, parseDateStr, getKoreanDayName } from '../utils/dateKST';
import ModalShell from './common/ModalShell';
import '../styles/components.css';
import '../styles/NoticeModal.css';

// 원신 6.x 및 버전 명칭 포맷터 헬퍼
const formatVersionBadge = (game, version, allEvents) => {
  if (!version) return '';
  const trimmed = version.trim();
  if (!trimmed || /^(?:행사|이벤트|콜라보)$/.test(trimmed)) {
    return '';
  }

  if (game === '원신') {
    const cleanVer = trimmed.replace(' 후반', '').trim();
    const match = cleanVer.match(/^6\.(\d)/);
    if (match) {
      const minor = parseInt(match[1], 10);
      const ordinals = ['첫', '두', '세', '네', '다섯', '여섯', '일곱', '여덟', '아홉', '열'];
      const ord = ordinals[minor] || `${minor + 1}`;

      let subtitle = '';
      if (allEvents) {
        const mainEvent = allEvents.find(
          (e) =>
            e.game === '원신' &&
            e.type === '전반업데이트' &&
            e.version &&
            e.version.replace(' 후반', '').trim() === cleanVer
        );
        if (mainEvent && mainEvent.title) {
          const subMatch = mainEvent.title.match(/-\s*「([^」]+)」/);
          if (subMatch) subtitle = subMatch[1];
        }
      }
      const suffix = trimmed.includes('후반') ? ' 후반' : '';
      return subtitle
        ? `v${cleanVer}${suffix} 「${ord} 번째 달」`
        : `v${cleanVer}${suffix}`;
    }
  }

  const normalized = trimmed.replace(/^v/i, '');
  return /^\d/.test(normalized) ? `v${normalized}` : trimmed;
};

// YYYY-MM-DD (요일) 포맷터
const formatDateWithWeekday = (dateStr) => {
  if (!dateStr) return '—';
  const d = parseDateStr(dateStr);
  const w = getKoreanDayName(d.getDay());
  return w ? `${dateStr} (${w})` : dateStr;
};

// 실시간 D-Day / 잔여일 배지 연산 헬퍼
const computeLiveDDayBadge = (event, todayStr) => {
  const startStr = event?.start_date || event?.date;
  if (!startStr) return null;
  const endStr = event?.end_date || startStr;

  const diffStart = diffDays(todayStr, startStr);
  const diffEnd = diffDays(todayStr, endStr);

  if (startStr === todayStr) {
    return { status: 'today', label: 'TODAY' };
  }
  if (diffStart > 0) {
    return { status: 'upcoming', label: `D-${diffStart}` };
  }
  if (todayStr > startStr && todayStr <= endStr) {
    return {
      status: 'ongoing',
      label: diffEnd === 0 ? '진행 중 · 오늘 종료' : `진행 중 · ${diffEnd}일 남음`,
    };
  }
  return { status: 'ended', label: '종료' };
};

/**
 * DetailModal — 일정 상세 모달 (v1.3.0 구조화 상세 뷰)
 */
export default function DetailModal({ event, events, displayTypeName, gamesConfig, onClose }) {
  const todayStr = useMemo(() => getTodayStrKST(), []);
  const [isImageZoomed, setIsImageZoomed] = useState(false);

  useEffect(() => {
    setIsImageZoomed(false);
  }, [event]);

  useEffect(() => {
    if (!isImageZoomed) return;
    const onCaptureKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        e.stopImmediatePropagation?.();
        setIsImageZoomed(false);
      }
    };
    window.addEventListener('keydown', onCaptureKeyDown, true);
    return () => window.removeEventListener('keydown', onCaptureKeyDown, true);
  }, [isImageZoomed]);

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
  const hasWarning = hasScheduleWarning(event);
  const structuredBlocks = parseStructuredDetail(event.details || event.detail);
  const warningBlocks = structuredBlocks.filter((b) => b.type === 'warning');
  const otherBlocks = structuredBlocks.filter((b) => b.type !== 'warning');
  const effectiveWarningBlocks =
    hasWarning && warningBlocks.length === 0
      ? [
          {
            type: 'warning',
            category: '일정 주의',
            content:
              (event.warning_note && event.warning_note.trim()) ||
              '세부 일정 또는 종료일이 추후 공식 공지에 따라 변동될 수 있습니다.',
            tone: 'warning',
          },
        ]
      : warningBlocks;
  const orderedBlocks = [...effectiveWarningBlocks, ...otherBlocks];
  const versionBadgeText = formatVersionBadge(event.game, event.version, events);
  const typeBadgeText = formatEventTypeLabel(event.type || displayTypeName);
  const ddayBadge = computeLiveDDayBadge(event, todayStr);
  const cleanTitleText = cleanEventDisplayTitle(event.title, gameName) || '일정 상세';

  const startStr = event.start_date || event.date || '';
  const endStr = event.end_date || '';
  const hasRange = Boolean(startStr && endStr && endStr !== startStr && !isStream);
  const durationDays = hasRange ? diffDays(startStr, endStr) + 1 : null;

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
          {/* ── Top Header (Decluttered 2-Cluster Hierarchy) ── */}
          <div className="modal-header">
            <div className="modal-header-info">
              <div className="modal-header-top-row">
                <span
                  className="badge-game"
                  style={{ backgroundColor: themeColor, color: textOnBar }}
                >
                  {gameName}
                </span>

                {(versionBadgeText || typeBadgeText) && (
                  <span className="badge-type">
                    {versionBadgeText && typeBadgeText
                      ? `${versionBadgeText} · ${typeBadgeText}`
                      : versionBadgeText || typeBadgeText}
                  </span>
                )}

                {!isConfirmed && (
                  <span className="badge-status--predicted">예상</span>
                )}

                {hasWarning && (
                  <span className="badge-status--warning">
                    <AlertTriangle size={11} strokeWidth={2.5} aria-hidden="true" />
                    <span>일정 주의</span>
                  </span>
                )}

                {ddayBadge && (
                  <span className={`badge-dday badge-dday--${ddayBadge.status}`}>
                    {ddayBadge.label}
                  </span>
                )}
              </div>

              <div id="detail-modal-title" className="modal-header-title">
                {cleanTitleText}
              </div>
            </div>

            <button className="modal-close-btn" onClick={requestClose} aria-label="닫기">
              <X size={18} />
            </button>
          </div>

          {/* ── Hero Banner Image with Smooth Bottom Gradient & Lightbox Zoom ── */}
          {imageSrc && (
            <div className="modal-image-wrapper">
              <div
                className="modal-image-container modal-image-container--zoomable"
                role="button"
                tabIndex={0}
                onClick={() => setIsImageZoomed(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setIsImageZoomed(true);
                  }
                }}
                title="클릭하여 원본 이미지 크게 보기"
                aria-label="일정 배너 이미지 확대 보기"
              >
                <img
                  className="modal-image"
                  src={imageSrc}
                  alt={event.title || '이벤트 이미지'}
                  loading="lazy"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
                <div className="modal-image-gradient" aria-hidden="true" />
                <span className="modal-image-zoom-hint" aria-hidden="true">
                  <Maximize2 size={10} />
                  <span>크게 보기</span>
                </span>
                {gameConfig?.copyright && (
                  <span className="image-copyright-label" style={{ right: '8px', bottom: '8px' }}>
                    {gameConfig.copyright}
                  </span>
                )}
              </div>
            </div>
          )}

          {isImageZoomed && imageSrc && (
            <div
              className="detail-lightbox-overlay"
              onClick={() => setIsImageZoomed(false)}
              role="dialog"
              aria-modal="true"
              aria-label="배너 이미지 원본 보기"
            >
              <button
                type="button"
                className="detail-lightbox-close"
                onClick={() => setIsImageZoomed(false)}
                aria-label="원본 이미지 닫기"
              >
                <X size={18} />
              </button>
              <img
                src={imageSrc}
                alt={event.title || '이벤트 원본 이미지'}
                className="detail-lightbox-img"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}

          {/* ── Structured Detail Bullet Cards ── */}
          {orderedBlocks.length > 0 && (
            <div className="modal-detail-block detail-structured-grid">
              {orderedBlocks.map((block, idx) => {
                if (block.type === 'warning') {
                  return (
                    <div key={idx} className="detail-bullet-card detail-bullet-card--warning" role="note">
                      <span className="detail-section-chip detail-section-chip--warning">
                        <AlertTriangle size={11} strokeWidth={2.5} aria-hidden="true" />
                        <span>{block.category || '일정 주의'}</span>
                      </span>
                      <span className="detail-card-value detail-card-value--warning">
                        {block.content}
                      </span>
                    </div>
                  );
                }

                if (block.type === 'kv') {
                  return (
                    <div key={idx} className="detail-bullet-card">
                      <span
                        className={`detail-section-chip detail-section-chip--${block.tone || 'default'}`}
                      >
                        {block.category}
                      </span>
                      <span className="detail-card-value">{block.content}</span>
                    </div>
                  );
                }

                if (block.type === 'group') {
                  return (
                    <div
                      key={idx}
                      className={`detail-bullet-card detail-bullet-card--group ${
                        !block.category ? 'detail-bullet-card--group--no-header' : ''
                      }`}
                    >
                      {block.category && (
                        <div className="detail-group-header">
                          <span
                            className={`detail-section-chip detail-section-chip--${block.tone || 'event'}`}
                          >
                            {block.category}
                          </span>
                        </div>
                      )}
                      <ul className="detail-group-list">
                        {block.items.map((sub, sIdx) => (
                          <li key={sIdx} className="detail-group-item">
                            {sub.category ? (
                              <>
                                <span className="detail-group-subkey">{sub.category}:</span>{' '}
                                <span>{sub.content}</span>
                              </>
                            ) : (
                              <span>{sub.text}</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                }

                if (block.type === 'note') {
                  return (
                    <div key={idx} className="detail-bullet-card detail-bullet-card--note">
                      <span className="detail-section-chip detail-section-chip--note">
                        {block.category || '참고'}
                      </span>
                      <span className="detail-card-value">{block.content}</span>
                    </div>
                  );
                }

                const paragraphs =
                  Array.isArray(block.paragraphs) && block.paragraphs.length > 0
                    ? block.paragraphs
                    : String(block.content || '')
                        .split(/\r?\n+/)
                        .filter(Boolean);

                return (
                  <div key={idx} className="detail-bullet-card detail-bullet-card--text">
                    {paragraphs.map((paragraph, pIdx) => (
                      <p key={pIdx} className="detail-card-paragraph">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Metadata Block ── */}
          <div className="modal-metadata">
            {isStream ? (
              <div className="modal-metadata-row">
                <span className="modal-metadata-key">
                  <CalendarIcon size={12} /> 방송 일자
                </span>
                <span className="modal-metadata-value">
                  {formatDateWithWeekday(startStr)}
                </span>
              </div>
            ) : (
              <div className="modal-metadata-row">
                <span className="modal-metadata-key">
                  <CalendarIcon size={12} /> {hasRange ? '진행 기간' : '시작 일자'}
                </span>
                <span className="modal-metadata-value modal-metadata-value--period">
                  <span>
                    {hasRange
                      ? `${formatDateWithWeekday(startStr)} ~ ${formatDateWithWeekday(endStr)}`
                      : formatDateWithWeekday(startStr)}
                  </span>
                  {durationDays && durationDays > 1 && (
                    <span className="modal-metadata-period-days">{durationDays}일간</span>
                  )}
                </span>
              </div>
            )}

            {event.time && (
              <div className="modal-metadata-row">
                <span className="modal-metadata-key">
                  <Clock size={12} /> {isStream ? '방송 시간' : '오픈 시간'}
                </span>
                <span className="modal-metadata-value">{event.time} (KST)</span>
              </div>
            )}

            {event.location && (
              <div className="modal-metadata-row">
                <span className="modal-metadata-key">
                  <MapPin size={12} /> 진행 장소
                </span>
                <span className="modal-metadata-value modal-metadata-value--highlight">
                  <span>{event.location}</span>
                </span>
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

          {/* ── Official Link Button ── */}
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
              <span>{isStream ? '공식 방송 / 채널 바로가기' : '공식 공지 / 사이트 열기'}</span>
            </a>
          ) : (
            <div className="modal-bottom-spacer" />
          )}
        </>
      )}
    </ModalShell>
  );
}
