import React, { useState } from 'react';
import '../styles/VisitorCounter.css';

export default function VisitorCounter() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // api.visitorbadge.io API는 누적(Total) 및 고유(Unique) 방문자를 함께 렌더링해주는 combined 배지를 제공합니다.
  const badgeUrl = "https://api.visitorbadge.io/api/combined?path=https%3A%2F%2Fchoi2156.github.io%2Faeika-dashboard%2F&label=VISITORS&labelColor=%232b2e4a&countColor=%23e84545&style=flat-square";

  if (hasError) {
    // API 에러 발생 시 UI를 전혀 렌더링하지 않고 조용히 리턴하여 크래시 및 미관 손상을 완벽히 방어합니다.
    return null;
  }

  return (
    <div className={`visitor-counter-container ${isLoaded ? 'loaded' : 'loading'}`}>
      <div className="visitor-counter-inner">
        <span className="counter-label-icon">📈</span>
        <span className="counter-text">누적 통계</span>
        <div className="badge-wrapper">
          {!isLoaded && <div className="badge-skeleton" />}
          <img
            src={badgeUrl}
            alt="방문자 집계"
            className={`visitor-badge-img ${isLoaded ? 'visible' : 'hidden'}`}
            onLoad={() => setIsLoaded(true)}
            onError={() => {
              setHasError(true);
              console.warn("방문자 카운터 로드 실패 - 크래시 방지를 위해 카운터가 비활성화되었습니다.");
            }}
          />
        </div>
      </div>
    </div>
  );
}
