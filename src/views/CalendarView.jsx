import { useState, useMemo, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Image as ImageIcon,
  Sparkles,
  Clock,
  Info,
  ArrowUpRight,
} from 'lucide-react';
import { extractCalendarMilestones, buildMonthGrid } from '../utils/calendarMilestones';
import { getCleanSummaryText } from '../utils/eventTextParser';
import { getTodayStrKST, diffDays, formatDisplayDate } from '../utils/dateKST';
import '../styles/CalendarView.css';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

/**
 * CalendarView 2.0 — 내장형 인터랙티브 월간 마일스톤 캘린더 + 우측 인스펙터 사이드바
 * - 데스크톱: 좌측 7열 월간 그리드 + 우측 인스펙터 패널(선택일 상세 브리핑 & 당월 마일스톤 타임라인)
 * - 모바일: 상단 컴팩트 월간 그리드 + 하단 선택일 상세 카드
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
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [inspectorMode, setInspectorMode] = useState('day'); // 'day' | 'month'

  useEffect(() => {
    if (!jumpTodayTrigger) return;
    setYear(todayYear);
    setMonth(todayMonth);
    setSelectedDate(todayStr);
    setInspectorMode('day');
  }, [jumpTodayTrigger, todayYear, todayMonth, todayStr]);

  const milestones = useMemo(() => {
    const all = extractCalendarMilestones(events, activeGames);
    if (categoryFilter === 'ALL') return all;
    return all.filter((m) => m.category === categoryFilter);
  }, [events, activeGames, categoryFilter]);

  const weeks = useMemo(() => {
    const { cells } = buildMonthGrid(year, month, milestones, todayStr);
    const rows = [];
    for (let i = 0; i < cells.length; i += 7) {
      rows.push(cells.slice(i, i + 7));
    }
    return rows;
  }, [year, month, milestones, todayStr]);

  const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;
  const monthMilestones = useMemo(() => {
    return milestones
      .filter((m) => m.date.startsWith(monthPrefix))
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.priority - b.priority;
      });
  }, [milestones, monthPrefix]);

  const selectedDayMilestones = useMemo(
    () => milestones.filter((m) => m.date === selectedDate),
    [milestones, selectedDate]
  );

  // 선택한 날짜에 마일스톤이 하나도 없으면 우측 인스펙터에서 해당 월 전체 마일스톤도 함께 안내
  const handleSelectDate = (dateStr) => {
    setSelectedDate(dateStr);
    setInspectorMode('day');
  };

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
    setSelectedDate(todayStr);
    setInspectorMode('day');
  };

  const renderInspectorCard = (item, showDateBadge = false) => {
    const gameTheme = gamesConfig?.[item.game]?.theme || {};
    const color = gameTheme.color || '#818cf8';
    const summary = getCleanSummaryText(item.rawEvent?.detail, 95);
    const dDiff = diffDays(todayStr, item.date);
    const dDayLabel =
      dDiff === 0 ? 'TODAY' : dDiff > 0 ? `D-${dDiff}` : `${Math.abs(dDiff)}일 전`;

    return (
      <div
        key={item.id}
        className="calendar-day-card"
        style={{ '--card-color': color }}
        onClick={() => {
          if (onEventClick && item.rawEvent) {
            onEventClick(item.rawEvent, item.displayType, 'calendar_inspector');
          }
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (onEventClick && item.rawEvent) {
              onEventClick(item.rawEvent, item.displayType, 'calendar_inspector');
            }
          }
        }}
      >
        <div className="calendar-day-card__top">
          <div className="calendar-day-card__badges">
            <span className="calendar-day-card__game">{item.game}</span>
            <span className="calendar-day-card__cat">
              {item.categoryLabel || item.category}
            </span>
            <span
              className={`calendar-day-card__status ${
                item.isFixed ? 'is-fixed' : 'is-est'
              }`}
            >
              {item.isFixed ? '확정' : '예상'}
            </span>
          </div>
          <div className="calendar-day-card__right-meta">
            {showDateBadge && (
              <span className="calendar-day-card__date">
                {formatDisplayDate(item.date, true)}
              </span>
            )}
            <span
              className={`calendar-day-card__dday ${
                dDiff === 0 ? 'is-today' : dDiff > 0 && dDiff <= 5 ? 'is-soon' : ''
              }`}
            >
              {dDayLabel}
            </span>
          </div>
        </div>
        <div className="calendar-day-card__title">
          <span>{item.rawEvent?.title || item.title}</span>
          <ArrowUpRight size={13} className="calendar-day-card__arrow" />
        </div>
        {summary && <div className="calendar-day-card__desc">{summary}</div>}
      </div>
    );
  };

  return (
    <div className="calendar-view">
      {/* 1. 상단 컨트롤 헤더 */}
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
            <span className="calendar-view__month-count">{monthMilestones.length}건</span>
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
          <div className="calendar-view__cat-tabs" role="group" aria-label="일정 유형 필터">
            {[
              { key: 'ALL', label: '전체' },
              { key: 'update', label: '업데이트' },
              { key: 'half', label: '후반 픽업' },
              { key: 'broadcast', label: '특별 방송' },
              { key: 'offline', label: '오프라인' },
            ].map((cat) => (
              <button
                key={cat.key}
                type="button"
                className={`calendar-view__cat-tab ${
                  categoryFilter === cat.key ? 'calendar-view__cat-tab--active' : ''
                }`}
                onClick={() => setCategoryFilter(cat.key)}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {onOpenCalendarModal && (
            <button
              type="button"
              className="calendar-view__export-btn"
              onClick={() => onOpenCalendarModal(year, month)}
              title={`${year}년 ${month}월 달력 이미지 보기 및 다운로드`}
            >
              <ImageIcon size={13} />
              <span>{month}월 달력 이미지</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. 범례 안내 바 */}
      <div className="calendar-view__legend">
        <span className="calendar-view__legend-item">
          <span className="calendar-view__legend-box calendar-view__legend-box--confirmed" />
          공식 확정 일정
        </span>
        <span className="calendar-view__legend-item">
          <span className="calendar-view__legend-box calendar-view__legend-box--predicted" />
          주기 기반 예상 일정 (점선)
        </span>
        <span className="calendar-view__legend-hint">
          <Info size={12} />
          <span>날짜 칸이나 일정 칩을 선택하면 우측 인스펙터와 상세 모달에서 세부 정보를 확인할 수 있습니다.</span>
        </span>
      </div>

      {/* 3. 메인 2단 워크스페이스: 좌측 7열 캘린더 그리드 + 우측 인스펙터 사이드바 */}
      <div className="calendar-view__workspace">
        {/* 좌측: 7열 월간 그리드 */}
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
                  const isSelected = cell.dateStr === selectedDate;
                  const cellItems = cell.milestones || [];
                  const hasItems = cellItems.length > 0;

                  return (
                    <div
                      key={cell.dateStr}
                      className={[
                        'calendar-view__cell',
                        !cell.isCurrentMonth ? 'calendar-view__cell--empty' : '',
                        cell.isToday ? 'calendar-view__cell--today' : '',
                        isSelected ? 'calendar-view__cell--selected' : '',
                        hasItems ? 'calendar-view__cell--has-items' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onClick={() => handleSelectDate(cell.dateStr)}
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
                        {hasItems && (
                          <span className="calendar-view__mobile-count">
                            {cellItems.length}
                          </span>
                        )}
                      </div>

                      <div className="calendar-view__cell-events">
                        {cellItems.map((item) => {
                          const gameTheme = gamesConfig?.[item.game]?.theme || {};
                          const color = gameTheme.color || '#818cf8';
                          const colorDark = gameTheme.colorDark || '#4338ca';

                          return (
                            <button
                              key={item.id}
                              type="button"
                              className={`calendar-chip ${
                                item.isFixed
                                  ? 'calendar-chip--confirmed'
                                  : 'calendar-chip--predicted'
                              }`}
                              style={{
                                '--chip-color': color,
                                '--chip-color-dark': colorDark,
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectDate(cell.dateStr);
                                if (onEventClick && item.rawEvent) {
                                  onEventClick(item.rawEvent, item.displayType, 'calendar');
                                }
                              }}
                              title={`[${item.game}] ${item.title} (${
                                item.isFixed ? '확정' : '예상'
                              })`}
                            >
                              <span className="calendar-chip__bar" />
                              <span className="calendar-chip__game">{item.gameShort}</span>
                              <span className="calendar-chip__label">{item.title}</span>
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

        {/* 우측: 선택일 / 이달의 일정 인스펙터 사이드바 */}
        <aside className="calendar-view__inspector">
          <div className="calendar-view__inspector-header">
            <div className="calendar-view__inspector-tabs">
              <button
                type="button"
                className={`calendar-view__inspector-tab ${
                  inspectorMode === 'day' ? 'is-active' : ''
                }`}
                onClick={() => setInspectorMode('day')}
              >
                <Sparkles size={13} />
                <span>{formatDisplayDate(selectedDate, true)}</span>
                <span className="calendar-view__inspector-count">
                  {selectedDayMilestones.length}
                </span>
              </button>
              <button
                type="button"
                className={`calendar-view__inspector-tab ${
                  inspectorMode === 'month' ? 'is-active' : ''
                }`}
                onClick={() => setInspectorMode('month')}
              >
                <Clock size={13} />
                <span>{month}월 전체</span>
                <span className="calendar-view__inspector-count">
                  {monthMilestones.length}
                </span>
              </button>
            </div>
          </div>

          <div className="calendar-view__inspector-body">
            {inspectorMode === 'day' ? (
              selectedDayMilestones.length > 0 ? (
                <div className="calendar-view__day-panel-list">
                  {selectedDayMilestones.map((item) => renderInspectorCard(item, false))}
                </div>
              ) : (
                <div className="calendar-view__inspector-empty">
                  <p className="calendar-view__inspector-empty-title">
                    {formatDisplayDate(selectedDate, true)}에는 등록된 주요 마일스톤이 없습니다.
                  </p>
                  <p className="calendar-view__inspector-empty-sub">
                    달력에서 칩이 표시된 날짜를 클릭하거나 아래 버튼을 눌러 {month}월 전체 마일스톤을 확인해 보세요.
                  </p>
                  {monthMilestones.length > 0 && (
                    <button
                      type="button"
                      className="calendar-view__inspector-switch-btn"
                      onClick={() => setInspectorMode('month')}
                    >
                      {month}월 전체 일정 ({monthMilestones.length}건) 보기
                    </button>
                  )}
                </div>
              )
            ) : monthMilestones.length > 0 ? (
              <div className="calendar-view__day-panel-list">
                {monthMilestones.map((item) => renderInspectorCard(item, true))}
              </div>
            ) : (
              <div className="calendar-view__inspector-empty">
                <p className="calendar-view__inspector-empty-title">
                  조건에 맞는 {month}월 일정이 없습니다.
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
