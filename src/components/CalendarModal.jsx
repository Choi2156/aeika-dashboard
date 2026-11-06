import { useEffect, useState } from 'react';
import { X, Download, ExternalLink, Calendar } from 'lucide-react';
import { trackCalendarDownload, trackCalendarFullView } from '../utils/analytics';
import { getNowKSTParts } from '../utils/dateKST';
import ModalShell from './common/ModalShell';
import '../styles/CalendarModal.css';

/**
 * CalendarModal — 종합 일정 캘린더 고해상도 이미지 팝업 및 다운로드 (v2.0 ModalShell 통합)
 */
export default function CalendarModal({ isOpen, onClose, meta, targetYear, targetMonth }) {
  const [calendarMeta, setCalendarMeta] = useState(null);
  const [useFallbackCurrent, setUseFallbackCurrent] = useState(false);

  const { year: kstYear, month: kstMonth } = getNowKSTParts();
  const activeYear = targetYear || kstYear;
  const activeMonth = targetMonth || kstMonth;
  const monthPad = String(activeMonth).padStart(2, '0');

  useEffect(() => {
    if (!isOpen) return;
    setUseFallbackCurrent(false);
    fetch('./data/calendar_meta.json?t=' + Math.floor(Date.now() / 60000))
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setCalendarMeta(data);
      })
      .catch(() => {});
  }, [isOpen, activeYear, activeMonth]);

  const lastUpdated =
    calendarMeta?.last_updated ||
    (meta?.last_updated
      ? meta.last_updated.includes('T')
        ? meta.last_updated.split('T')[0]
        : meta.last_updated
      : '2026-11-01');

  const calendarTitle = `${activeYear}년 ${activeMonth}월 서브컬쳐 게임 일정 캘린더`;
  const cacheKey = calendarMeta?.generated_at
    ? encodeURIComponent(calendarMeta.generated_at)
    : 'v200_fresh';

  const archiveWebp = `./archive/calendars/calendar_${activeYear}_${monthPad}.webp?v=${cacheKey}`;
  const archivePng = `./archive/calendars/calendar_${activeYear}_${monthPad}.png?v=${cacheKey}`;
  const currentWebp = `./assets/calendar/calendar_current.webp?v=${cacheKey}`;
  const currentPng = `./assets/calendar/calendar_current.png?v=${cacheKey}`;

  const webpSrc = useFallbackCurrent ? currentWebp : archiveWebp;
  const pngSrc = useFallbackCurrent ? currentPng : archivePng;
  const downloadFileName = `게임일정_${String(activeYear).slice(-2)}년${activeMonth}월.png`;

  const handleDownloadClick = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    trackCalendarDownload({
      source: 'modal',
      format: 'png',
      year: activeYear,
      month: activeMonth,
      updatedAt: lastUpdated,
    });

    try {
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
    } catch {
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
      year: activeYear,
      month: activeMonth,
    });
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      modalKey="calendar"
      dialogClassName="calendar-modal__dialog"
      ariaLabelledBy="calendar-modal-title"
    >
      {({ requestClose }) => (
        <>
          <header className="calendar-modal__header">
            <div className="calendar-modal__title-wrap">
              <h2 id="calendar-modal-title" className="calendar-modal__title">
                <Calendar size={18} className="modal-title-icon" />
                <span>{calendarTitle}</span>
              </h2>
              <span className="calendar-modal__badge">최신 반영: {lastUpdated}</span>
            </div>
            <button
              className="calendar-modal__close-btn"
              onClick={requestClose}
              aria-label="달력 팝업 닫기"
              title="닫기 (ESC)"
            >
              <X size={18} />
            </button>
          </header>

          <div className="calendar-modal__body">
            <div className="calendar-modal__image-wrapper">
              <picture>
                <source srcSet={webpSrc} type="image/webp" />
                <img
                  src={pngSrc}
                  alt={calendarTitle}
                  className="calendar-modal__image"
                  onError={() => {
                    if (!useFallbackCurrent) setUseFallbackCurrent(true);
                  }}
                  onClick={() => {
                    window.open(pngSrc, '_blank', 'noopener,noreferrer');
                    handleOpenFull();
                  }}
                  title="클릭 시 새 탭에서 고해상도 원본 보기"
                />
              </picture>
            </div>
          </div>

          <footer className="calendar-modal__footer">
            <p className="calendar-modal__caption">
              ※ 본 달력은 {lastUpdated} 기준 일정이며, 공식 공지에 따라 수시로 갱신됩니다.
            </p>
            <div className="calendar-modal__actions">
              <a
                href={pngSrc}
                target="_blank"
                rel="noopener noreferrer"
                className="calendar-modal__btn-view"
                onClick={handleOpenFull}
              >
                <ExternalLink size={14} />
                <span>새 탭으로 열기</span>
              </a>

              <button
                type="button"
                className="calendar-modal__btn-download"
                onClick={handleDownloadClick}
              >
                <Download size={14} />
                <span>고해상도 다운로드</span>
              </button>
            </div>
          </footer>
        </>
      )}
    </ModalShell>
  );
}
