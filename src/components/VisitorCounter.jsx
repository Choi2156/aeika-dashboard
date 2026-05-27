import React, { useState, useEffect } from 'react';
import { Eye } from 'lucide-react';
import '../styles/VisitorCounter.css';

export default function VisitorCounter() {
  const [hits, setHits] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const badgeUrl = "https://api.visitorbadge.io/api/visitors?path=https%3A%2F%2Fchoi2156.github.io%2Faeika-dashboard%2F&label=%EB%88%84%EC%A0%81%20%EC%A1%B0%ED%9A%8C%EC%88%98&labelColor=%232b2e4a&countColor=%23e84545&style=flat-square";

    const fetchHits = async () => {
      try {
        // 3초 타임아웃 제한으로 무한 대기 방어
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const response = await fetch(badgeUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) throw new Error('API 로드 실패');

        const svgText = await response.text();
        
        // visitorbadge SVG에서 카운트 값에 해당하는 두 번째 <text> 노드 정규식 추출
        const textMatches = svgText.match(/<text[^>]*>([^<]+)<\/text>/g);
        if (textMatches && textMatches.length >= 2) {
          const rawCount = textMatches[1].replace(/<[^>]*>/g, '').trim();
          if (isMounted) {
            setHits(rawCount);
            setLoading(false);
          }
        } else {
          throw new Error('SVG 파싱 실패');
        }
      } catch (err) {
        console.warn("조회수 통계 로딩 지연/실패 (안전 모드로 가동):", err.message);
        if (isMounted) {
          // 실패하더라도 크래시 없이 조용히 대체 수치를 표시하거나 로딩을 마칩니다.
          setHasError(true);
          setLoading(false);
        }
      }
    };

    fetchHits();
    return () => { isMounted = false; };
  }, []);

  if (hasError && !hits) {
    // API 연결 오류 시, 레이아웃을 해치지 않고 심플하게 숨김 처리하여 100% 안전 보장
    return null;
  }

  return (
    <div className={`header__visitor-btn ${loading ? 'loading' : 'loaded'}`} title="대시보드 누적 조회수">
      <Eye size={14} className="visitor-btn__icon" />
      <span className="visitor-btn__label">누적 조회수</span>
      <span className="visitor-btn__count">{loading ? '...' : hits}</span>
    </div>
  );
}
