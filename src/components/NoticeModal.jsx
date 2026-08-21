import { useState, useEffect, useRef, memo } from 'react';
import { X, Megaphone, Calendar, ExternalLink, ChevronRight } from 'lucide-react';
import NoticeCategoryBadge from './NoticeCategoryBadge';
import '../styles/NoticeModal.css';

function NoticeModal({ isOpen, onClose, notices = [], selectedNotice = null }) {
  const [activeNoticeId, setActiveNoticeId] = useState(null);
  const overlayRef = useRef(null);
  const closingRef = useRef(false);

  // 모달이 열릴 때 선택된 공지 활성화
  useEffect(() => {
    if (isOpen && notices.length > 0) {
      closingRef.current = false;
      if (selectedNotice && selectedNotice.id) {
        setActiveNoticeId(selectedNotice.id);
      } else {
        setActiveNoticeId(notices[0].id);
      }

      // Entry animation
      const frame = requestAnimationFrame(() => {
        if (overlayRef.current) {
          overlayRef.current.classList.add('notice-modal-overlay--visible');
        }
      });

      // 브라우저 뒤로가기 시 모달 닫기
      window.history.pushState({ modal: 'notice' }, '');
      const onPopState = () => {
        handleClose();
      };
      window.addEventListener('popstate', onPopState);

      return () => {
        cancelAnimationFrame(frame);
        window.removeEventListener('popstate', onPopState);
      };
    }
  }, [isOpen, selectedNotice, notices]);

  // ESC 키 닫기
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleClose = () => {
    if (closingRef.current) return;
    closingRef.current = true;

    if (window.history.state && window.history.state.modal === 'notice') {
      window.history.back();
    }

    const overlay = overlayRef.current;
    if (overlay) {
      overlay.classList.remove('notice-modal-overlay--visible');
      let closed = false;
      const onEnd = () => {
        if (closed) return;
        closed = true;
        overlay.removeEventListener('transitionend', onEnd);
        onClose();
      };
      overlay.addEventListener('transitionend', onEnd);
      setTimeout(() => {
        if (!closed) {
          closed = true;
          onClose();
        }
      }, 200);
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  const currentActive = notices.find((n) => n.id === activeNoticeId) || notices[0];

  return (
    <div ref={overlayRef} className="notice-modal-overlay" onClick={handleClose}>
      <div className="notice-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* 모달 헤더 */}
        <div className="notice-modal-header">
          <div className="notice-modal-header__title-group">
            <Megaphone size={18} className="notice-modal-header__icon" />
            <h2 className="notice-modal-header__title">공지사항</h2>
          </div>
          <button className="notice-modal-close-btn" onClick={handleClose} aria-label="닫기">
            <X size={20} />
          </button>
        </div>

        {/* 모달 본문 (좌측 리스트 + 우측 상세) */}
        <div className="notice-modal-body">
          {/* 1. 공지사항 사이드바 리스트 */}
          <aside className="notice-modal-sidebar">
            <div className="notice-modal-sidebar__header">
              <span>전체 공지 목록 ({notices.length})</span>
            </div>
            <ul className="notice-modal-list">
              {notices.map((item) => {
                const isActive = item.id === (currentActive?.id);
                return (
                  <li
                    key={item.id}
                    className={`notice-modal-list__item ${isActive ? 'notice-modal-list__item--active' : ''}`}
                    onClick={() => setActiveNoticeId(item.id)}
                  >
                    <div className="notice-modal-list__item-header">
                      <NoticeCategoryBadge
                        category={item.category}
                        isImportant={item.is_important}
                      />
                      <span className="notice-modal-list__item-date">{item.date}</span>
                    </div>
                    <p className="notice-modal-list__item-title">{item.title}</p>
                    <ChevronRight size={14} className="notice-modal-list__item-arrow" />
                  </li>
                );
              })}
            </ul>
          </aside>

          {/* 2. 공지사항 상세 뷰 */}
          <main className="notice-modal-detail">
            {currentActive ? (
              <article className="notice-detail-content">
                <header className="notice-detail-content__header">
                  <div className="notice-detail-content__meta">
                    <NoticeCategoryBadge
                      category={currentActive.category}
                      isImportant={currentActive.is_important}
                    />
                    <span className="notice-detail-content__date">
                      <Calendar size={13} />
                      {currentActive.date}
                    </span>
                  </div>
                  <h3 className="notice-detail-content__title">{currentActive.title}</h3>
                </header>

                <div className="notice-detail-content__divider"></div>

                {/* 첨부 이미지 (있을 경우) */}
                {currentActive.image && (
                  <div className="notice-detail-content__image-wrapper">
                    <img
                      src={currentActive.image.startsWith('http') ? currentActive.image : `/assets/${currentActive.image}`}
                      alt={currentActive.title}
                      className="notice-detail-content__image"
                    />
                  </div>
                )}

                {/* 공지 본문 텍스트 */}
                <div className="notice-detail-content__body">
                  {currentActive.content.split('\n').map((line, idx) => (
                    <p key={idx}>{line || '\u00A0'}</p>
                  ))}
                </div>

                {/* 외부 링크 (있을 경우) */}
                {currentActive.link && (
                  <div className="notice-detail-content__link-box">
                    <a
                      href={currentActive.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="notice-detail-link-btn"
                    >
                      <span>관련 링크 바로가기</span>
                      <ExternalLink size={14} />
                    </a>
                  </div>
                )}
              </article>
            ) : (
              <div className="notice-detail-empty">
                <p>선택된 공지사항이 없습니다.</p>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

export default memo(NoticeModal);
