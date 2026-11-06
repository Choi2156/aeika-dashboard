import { useState, useEffect, memo } from 'react';
import { X, Megaphone, Calendar, ExternalLink, ChevronRight } from 'lucide-react';
import NoticeCategoryBadge from './NoticeCategoryBadge';
import ModalShell from './common/ModalShell';
import '../styles/NoticeModal.css';

function NoticeModal({ isOpen, onClose, notices = [], selectedNotice = null }) {
  const [activeNoticeId, setActiveNoticeId] = useState(null);

  useEffect(() => {
    if (isOpen && notices.length > 0) {
      if (selectedNotice && selectedNotice.id) {
        setActiveNoticeId(selectedNotice.id);
      } else {
        setActiveNoticeId(notices[0].id);
      }
    }
  }, [isOpen, selectedNotice, notices]);

  const currentActive = notices.find((n) => n.id === activeNoticeId) || notices[0];

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      modalKey="notice"
      overlayClassName="notice-modal-overlay"
      visibleClassName="notice-modal-overlay--visible"
      dialogClassName="notice-modal-container"
    >
      {({ requestClose }) => (
        <>
          <div className="notice-modal-header">
            <div className="notice-modal-header__title-group">
              <Megaphone size={17} className="notice-modal-header__icon" />
              <h2 className="notice-modal-header__title">공지사항</h2>
            </div>
            <button
              className="notice-modal-close-btn"
              onClick={requestClose}
              aria-label="닫기"
            >
              <X size={18} />
            </button>
          </div>

          <div className="notice-modal-body">
            <aside className="notice-modal-sidebar">
              <div className="notice-modal-sidebar__header">
                <span>전체 공지 목록 ({notices.length})</span>
              </div>
              <ul className="notice-modal-list">
                {notices.map((item) => {
                  const isActive = item.id === currentActive?.id;
                  return (
                    <li
                      key={item.id}
                      className={`notice-modal-list__item ${
                        isActive ? 'notice-modal-list__item--active' : ''
                      }`}
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

                  <div className="notice-detail-content__divider" />

                  {currentActive.image && (
                    <div className="notice-detail-content__image-wrapper">
                      <img
                        src={
                          currentActive.image.startsWith('http')
                            ? currentActive.image
                            : `./assets/${currentActive.image}`
                        }
                        alt={currentActive.title}
                        className="notice-detail-content__image"
                      />
                    </div>
                  )}

                  <div className="notice-detail-content__body">
                    {currentActive.content.split('\n').map((line, idx) => (
                      <p key={idx}>{line || '\u00A0'}</p>
                    ))}
                  </div>

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
        </>
      )}
    </ModalShell>
  );
}

export default memo(NoticeModal);
