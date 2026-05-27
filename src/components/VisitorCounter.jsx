import React, { useState } from 'react';
import '../styles/VisitorCounter.css';

export default function VisitorCounter() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // 누적 조회수만 단독으로 표시하여 직관성을 높입니다.
  const badgeUrl = "https://api.visitorbadge.io/api/visitors?path=https%3A%2F%2Fchoi2156.github.io%2Faeika-dashboard%2F&label=%EB%88%84%EC%A0%81%20%EC%A1%B0%ED%9A%8C%EC%88%98&labelColor=%232b2e4a&countColor=%23e84545&style=flat-square";

  if (hasError) {
    // 로드 실패 시 에러 폴백 - 조용히 언마운트되어 UI 무결성을 유지합니다.
    return null;
  }

  return (
    <div className={`visitor-counter-container ${isLoaded ? 'loaded' : 'loading'}`}>
      <div className="badge-wrapper">
        {!isLoaded && <div className="badge-skeleton" />}
        <img
          src={badgeUrl}
          alt="누적 조회수 통계"
          className={`visitor-badge-img ${isLoaded ? 'visible' : 'hidden'}`}
          onLoad={() => setIsLoaded(true)}
          onError={() => {
            setHasError(true);
            console.warn("조회수 카운터 로드 실패 - 크래시 방지를 위해 비활성화되었습니다.");
          }}
        />
      </div>
    </div>
  );
}
