import { useEffect, useState, useMemo, useRef } from 'react';
import {
  X,
  Download,
  ExternalLink,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { trackCalendarDownload, trackCalendarFullView } from '../utils/analytics';
import { getNowKSTParts, getTodayStrKST } from '../utils/dateKST';
import { extractCalendarMilestones, buildMonthGrid } from '../utils/calendarMilestones';
import ModalShell from './common/ModalShell';
import '../styles/CalendarModal.css';

const GAME_COLORS = {
  '원신': { main: '#67dbed', rgb: [103, 219, 237] },
  '붕괴: 스타레일': { main: '#9ca4f8', rgb: [156, 164, 248] },
  '젠레스 존 제로': { main: '#ebd66b', rgb: [235, 214, 107] },
  '명조': { main: '#6fe0b6', rgb: [111, 224, 182] },
  '명일방주: 엔드필드': { main: '#fcae74', rgb: [252, 174, 116] },
};

function drawRoundedRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function fitText(ctx, text, maxWidth) {
  if (!text) return '';
  if (ctx.measureText(text).width <= maxWidth) return text;
  let s = text;
  while (s.length > 1 && ctx.measureText(s + '…').width > maxWidth) {
    s = s.slice(0, -1);
  }
  return s + '…';
}

/**
 * 2048x2048 고해상도 캔버스에 v2.1 4단계 배지 디자인으로 월간 달력을 렌더링합니다.
 */
function renderCalendarToCanvas(canvas, year, month, cells, numWeeks, lastUpdated) {
  const W = 2048;
  const H = 2048;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const fontSans = "'Inter', 'Noto Sans KR', 'Malgun Gothic', sans-serif";
  const fontMono = "'JetBrains Mono', 'Consolas', monospace";

  // 1. 전체 배경
  ctx.fillStyle = '#0b0e14';
  ctx.fillRect(0, 0, W, H);

  const marginX = 44;

  // 2. 상단 헤더 영역
  drawRoundedRect(ctx, marginX, 36, W - marginX * 2, 132, 16);
  ctx.fillStyle = '#121722';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#222b3d';
  ctx.stroke();

  // 브랜드 필
  drawRoundedRect(ctx, marginX + 28, 56, 168, 30, 8);
  ctx.fillStyle = 'rgba(99, 102, 241, 0.18)';
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#6366f1';
  ctx.stroke();

  ctx.font = `800 15px ${fontMono}`;
  ctx.fillStyle = '#818cf8';
  ctx.textBaseline = 'middle';
  ctx.fillText('AEIKA ARCHIVE', marginX + 44, 71);

  // 메인 타이틀
  ctx.font = `900 42px ${fontSans}`;
  ctx.fillStyle = '#f8fafc';
  ctx.fillText(`${year}년 ${month}월 서브컬쳐 게임 일정 캘린더`, marginX + 28, 122);

  // 우측 범례 박스
  const legendItems = [
    { label: '신규 버전 업데이트', type: 'update' },
    { label: '후반 픽업 전환', type: 'half' },
    { label: '공식 특별방송', type: 'broadcast' },
    { label: '오프라인 행사', type: 'offline' },
    { label: '주기 예상 (점선)', type: 'predicted' },
  ];

  let lx = W - marginX - 28;
  ctx.font = `700 17px ${fontSans}`;
  for (let i = legendItems.length - 1; i >= 0; i--) {
    const item = legendItems[i];
    const tw = ctx.measureText(item.label).width;
    const boxW = tw + 46;
    lx -= boxW;

    drawRoundedRect(ctx, lx, 60, 26, 20, 5);
    if (item.type === 'update') {
      ctx.fillStyle = '#67dbed';
      ctx.fill();
    } else if (item.type === 'half') {
      ctx.fillStyle = 'rgba(156, 164, 248, 0.25)';
      ctx.fill();
      ctx.strokeStyle = '#9ca4f8';
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (item.type === 'broadcast') {
      ctx.fillStyle = '#ef4444';
      ctx.fill();
    } else if (item.type === 'offline') {
      ctx.fillStyle = 'rgba(139, 92, 246, 0.35)';
      ctx.fill();
      ctx.strokeStyle = '#a78bfa';
      ctx.lineWidth = 2;
      ctx.stroke();
    } else {
      ctx.fillStyle = 'rgba(148, 163, 184, 0.15)';
      ctx.fill();
      ctx.save();
      ctx.setLineDash([4, 3]);
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }

    ctx.fillStyle = '#cbd5e1';
    ctx.font = `700 17px ${fontSans}`;
    ctx.fillText(item.label, lx + 34, 70);
    lx -= 18;
  }

  // 업데이트 기준일 표기
  ctx.font = `600 18px ${fontMono}`;
  ctx.fillStyle = '#94a3b8';
  const updText = `최신 업데이트 기준: ${lastUpdated}  |  실선: 확정 / 점선: 예상`;
  const updW = ctx.measureText(updText).width;
  ctx.fillText(updText, W - marginX - 28 - updW, 126);

  // 3. 요일 헤더
  const gridTop = 186;
  const weekdayH = 50;
  const gridW = W - marginX * 2;
  const colW = gridW / 7;

  drawRoundedRect(ctx, marginX, gridTop, gridW, weekdayH, 12);
  ctx.fillStyle = '#181f2e';
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#222b3d';
  ctx.stroke();

  const weekdays = ['일요일 (SUN)', '월요일 (MON)', '화요일 (TUE)', '수요일 (WED)', '목요일 (THU)', '금요일 (FRI)', '토요일 (SAT)'];
  for (let d = 0; d < 7; d++) {
    const cx = marginX + d * colW + colW / 2;
    ctx.font = `800 18px ${fontSans}`;
    ctx.fillStyle = d === 0 ? '#f87171' : d === 6 ? '#60a5fa' : '#cbd5e1';
    const wText = weekdays[d];
    const ww = ctx.measureText(wText).width;
    ctx.fillText(wText, cx - ww / 2, gridTop + weekdayH / 2);
  }

  // 4. 7열 날짜 셀 그리드
  const cellsTop = gridTop + weekdayH + 12;
  const cellsBottom = H - 72;
  const totalGridH = cellsBottom - cellsTop;
  const rowH = totalGridH / numWeeks;
  const cellGap = 6;

  cells.forEach((cell, idx) => {
    const r = Math.floor(idx / 7);
    const c = idx % 7;
    const x = marginX + c * colW + cellGap / 2;
    const y = cellsTop + r * rowH + cellGap / 2;
    const w = colW - cellGap;
    const h = rowH - cellGap;

    drawRoundedRect(ctx, x, y, w, h, 12);
    if (!cell.isCurrentMonth) {
      ctx.fillStyle = '#0d1119';
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#171e2c';
      ctx.stroke();
    } else if (cell.isToday) {
      ctx.fillStyle = 'rgba(99, 102, 241, 0.08)';
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#6366f1';
      ctx.stroke();
    } else {
      ctx.fillStyle = '#121722';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#222b3d';
      ctx.stroke();
    }

    // 날짜 숫자
    ctx.save();
    if (!cell.isCurrentMonth) ctx.globalAlpha = 0.4;

    const dayStr = String(cell.day);
    ctx.font = `800 22px ${fontMono}`;
    ctx.fillStyle =
      c === 0 ? '#f87171' : c === 6 ? '#60a5fa' : '#e2e8f0';
    ctx.fillText(dayStr, x + 14, y + 24);

    if (cell.isToday) {
      drawRoundedRect(ctx, x + w - 74, y + 10, 62, 22, 6);
      ctx.fillStyle = '#6366f1';
      ctx.fill();
      ctx.font = `800 13px ${fontMono}`;
      ctx.fillStyle = '#ffffff';
      ctx.fillText('TODAY', x + w - 65, y + 21);
    }

    // 셀 내부 마일스톤 배지 렌더링
    const items = cell.milestones || [];
    if (items.length > 0) {
      const listTop = y + 42;
      const availH = h - 50;
      const gapY = items.length >= 5 ? 4 : 6;
      const rawChipH = Math.floor((availH - gapY * (items.length - 1)) / items.length);
      const chipH = Math.max(28, Math.min(44, rawChipH));

      items.forEach((item, mIdx) => {
        const cy = listTop + mIdx * (chipH + gapY);
        if (cy + chipH > y + h - 4) return;

        const cx = x + 8;
        const cw = w - 16;
        const gColor = GAME_COLORS[item.game] || { main: '#818cf8', rgb: [129, 140, 248] };
        const [cr, cg, cb] = gColor.rgb;

        ctx.save();
        if (!item.isFixed) {
          ctx.globalAlpha = cell.isCurrentMonth ? 0.8 : 0.35;
        }

        // ① 신규 버전 업데이트 (솔리드 배경 + 다크 볼드 텍스트)
        if (item.category === 'update') {
          drawRoundedRect(ctx, cx, cy, cw, chipH, 7);
          ctx.fillStyle = item.isFixed
            ? `rgba(${cr}, ${cg}, ${cb}, 0.92)`
            : `rgba(${cr}, ${cg}, ${cb}, 0.75)`;
          ctx.fill();

          if (!item.isFixed) {
            ctx.setLineDash([6, 4]);
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#0f172a';
            ctx.stroke();
            ctx.setLineDash([]);
          }

          let tx = cx + 10;
          const fontSize = chipH <= 32 ? 15 : 17;
          ctx.font = `900 ${fontSize}px ${fontSans}`;
          ctx.fillStyle = '#090d16';
          const gLabel = `[${item.gameShort}] `;
          ctx.fillText(gLabel, tx, cy + chipH / 2);
          tx += ctx.measureText(gLabel).width;

          const rightReserve = !item.isFixed ? 44 : 8;
          ctx.font = `800 ${fontSize}px ${fontSans}`;
          ctx.fillStyle = '#0f172a';
          const fitted = fitText(ctx, item.title, cx + cw - tx - rightReserve);
          ctx.fillText(fitted, tx, cy + chipH / 2);

          if (!item.isFixed) {
            drawRoundedRect(ctx, cx + cw - 40, cy + (chipH - 18) / 2, 34, 18, 4);
            ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
            ctx.fill();
            ctx.font = `800 11px ${fontSans}`;
            ctx.fillStyle = '#f8fafc';
            ctx.fillText('예상', cx + cw - 33, cy + chipH / 2);
          }
        }
        // ② 후반 픽업 전환 (중간 틴트 + 외곽 보더 + 좌측 4px 바 + 밝은 텍스트)
        else if (item.category === 'half') {
          drawRoundedRect(ctx, cx, cy, cw, chipH, 7);
          ctx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, 0.18)`;
          ctx.fill();

          if (!item.isFixed) ctx.setLineDash([5, 4]);
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = `rgba(${cr}, ${cg}, ${cb}, 0.65)`;
          ctx.stroke();
          ctx.setLineDash([]);

          // 좌측 솔리드 바
          drawRoundedRect(ctx, cx, cy, 5, chipH, 3);
          ctx.fillStyle = gColor.main;
          ctx.fill();

          let tx = cx + 12;
          const fontSize = chipH <= 32 ? 15 : 16;
          ctx.font = `800 ${fontSize}px ${fontSans}`;
          ctx.fillStyle = gColor.main;
          const gLabel = `${item.gameShort} `;
          ctx.fillText(gLabel, tx, cy + chipH / 2);
          tx += ctx.measureText(gLabel).width;

          const rightReserve = !item.isFixed ? 42 : 8;
          ctx.font = `700 ${fontSize}px ${fontSans}`;
          ctx.fillStyle = '#f8fafc';
          const fitted = fitText(ctx, item.title, cx + cw - tx - rightReserve);
          ctx.fillText(fitted, tx, cy + chipH / 2);

          if (!item.isFixed) {
            drawRoundedRect(ctx, cx + cw - 38, cy + (chipH - 18) / 2, 32, 18, 4);
            ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
            ctx.fill();
            ctx.font = `700 11px ${fontSans}`;
            ctx.fillStyle = '#cbd5e1';
            ctx.fillText('예상', cx + cw - 32, cy + chipH / 2);
          }
        }
        // ③ 공식 특별방송 (다크 서피스 + LIVE 레드 배지 + 방송 시각)
        else if (item.category === 'broadcast') {
          drawRoundedRect(ctx, cx, cy, cw, chipH, 7);
          ctx.fillStyle = '#161c2b';
          ctx.fill();

          if (!item.isFixed) ctx.setLineDash([5, 4]);
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = 'rgba(250, 204, 21, 0.52)';
          ctx.stroke();
          ctx.setLineDash([]);

          drawRoundedRect(ctx, cx, cy, 5, chipH, 3);
          ctx.fillStyle = gColor.main;
          ctx.fill();

          // LIVE 배지
          const liveW = 36;
          drawRoundedRect(ctx, cx + 10, cy + (chipH - 18) / 2, liveW, 18, 4);
          ctx.fillStyle = item.isFixed ? '#ef4444' : '#d97706';
          ctx.fill();
          ctx.font = `900 11px ${fontMono}`;
          ctx.fillStyle = '#ffffff';
          ctx.fillText('LIVE', cx + 15, cy + chipH / 2);

          let tx = cx + 10 + liveW + 6;
          const fontSize = chipH <= 32 ? 14 : 16;
          ctx.font = `800 ${fontSize}px ${fontSans}`;
          ctx.fillStyle = gColor.main;
          const gLabel = `${item.gameShort} `;
          ctx.fillText(gLabel, tx, cy + chipH / 2);
          tx += ctx.measureText(gLabel).width;

          const timeShort = item.time ? item.time.slice(0, 5) : '';
          const rightReserve = !item.isFixed ? 40 : timeShort ? 48 : 8;
          ctx.font = `700 ${fontSize}px ${fontSans}`;
          ctx.fillStyle = '#fef9c3';
          const fitted = fitText(ctx, item.title, cx + cw - tx - rightReserve);
          ctx.fillText(fitted, tx, cy + chipH / 2);

          if (!item.isFixed) {
            drawRoundedRect(ctx, cx + cw - 38, cy + (chipH - 18) / 2, 32, 18, 4);
            ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
            ctx.fill();
            ctx.font = `700 11px ${fontSans}`;
            ctx.fillStyle = '#cbd5e1';
            ctx.fillText('예상', cx + cw - 32, cy + chipH / 2);
          } else if (timeShort) {
            ctx.font = `700 12px ${fontMono}`;
            ctx.fillStyle = '#fde047';
            ctx.fillText(timeShort, cx + cw - 42, cy + chipH / 2);
          }
        }
        // ④ 오프라인 행사 / 콜라보
        else {
          drawRoundedRect(ctx, cx, cy, cw, chipH, 7);
          ctx.fillStyle = item.isEnd
            ? 'rgba(51, 65, 85, 0.35)'
            : 'rgba(139, 92, 246, 0.18)';
          ctx.fill();

          ctx.lineWidth = 1.5;
          ctx.strokeStyle = item.isEnd
            ? 'rgba(100, 116, 139, 0.45)'
            : 'rgba(167, 139, 250, 0.55)';
          ctx.stroke();

          drawRoundedRect(ctx, cx, cy, 5, chipH, 3);
          ctx.fillStyle = gColor.main;
          ctx.fill();

          const tagText = item.isEnd ? '종료' : '행사';
          const tagW = 32;
          drawRoundedRect(ctx, cx + 10, cy + (chipH - 18) / 2, tagW, 18, 4);
          ctx.fillStyle = item.isEnd ? '#334155' : '#7c3aed';
          ctx.fill();
          ctx.font = `800 11px ${fontSans}`;
          ctx.fillStyle = '#ffffff';
          ctx.fillText(tagText, cx + 15, cy + chipH / 2);

          let tx = cx + 10 + tagW + 6;
          const fontSize = chipH <= 32 ? 14 : 15;
          ctx.font = `800 ${fontSize}px ${fontSans}`;
          ctx.fillStyle = gColor.main;
          const gLabel = `${item.gameShort} `;
          ctx.fillText(gLabel, tx, cy + chipH / 2);
          tx += ctx.measureText(gLabel).width;

          ctx.font = `700 ${fontSize}px ${fontSans}`;
          ctx.fillStyle = item.isEnd ? '#cbd5e1' : '#ede9fe';
          const fitted = fitText(ctx, item.title, cx + cw - tx - 8);
          ctx.fillText(fitted, tx, cy + chipH / 2);
        }

        ctx.restore();
      });
    }

    ctx.restore();
  });

  // 5. 하단 푸터
  ctx.font = `600 17px ${fontSans}`;
  ctx.fillStyle = '#64748b';
  ctx.fillText(
    '※ 본 달력은 공식 발표 일정(실선)과 업데이트 주기 기반 예측 일정(점선)을 종합한 자료이며, 게임사 사정에 따라 변동될 수 있습니다.',
    marginX + 6,
    H - 34
  );

  ctx.font = `800 17px ${fontMono}`;
  ctx.fillStyle = '#818cf8';
  const brandFoot = 'AEIKA ARCHIVE · SUBCULTURE SCHEDULE HUB';
  const bfW = ctx.measureText(brandFoot).width;
  ctx.fillText(brandFoot, W - marginX - bfW - 6, H - 34);

  return canvas.toDataURL('image/png');
}

/**
 * CalendarModal v2.1 — 개편된 4대 유형 배지 디자인 실시간 고해상도(2048x2048) 캔버스 렌더러 탑재
 * - 과거(5~10월), 현재(11월), 미래(12~1월) 모든 연/월을 즉시 새 디자인으로 렌더링 및 PNG 다운로드
 */
export default function CalendarModal({
  isOpen,
  onClose,
  meta,
  events = [],
  activeGames = null,
  targetYear,
  targetMonth,
}) {
  const { year: kstYear, month: kstMonth } = getNowKSTParts();
  const [viewYear, setViewYear] = useState(targetYear || kstYear);
  const [viewMonth, setViewMonth] = useState(targetMonth || kstMonth);
  const [renderedDataUrl, setRenderedDataUrl] = useState('');
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    setViewYear(targetYear || kstYear);
    setViewMonth(targetMonth || kstMonth);
  }, [isOpen, targetYear, targetMonth, kstYear, kstMonth]);

  const todayStr = useMemo(() => getTodayStrKST(), []);

  const lastUpdated = useMemo(() => {
    if (meta?.last_updated) {
      return meta.last_updated.includes('T')
        ? meta.last_updated.split('T')[0]
        : meta.last_updated;
    }
    return todayStr;
  }, [meta, todayStr]);

  const milestones = useMemo(() => {
    return extractCalendarMilestones(events, activeGames);
  }, [events, activeGames]);

  const { cells, numWeeks } = useMemo(() => {
    return buildMonthGrid(viewYear, viewMonth, milestones, todayStr);
  }, [viewYear, viewMonth, milestones, todayStr]);

  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current || document.createElement('canvas');
    canvasRef.current = canvas;
    const url = renderCalendarToCanvas(
      canvas,
      viewYear,
      viewMonth,
      cells,
      numWeeks,
      lastUpdated
    );
    setRenderedDataUrl(url);
  }, [isOpen, viewYear, viewMonth, cells, numWeeks, lastUpdated]);

  const calendarTitle = `${viewYear}년 ${viewMonth}월 서브컬쳐 게임 일정 캘린더`;
  const downloadFileName = `게임일정_${String(viewYear).slice(-2)}년${viewMonth}월.png`;

  const handlePrevMonth = () => {
    if (viewMonth === 1) {
      setViewYear((y) => y - 1);
      setViewMonth(12);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 12) {
      setViewYear((y) => y + 1);
      setViewMonth(1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleDownloadClick = () => {
    if (!renderedDataUrl) return;
    trackCalendarDownload({
      source: 'modal',
      format: 'png',
      year: viewYear,
      month: viewMonth,
      updatedAt: lastUpdated,
    });

    const link = document.createElement('a');
    link.href = renderedDataUrl;
    link.download = downloadFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenFull = () => {
    if (!renderedDataUrl) return;
    trackCalendarFullView({
      source: 'modal',
      year: viewYear,
      month: viewMonth,
    });

    fetch(renderedDataUrl)
      .then((r) => r.blob())
      .then((blob) => {
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank', 'noopener,noreferrer');
      });
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      modalKey="calendar"
      dialogClassName="calendar-modal__dialog"
      ariaLabelledBy="calendar-modal-title"
    >
      {({ requestClose }) => (
        <>
          <header className="calendar-modal__header">
            <div className="calendar-modal__title-wrap">
              <div className="calendar-modal__month-switcher">
                <button
                  type="button"
                  className="calendar-modal__nav-btn"
                  onClick={handlePrevMonth}
                  aria-label="이전 달"
                >
                  <ChevronLeft size={16} />
                </button>
                <h2 id="calendar-modal-title" className="calendar-modal__title">
                  <Calendar size={18} className="modal-title-icon" />
                  <span>{calendarTitle}</span>
                </h2>
                <button
                  type="button"
                  className="calendar-modal__nav-btn"
                  onClick={handleNextMonth}
                  aria-label="다음 달"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
              <span className="calendar-modal__badge">최신 반영: {lastUpdated}</span>
            </div>
            <button
              className="calendar-modal__close-btn"
              onClick={requestClose}
              aria-label="달력 팝업 닫기"
              title="닫기 (ESC)"
            >
              <X size={18} />
            </button>
          </header>

          <div className="calendar-modal__body">
            <div className="calendar-modal__image-wrapper">
              {renderedDataUrl && (
                <img
                  src={renderedDataUrl}
                  alt={calendarTitle}
                  className="calendar-modal__image"
                  onClick={handleOpenFull}
                  title="클릭 시 새 탭에서 고해상도(2048×2048) 원본 보기"
                />
              )}
            </div>
          </div>

          <footer className="calendar-modal__footer">
            <p className="calendar-modal__caption">
              ※ 상단 화살표(◀/▶)로 월을 이동하며 고해상도(2048×2048) 달력 이미지를 저장할 수 있습니다.
            </p>
            <div className="calendar-modal__actions">
              <button
                type="button"
                className="calendar-modal__btn-view"
                onClick={handleOpenFull}
              >
                <ExternalLink size={14} />
                <span>새 탭에서 원본 보기</span>
              </button>

              <button
                type="button"
                className="calendar-modal__btn-download"
                onClick={handleDownloadClick}
              >
                <Download size={14} />
                <span>고해상도 PNG 다운로드</span>
              </button>
            </div>
          </footer>
        </>
      )}
    </ModalShell>
  );
}
