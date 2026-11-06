import { useState, useMemo, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Image as ImageIcon,
} from 'lucide-react';
import { extractCalendarMilestones, buildMonthGrid } from '../utils/calendarMilestones';
import { getTodayStrKST } from '../utils/dateKST';
import '../styles/CalendarView.css';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function hexToRgbStr(hex) {
  if (!hex || typeof hex !== 'string') return '129, 140, 248';
  const clean = hex.replace('#', '');
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return `${r}, ${g}, ${b}`;
  }
  if (clean.length === 6) {
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return `${r}, ${g}, ${b}`;
  }
  return '129, 140, 248';
}

/**
 * CalendarView v2.1 — Full-Width 7열 월간 마일스톤 달력
 * - 우측 고정 인스펙터 패널 및 상단 중복 카테고리 탭 제거 ➔ 100% 전체 폭 7열 그리드
 * - 일정 유형별(업데이트 솔리드 / 후반 픽업 틴트 / 특별방송 LIVE+시각 / 오프라인 🎪 EVENT) & 확정/예상(점선) 시각 위계 차등화
 * - 일정 칩 클릭 시 공용 DetailModal 팝업 즉시 호출
 */
export default function CalendarView({
  events,
  gamesConfig,
  activeGames,
  onEventClick,
  onOpenCalendarModal,
  jumpTodayTrigger,
}) {
  const todayStr = useMemo(() => getTodayStrKST(), []);
  const [todayYear, todayMonth] = useMemo(() => {
    const parts = todayStr.split('-').map(Number);
    return [parts[0] || 2026, parts[1] || 11];
  }, [todayStr]);

  const [year, setYear] = useState(todayYear);
  const [month, setMonth] = useState(todayMonth);

  useEffect(() => {
    if (!jumpTodayTrigger) return;
    setYear(todayYear);
    setMonth(todayMonth);
  }, [jumpTodayTrigger, todayYear, todayMonth]);

  const milestones = useMemo(() => {
    return extractCalendarMilestones(events, activeGames);
  }, [events, activeGames]);

  const weeks = useMemo(() => {
    const { cells } = buildMonthGrid(year, month, milestones, todayStr);
    const rows = [];
    for (let i = 0; i < cells.length; i += 7) {
      rows.push(cells.slice(i, i + 7));
    }
    return rows;
  }, [year, month, milestones, todayStr]);

  const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;
  const monthMilestonesCount = useMemo(() => {
    return milestones.filter((m) => m.date.startsWith(monthPrefix)).length;
  }, [milestones, monthPrefix]);

  const handlePrevMonth = () => {
    if (month === 1) {
      setYear((y) => y - 1);
      setMonth(12);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setYear((y) => y + 1);
      setMonth(1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const handleGoCurrentMonth = () => {
    setYear(todayYear);
    setMonth(todayMonth);
  };

  return (
    <div className="calendar-view">
      {/* 1. 상단 통합 헤더 (연/월 네비게이션 + 시각 범례 + 달력 이미지 버튼) */}
      <div className="calendar-view__header">
        <div className="calendar-view__nav-group">
          <button
            type="button"
            className="calendar-view__nav-btn"
            onClick={handlePrevMonth}
            aria-label="이전 달"
            title="이전 달"
          >
            <ChevronLeft size={17} />
          </button>

          <h2 className="calendar-view__month-title">
            <CalendarIcon size={17} className="calendar-view__month-icon" />
            <span>
              {year}년 {month}월
            </span>
            <span className="calendar-view__month-count">{monthMilestonesCount}건</span>
          </h2>

          <button
            type="button"
            className="calendar-view__nav-btn"
            onClick={handleNextMonth}
            aria-label="다음 달"
            title="다음 달"
          >
            <ChevronRight size={17} />
          </button>

          {(year !== todayYear || month !== todayMonth) && (
            <button
              type="button"
              className="calendar-view__today-pill"
              onClick={handleGoCurrentMonth}
            >
              이번 달로 복귀
            </button>
          )}
        </div>

        <div className="calendar-view__right-controls">
          {/* 4대 일정 유형 & 예상 범례 */}
          <div className="calendar-view__legend">
            <span className="calendar-view__legend-item">
              <span className="calendar-view__legend-swatch is-update" />
              신규 버전 업데이트
            </span>
            <span className="calendar-view__legend-item">
              <span className="calendar-view__legend-swatch is-half" />
              후반 픽업 전환
            </span>
            <span className="calendar-view__legend-item">
              <span className="calendar-view__legend-swatch is-broadcast">LIVE</span>
              특별방송
            </span>
            <span className="calendar-view__legend-item">
              <span className="calendar-view__legend-swatch is-offline">🎪</span>
              오프라인 행사
            </span>
            <span className="calendar-view__legend-item">
              <span className="calendar-view__legend-swatch is-predicted" />
              주기 예상 (점선)
            </span>
          </div>

          {onOpenCalendarModal && (
            <button
              type="button"
              className="calendar-view__export-btn"
              onClick={() => onOpenCalendarModal(year, month)}
              title={`${year}년 ${month}월 고해상도 달력 이미지 보기 및 저장`}
            >
              <ImageIcon size={13} />
              <span>{month}월 달력 이미지</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Full-Width 7열 월간 캘린더 그리드 */}
      <div className="calendar-view__grid-wrapper">
        <div className="calendar-view__weekdays">
          {WEEKDAYS.map((dayName, idx) => (
            <div
              key={dayName}
              className={`calendar-view__weekday ${
                idx === 0 ? 'calendar-view__weekday--sun' : ''
              } ${idx === 6 ? 'calendar-view__weekday--sat' : ''}`}
            >
              {dayName}
            </div>
          ))}
        </div>

        <div className="calendar-view__body">
          {weeks.map((week, wIdx) => (
            <div key={wIdx} className="calendar-view__week-row">
              {week.map((cell, dIdx) => {
                if (!cell) {
                  return (
                    <div
                      key={`empty-${wIdx}-${dIdx}`}
                      className="calendar-view__cell calendar-view__cell--empty"
                    />
                  );
                }

                const isSun = dIdx === 0;
                const isSat = dIdx === 6;
                const cellItems = cell.milestones || [];
                const hasItems = cellItems.length > 0;

                return (
                  <div
                    key={cell.dateStr}
                    className={[
                      'calendar-view__cell',
                      !cell.isCurrentMonth ? 'calendar-view__cell--other-month' : '',
                      cell.isToday ? 'calendar-view__cell--today' : '',
                      hasItems ? 'calendar-view__cell--has-items' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <div className="calendar-view__cell-header">
                      <span
                        className={[
                          'calendar-view__day-num',
                          isSun ? 'calendar-view__day-num--sun' : '',
                          isSat ? 'calendar-view__day-num--sat' : '',
                          cell.isToday ? 'calendar-view__day-num--today' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        {cell.day}
                      </span>
                      {cell.isToday && (
                        <span className="calendar-view__today-tag">TODAY</span>
                      )}
                    </div>

                    <div className="calendar-view__cell-events">
                      {cellItems.map((item) => {
                        const gameConf = gamesConfig?.[item.game] || {};
                        const gameTheme = gameConf.theme || {};
                        const color = gameTheme.color || '#818cf8';
                        const rgb = hexToRgbStr(color);
                        const iconSrc = gameConf.icon || null;
                        const timeShort = item.time ? item.time.slice(0, 5) : '';

                        return (
                          <button
                            key={item.id}
                            type="button"
                            className={[
                              'calendar-chip',
                              `calendar-chip--${item.category}`,
                              item.isEnd ? 'calendar-chip--end' : '',
                              item.isFixed
                                ? 'calendar-chip--confirmed'
                                : 'calendar-chip--predicted',
                            ]
                              .filter(Boolean)
                              .join(' ')}
                            style={{
                              '--chip-color': color,
                              '--chip-rgb': rgb,
                            }}
                            onClick={() => {
                              if (onEventClick && item.rawEvent) {
                                onEventClick(item.rawEvent, item.displayType, 'calendar');
                              }
                            }}
                            title={`[${item.game}] ${item.title}${
                              timeShort ? ` (${timeShort})` : ''
                            } — ${item.isFixed ? '확정' : '주기 예상'}`}
                          >
                            {/* 게임 아이콘 또는 카테고리 포인트 태그 */}
                            {item.category === 'broadcast' ? (
                              <span className="calendar-chip__live-tag">LIVE</span>
                            ) : item.category === 'offline' ? (
                              <span className="calendar-chip__offline-tag">
                                {item.isEnd ? '종료' : '🎪'}
                              </span>
                            ) : iconSrc ? (
                              <img
                                src={iconSrc}
                                alt=""
                                className="calendar-chip__icon"
                                loading="lazy"
                              />
                            ) : (
                              <span className="calendar-chip__dot" />
                            )}

                            {/* 게임 약칭 + 마일스톤 타이틀 */}
                            <span className="calendar-chip__game">{item.gameShort}</span>
                            <span className="calendar-chip__label">{item.title}</span>

                            {/* 우측 보조 메타: 방송 시간 또는 예상 태그 */}
                            {item.category === 'broadcast' && timeShort && (
                              <span className="calendar-chip__time">{timeShort}</span>
                            )}
                            {!item.isFixed && (
                              <span className="calendar-chip__est">예상</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
