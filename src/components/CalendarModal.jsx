import { useEffect, useRef, useState } from 'react';
import { X, Download, ExternalLink, Calendar, ZoomIn } from 'lucide-react';
import { trackCalendarDownload, trackCalendarFullView } from '../utils/analytics';
import '../styles/CalendarModal.css';

/**
 * CalendarModal — 이달의 종합 일정 캘린더 이미지 팝업 및 고화질 다운로드
 */
export default function CalendarModal({ isOpen, onClose, meta }) {
  const overlayRef = useRef(null);
  const closingRef = useRef(false);
  const [calendarMeta, setCalendarMeta] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    fetch('./data/calendar_meta.json?t=' + Math.floor(Date.now() / 60000))
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data) setCalendarMeta(data); })
      .catch(() => {});
  }, [isOpen]);

  // 최신 업데이트 날짜 추출 (calendar_meta.json 우선, fallback으로 schedule meta)
  const lastUpdated = calendarMeta?.last_updated || (
    meta?.last_updated 
      ? (meta.last_updated.includes('T') ? meta.last_updated.split('T')[0] : meta.last_updated) 
      : '2026-09-08'
  );
  const calendarTitle = calendarMeta?.title || "2026년 9월 서브컬쳐 게임 일정 캘린더";
  const cacheKey = calendarMeta?.generated_at ? encodeURIComponent(calendarMeta.generated_at) : 'v125_fresh';
  const webpSrc = `./assets/calendar/calendar_current.webp?v=${cacheKey}`;
  const pngSrc = `./assets/calendar/calendar_current.png?v=${cacheKey}`;
  const downloadFileName = calendarMeta?.download_name || "게임일정_26년9월.png";

  /* ── Entry animation & History State ── */
  useEffect(() => {
    if (!isOpen) return;
    closingRef.current = false;

    const frame = requestAnimationFrame(() => {
      if (overlayRef.current) {
        overlayRef.current.classList.add('modal-visible');
      }
    });

    // 브라우저 뒤로가기 시 모달만 닫히도록 히스토리 주입
    window.history.pushState({ modal: 'calendar' }, '');
    const onPopState = () => {
      handleClose();
    };
    window.addEventListener('popstate', onPopState);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('popstate', onPopState);
    };
  }, [isOpen]);

  /* ── ESC key to close ── */
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  /* ── Close with exit animation ── */
  const handleClose = () => {
    if (closingRef.current) return;
    closingRef.current = true;

    if (window.history.state && window.history.state.modal === 'calendar') {
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

  const handleDownloadClick = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    trackCalendarDownload({
      source: 'modal',
      format: 'png',
      year: calendarMeta?.year || 2026,
      month: calendarMeta?.month || 9,
      updatedAt: lastUpdated,
    });

    try {
      // 이미지 Blob 생성 후 브라우저가 지정된 파일명으로 즉시 저장하도록 강제
      const res = await fetch(pngSrc);
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = downloadFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
    } catch (err) {
      console.warn('Blob download fallback:', err);
      const link = document.createElement('a');
      link.href = pngSrc;
      link.download = downloadFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleOpenFull = () => {
    trackCalendarFullView({
      source: 'modal',
      year: calendarMeta?.year || 2026,
      month: calendarMeta?.month || 9,
    });
  };

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === overlayRef.current) handleClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="calendar-modal-title"
    >
      <div className="calendar-modal__dialog">
        {/* 모달 상단 헤더 */}
        <header className="calendar-modal__header">
          <div className="calendar-modal__title-wrap">
            <h2 id="calendar-modal-title" className="calendar-modal__title">
              <Calendar size={18} className="modal-title-icon" />
              <span>{calendarTitle}</span>
            </h2>
            <span className="calendar-modal__badge">
              최신 반영: {lastUpdated}
            </span>
          </div>
          <button
            className="calendar-modal__close-btn"
            onClick={handleClose}
            aria-label="달력 팝업 닫기"
            title="닫기 (ESC)"
          >
            <X size={20} />
          </button>
        </header>

        {/* 캘린더 이미지 뷰어 본문 */}
        <div className="calendar-modal__body">
          <div className="calendar-modal__image-wrapper">
            <picture>
              <source srcSet={webpSrc} type="image/webp" />
              <img
                src={pngSrc}
                alt={calendarTitle}
                className="calendar-modal__image"
                onLoad={() => setImgLoaded(true)}
                onClick={() => {
                  window.open(pngSrc, '_blank', 'noopener,noreferrer');
                  handleOpenFull();
                }}
                title="클릭 시 새 탭에서 고해상도 원본 보기"
              />
            </picture>
          </div>
        </div>

        {/* 모달 하단 액션 바 */}
        <footer className="calendar-modal__footer">
          <p className="calendar-modal__caption">
            ※ 본 달력은 {lastUpdated} 기준 수집된 확정 및 예상 일정이며, 신규 공지 발표 시 즉시 갱신됩니다.
          </p>
          <div className="calendar-modal__actions">
            <a
              href={pngSrc}
              target="_blank"
              rel="noopener noreferrer"
              className="calendar-modal__btn-view"
              onClick={handleOpenFull}
              title="새 탭에서 원본 이미지 열기"
            >
              <ExternalLink size={14} />
              <span>새 탭으로 열기</span>
            </a>

            <button
              type="button"
              className="calendar-modal__btn-download"
              onClick={handleDownloadClick}
              title="고해상도 무손실 PNG 이미지 다운로드"
            >
              <Download size={14} />
              <span>고해상도 다운로드</span>
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
