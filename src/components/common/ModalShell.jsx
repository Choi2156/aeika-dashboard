import { useEffect, useRef, useState } from 'react';

/**
 * ModalShell — 전체 모달의 히스토리(뒤로가기), ESC 키, 배경 클릭, 애니메이션 생명주기를
 * 단일 안전 계층으로 통합 관리하는 공용 모달 래퍼 컴포넌트입니다.
 */
export default function ModalShell({
  isOpen,
  onClose,
  modalKey = 'dialog',
  overlayClassName = 'modal-overlay',
  visibleClassName = 'modal-visible',
  dialogClassName = 'modal-body',
  ariaLabelledBy,
  children,
}) {
  const overlayRef = useRef(null);
  const dialogRef = useRef(null);
  const closingRef = useRef(false);
  const pushedHistoryRef = useRef(false);
  const previousFocusRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setIsVisible(false);
      if (previousFocusRef.current && document.contains(previousFocusRef.current)) {
        try {
          previousFocusRef.current.focus({ preventScroll: true });
        } catch {
          // ignore focus error
        }
        previousFocusRef.current = null;
      }
      return;
    }

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closingRef.current = false;
    pushedHistoryRef.current = false;

    const frame = requestAnimationFrame(() => {
      setIsVisible(true);
      if (dialogRef.current) {
        const firstFocusable = dialogRef.current.querySelector(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (firstFocusable instanceof HTMLElement) {
          firstFocusable.focus({ preventScroll: true });
        } else {
          dialogRef.current.focus({ preventScroll: true });
        }
      }
    });

    try {
      window.history.pushState({ modal: modalKey }, '');
      pushedHistoryRef.current = true;
    } catch {
      pushedHistoryRef.current = false;
    }

    const onPopState = () => {
      pushedHistoryRef.current = false;
      triggerClose(true);
    };

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        triggerClose(false);
        return;
      }
      if (e.key === 'Tab' && dialogRef.current) {
        const focusables = Array.from(
          dialogRef.current.querySelectorAll(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        ).filter((el) => el instanceof HTMLElement && el.offsetParent !== null);

        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('popstate', onPopState);
    window.addEventListener('keydown', onKeyDown);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('popstate', onPopState);
      window.removeEventListener('keydown', onKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, modalKey]);

  const triggerClose = (fromPopState = false) => {
    if (closingRef.current) return;
    closingRef.current = true;
    setIsVisible(false);

    if (
      !fromPopState &&
      pushedHistoryRef.current &&
      window.history.state &&
      window.history.state.modal === modalKey
    ) {
      pushedHistoryRef.current = false;
      try {
        window.history.back();
      } catch {
        // ignore history error
      }
    }

    setTimeout(() => {
      if (onClose) onClose();
    }, 180);
  };

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className={`${overlayClassName} ${isVisible ? visibleClassName : ''}`.trim()}
      onClick={(e) => {
        if (e.target === overlayRef.current) {
          triggerClose(false);
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={ariaLabelledBy}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={dialogClassName}
        onClick={(e) => e.stopPropagation()}
      >
        {typeof children === 'function' ? children({ requestClose: () => triggerClose(false) }) : children}
      </div>
    </div>
  );
}
