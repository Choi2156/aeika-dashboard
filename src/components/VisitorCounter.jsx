import React, { useState, useEffect } from 'react';
import { Eye } from 'lucide-react';
import '../styles/VisitorCounter.css';

const CACHE_KEY = 'aeika_visitor_count_cache';

export default function VisitorCounter() {
  const [hits, setHits] = useState(() => {
    try {
      return localStorage.getItem(CACHE_KEY) || null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const badgeUrl =
      'https://api.visitorbadge.io/api/visitors?path=https%3A%2F%2Fchoi2156.github.io%2Faeika-dashboard%2F&label=%EB%88%84%EC%A0%81%20%EB%B0%A9%EB%AC%B8%EC%88%98&labelColor=%232b2e4a&countColor=%23e84545&style=flat-square';

    const fetchHits = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const response = await fetch(badgeUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) throw new Error('API 로드 실패');

        const svgText = await response.text();
        const textMatches = svgText.match(/<text[^>]*>([^<]+)<\/text>/g);
        if (textMatches && textMatches.length >= 2) {
          const rawCount = textMatches[1].replace(/<[^>]*>/g, '').trim();
          if (isMounted) {
            setHits(rawCount);
            setLoading(false);
            setHasError(false);
            try {
              localStorage.setItem(CACHE_KEY, rawCount);
            } catch {
              // ignore storage errors
            }
          }
        } else {
          throw new Error('SVG 파싱 실패');
        }
      } catch (err) {
        console.warn('방문수 통계 로딩 지연/실패 (안전 모드로 가동):', err.message);
        if (isMounted) {
          setHasError(true);
          setLoading(false);
        }
      }
    };

    fetchHits();
    return () => {
      isMounted = false;
    };
  }, []);

  const isLocalHost =
    typeof window !== 'undefined' &&
    /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);

  const displayCount = loading && !hits
    ? '...'
    : hits || (hasError ? (isLocalHost ? 'LOCAL' : '--') : '--');

  return (
    <span
      className={`header__visitor-btn ${loading ? 'loading' : 'loaded'}`}
      title={
        hasError && !hits
          ? '대시보드 누적 방문수 (로컬/오프라인 대기 상태)'
          : '대시보드 누적 방문수'
      }
    >
      <span className="visitor-btn__left">
        <Eye size={13} className="visitor-btn__icon" />
        <span className="visitor-btn__label">누적 방문수</span>
      </span>
      <span className="visitor-btn__count">{displayCount}</span>
    </span>
  );
}
