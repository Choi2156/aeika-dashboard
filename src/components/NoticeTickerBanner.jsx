import { useState, useEffect, memo } from 'react';
import { Megaphone, ChevronRight } from 'lucide-react';
import NoticeCategoryBadge from './NoticeCategoryBadge';
import '../styles/NoticeTickerBanner.css';

function NoticeTickerBanner({ notices = [], onOpenNotice }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (!notices || notices.length <= 1) return;

    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % notices.length);
        setIsTransitioning(false);
      }, 400); // fade-out & slide transition duration
    }, 4500);

    return () => clearInterval(interval);
  }, [notices]);

  if (!notices || notices.length === 0) return null;

  const currentNotice = notices[currentIndex] || notices[0];

  return (
    <div className="notice-ticker-banner" onClick={() => onOpenNotice && onOpenNotice(currentNotice)}>
      <div className="notice-ticker-banner__inner">
        <div className="notice-ticker-banner__badge-group">
          <Megaphone size={14} className="notice-ticker-banner__icon" />
          <NoticeCategoryBadge
            category={currentNotice.category}
            isImportant={currentNotice.is_important}
          />
        </div>

        <div className="notice-ticker-banner__content">
          <span className={`notice-ticker-banner__title ${isTransitioning ? 'notice-ticker-banner__title--sliding' : ''}`}>
            {currentNotice.title}
          </span>
        </div>

        <div className="notice-ticker-banner__action">
          <span className="notice-ticker-banner__action-text">자세히 보기</span>
          <ChevronRight size={14} />
        </div>
      </div>
    </div>
  );
}

export default memo(NoticeTickerBanner);
