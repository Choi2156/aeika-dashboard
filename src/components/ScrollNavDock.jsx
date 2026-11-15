import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowUpToLine, ArrowDownToLine } from 'lucide-react';

const SCROLLABLE_MIN_PX = 140;
const EDGE_THRESHOLD_PX = 24;

/**
 * ScrollNavDock — 우측 하단 페이지 상단/하단 빠른 이동 플로팅 독
 * - 모달 열림, 간트 전체화면, 스크롤 불필요 상태에서는 자동으로 숨겨 기존 UI를 방해하지 않음
 * - 스크롤 경계 상태 변화 시에만 상태를 갱신해 불필요한 리렌더링 방지
 */
export default function ScrollNavDock({ isHidden = false, currentView }) {
  const [scrollState, setScrollState] = useState({
    isScrollable: false,
    atTop: true,
    atBottom: false,
  });
  const rafRef = useRef(null);

  const updateScrollState = useCallback(() => {
    const docEl = document.documentElement;
    const scrollY = window.scrollY || docEl.scrollTop || 0;
    const maxScroll = Math.max(0, docEl.scrollHeight - window.innerHeight);

    const next = {
      isScrollable: maxScroll > SCROLLABLE_MIN_PX,
      atTop: scrollY <= EDGE_THRESHOLD_PX,
      atBottom: maxScroll > 0 && scrollY >= maxScroll - EDGE_THRESHOLD_PX,
    };

    setScrollState((prev) =>
      prev.isScrollable === next.isScrollable &&
      prev.atTop === next.atTop &&
      prev.atBottom === next.atBottom
        ? prev
        : next
    );
  }, []);

  const scheduleUpdate = useCallback(() => {
    if (rafRef.current !== null) return;
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      updateScrollState();
    });
  }, [updateScrollState]);

  useEffect(() => {
    scheduleUpdate();
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate, { passive: true });

    let observer = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(scheduleUpdate);
      observer.observe(document.documentElement);
    }

    return () => {
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
      if (observer) observer.disconnect();
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [scheduleUpdate, currentView]);

  const getScrollBehavior = () => {
    if (
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ) {
      return 'auto';
    }
    return 'smooth';
  };

  const handleScrollTop = () => {
    if (scrollState.atTop) return;
    window.scrollTo({ top: 0, behavior: getScrollBehavior() });
  };

  const handleScrollBottom = () => {
    if (scrollState.atBottom) return;
    const targetTop = Math.max(
      0,
      document.documentElement.scrollHeight - window.innerHeight
    );
    window.scrollTo({ top: targetTop, behavior: getScrollBehavior() });
  };

  const effectiveHidden = isHidden || !scrollState.isScrollable;

  return (
    <nav
      className={`scroll-nav-dock ${effectiveHidden ? 'scroll-nav-dock--hidden' : ''}`}
      aria-label="페이지 상하단 빠른 이동"
      aria-hidden={effectiveHidden}
    >
      <button
        type="button"
        className="scroll-nav-dock__btn"
        onClick={handleScrollTop}
        disabled={effectiveHidden || scrollState.atTop}
        tabIndex={effectiveHidden ? -1 : 0}
        aria-label="페이지 맨 위로 이동"
        title="맨 위로"
      >
        <ArrowUpToLine size={15} strokeWidth={2.1} aria-hidden="true" />
      </button>
      <span className="scroll-nav-dock__divider" aria-hidden="true" />
      <button
        type="button"
        className="scroll-nav-dock__btn"
        onClick={handleScrollBottom}
        disabled={effectiveHidden || scrollState.atBottom}
        tabIndex={effectiveHidden ? -1 : 0}
        aria-label="페이지 맨 아래로 이동"
        title="맨 아래로"
      >
        <ArrowDownToLine size={15} strokeWidth={2.1} aria-hidden="true" />
      </button>
    </nav>
  );
}
