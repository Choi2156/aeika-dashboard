import React, { useState } from 'react';
import '../styles/VisitorCounter.css';

export default function VisitorCounter() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // api.visitorbadge.io의 combined 배지 라벨을 완전히 한글화("누적 조회수 | 누적 방문자")하여 직접 노출합니다.
  const badgeUrl = "https://api.visitorbadge.io/api/combined?path=https%3A%2F%2Fchoi2156.github.io%2Faeika-dashboard%2F&label=%EB%88%84%EC%A0%81%20%EC%A1%B0%ED%9A%8C%EC%88%98%20%7C%20%EB%88%84%EC%A0%81%20%EB%B0%A9%EB%AC%B8%EC%9E%90&labelColor=%231e1e2e&countColor=%23e84545&style=flat-square";

  if (hasError) {
    // API 에러 발생 시 UI를 전혀 렌더링하지 않아 대시보드 크래시를 완벽 차단합니다.
    return null;
  }

  return (
    <div className={`visitor-counter-container ${isLoaded ? 'loaded' : 'loading'}`}>
      <div className="badge-wrapper">
        {!isLoaded && <div className="badge-skeleton" />}
        <img
          src={badgeUrl}
          alt="누적 조회수 및 누적 방문자 통계"
          className={`visitor-badge-img ${isLoaded ? 'visible' : 'hidden'}`}
          onLoad={() => setIsLoaded(true)}
          onError={() => {
            setHasError(true);
            console.warn("방문자 카운터 로드 실패 - 크래시 방지를 위해 카운터가 비활성화되었습니다.");
          }}
        />
      </div>
    </div>
  );
}
