import { Calendar, RefreshCw } from 'lucide-react';
import '../styles/components.css';

/**
 * DashboardInfoBar 컴포넌트
 * 헤더 아래 및 필터바 위에 위치하며, 오늘 날짜와 최근 데이터 업데이트 날짜를 
 * 세련된 다크 글라스모피즘 스타일로 노출하여 메뉴 바의 공간 협소 문제를 원천 해결합니다.
 */
export default function DashboardInfoBar({ meta }) {
  // 오늘 날짜 포맷팅 (YYYY년 MM월 DD일 (요일))
  const getTodayFormatted = () => {
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const date = today.getDate();
    const day = days[today.getDay()];
    return `${year}년 ${month}월 ${date}일 (${day})`;
  };

  // 업데이트 날짜 포맷팅 (YYYY-MM-DD)
  const getUpdatedFormatted = (lastUpdated) => {
    if (!lastUpdated) return '데이터 연동 대기 중';
    const d = new Date(lastUpdated);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const date = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${date}`;
  };

  return (
    <div className="dashboard-info-bar">
      {/* 📅 좌측: 오늘 기준 실시간 날짜 */}
      <div className="dashboard-info-bar__item dashboard-info-bar__item--today">
        <Calendar size={13} className="info-bar-icon info-bar-icon--today" />
        <span className="info-bar-label">오늘 기준점 :</span>
        <span className="info-bar-value">{getTodayFormatted()}</span>
      </div>

      {/* 🔄 우측: 최근 업데이트 날짜 */}
      <div className="dashboard-info-bar__item dashboard-info-bar__item--updated">
        <RefreshCw size={13} className="info-bar-icon info-bar-icon--updated" />
        <span className="info-bar-label">최종 데이터 업데이트 :</span>
        <span className="info-bar-value">{getUpdatedFormatted(meta?.last_updated)}</span>
      </div>
    </div>
  );
}
