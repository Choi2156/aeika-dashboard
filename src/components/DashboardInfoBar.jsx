import { Calendar, CalendarDays } from 'lucide-react';
import '../styles/components.css';

/**
 * DashboardInfoBar 컴포넌트
 * 헤더 아래 및 필터바 위에 위치하며, 오늘 날짜와 이달의 종합 캘린더 이미지 팝업 버튼을
 * 세련된 다크 글라스모피즘 스타일로 노출합니다.
 */
export default function DashboardInfoBar({ meta, onOpenCalendar }) {
  const today = new Date();

  // 오늘 날짜 포맷팅 (YYYY년 MM월 DD일 (요일))
  const getTodayFormatted = () => {
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const date = today.getDate();
    const day = days[today.getDay()];
    return `${year}년 ${month}월 ${date}일 (${day})`;
  };

  const currentMonth = today.getMonth() + 1;

  return (
    <div className="dashboard-info-bar">
      {/* 📅 좌측: 오늘 기준 실시간 날짜 */}
      <div className="dashboard-info-bar__item dashboard-info-bar__item--today">
        <Calendar size={13} className="info-bar-icon info-bar-icon--today" />
        <span className="info-bar-label">오늘 기준점 :</span>
        <span className="info-bar-value">{getTodayFormatted()}</span>
      </div>

      {/* 🖼️ 우측: 이달의 종합 캘린더 이미지 팝업 버튼 */}
      <button
        type="button"
        className="dashboard-info-bar__calendar-btn"
        onClick={onOpenCalendar}
        title="이달의 서브컬쳐 종합 스케줄 캘린더 이미지 보기 및 다운로드"
      >
        <CalendarDays size={13} className="info-bar-icon--calendar" />
        <span className="info-bar-calendar-label">캘린더 다운로드</span>
      </button>
    </div>
  );
}
