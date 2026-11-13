import { useState, useEffect, memo } from 'react';
import { Megaphone, ChevronRight } from 'lucide-react';
import NoticeCategoryBadge from './NoticeCategoryBadge';
import '../styles/NoticeTickerBanner.css';

function NoticeTickerBanner({ notices = [], onOpenNotice }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (!notices || notices.length <= 1 || isPaused) return;

    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % notices.length);
        setIsTransitioning(false);
      }, 280);
    }, 4500);

    return () => clearInterval(interval);
  }, [notices, isPaused]);

  if (!notices || notices.length === 0) return null;

  const currentNotice = notices[currentIndex] || notices[0];

  return (
    <div
      className="notice-ticker-banner"
      onClick={() => onOpenNotice && onOpenNotice(currentNotice)}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpenNotice && onOpenNotice(currentNotice);
        }
      }}
      title="클릭하여 공지사항 상세 보기"
    >
      <div className="notice-ticker-banner__inner">
        <div className="notice-ticker-banner__badge-group">
          <Megaphone size={13} className="notice-ticker-banner__icon" />
          <NoticeCategoryBadge
            category={currentNotice.category}
            isImportant={currentNotice.is_important}
          />
        </div>

        <div className="notice-ticker-banner__content">
          <span
            className={`notice-ticker-banner__title ${
              isTransitioning ? 'notice-ticker-banner__title--sliding' : ''
            }`}
          >
            {currentNotice.title}
          </span>
        </div>

        <div className="notice-ticker-banner__action">
          <span className="notice-ticker-banner__action-text">공지 보기</span>
          <ChevronRight size={13} />
        </div>
      </div>
    </div>
  );
}

export default memo(NoticeTickerBanner);
