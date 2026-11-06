import { useMemo } from 'react';
import { Radio, Sparkles, ArrowUpRight, Clock } from 'lucide-react';
import { getTodayStrKST, diffDays, formatDisplayDate } from '../utils/dateKST';

function extractPickupCharacters(detailText = '') {
  if (!detailText) return '';
  const lines = detailText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    if (line.includes('신규') || line.includes('픽업') || line.includes('기원') || line.includes('워프') || line.includes('변조') || line.includes('튜닝') || line.includes('헤드헌팅')) {
      const cleaned = line
        .replace(/^[•·\-*✦♦▪️]+\s*/, '')
        .replace(/^(전반|후반|신규|픽업|한정|캐릭터)\s*[:：-]?\s*/g, '')
        .trim();
      if (cleaned) return cleaned.slice(0, 34);
    }
  }
  return lines[0] ? lines[0].replace(/^[•·\-*✦♦▪️]+\s*/, '').slice(0, 34) : '';
}

/**
 * GameStatusStrip — 5대 서브컬처 게임 실시간 버전 진행률 & D-Day 브리핑 스트립 (v2.0 핵심 위젯)
 * 한 번에 1개씩만 슬라이드되던 기존 배너와 달리, 활성화된 모든 게임의:
 * 1) 현재 진행 중인 버전 및 전/후반 단계
 * 2) 버전 진행률 프로그레스 바 (0~100%) 및 종료 D-Day
 * 3) 가장 임박한 차기 마일스톤(특별 방송 / 후반 전환 / 차기 버전 업데이트)과 D-Day
 * 를 한눈에 비교하고 클릭 시 즉시 상세 모달을 오픈합니다.
 */
export default function GameStatusStrip({
  events = [],
  gamesConfig = {},
  activeGames = {},
  onEventClick,
}) {
  const todayStr = useMemo(() => getTodayStrKST(), []);

  const gameCards = useMemo(() => {
    const gameNames = Object.keys(gamesConfig).filter(
      (g) => !activeGames || activeGames[g] !== false
    );

    return gameNames.map((gameName) => {
      const conf = gamesConfig[gameName] || {};
      const color = conf?.theme?.color || '#818cf8';
      const iconUrl = conf?.icon || '';
      const gameEvents = events.filter((e) => e.game === gameName);

      // 1. 현재 진행 중인 전반업데이트(버전 전체 기간) 찾기
      const activeMainUpdates = gameEvents
        .filter(
          (e) =>
            e.type === '전반업데이트' &&
            e.start_date <= todayStr &&
            (e.end_date || e.start_date) >= todayStr
        )
        .sort((a, b) => b.start_date.localeCompare(a.start_date));

      const currentMain = activeMainUpdates[0] || null;

      // 2. 현재 진행 중인 후반업데이트가 있는지 확인 (현재 전반인지 후반인지 판별)
      const activeHalfUpdates = gameEvents
        .filter(
          (e) =>
            e.type === '후반업데이트' &&
            e.start_date <= todayStr &&
            (e.end_date || e.start_date) >= todayStr
        )
        .sort((a, b) => b.start_date.localeCompare(a.start_date));

      const currentHalf = activeHalfUpdates[0] || null;
      const activePhaseEvent = currentHalf || currentMain;

      // 3. 버전 진행률(%) 및 잔여 일수 계산
      let progressPct = 0;
      let remainDays = null;
      let totalDays = 42;
      let elapsedDays = 0;
      let versionLabel = '일정 집계 중';
      let phaseBadge = '진행 중';

      if (currentMain) {
        const sDate = currentMain.start_date || currentMain.date;
        const eDate = currentMain.end_date || sDate;
        totalDays = Math.max(1, diffDays(sDate, eDate) + 1);
        elapsedDays = Math.max(1, diffDays(sDate, todayStr) + 1);
        remainDays = Math.max(0, diffDays(todayStr, eDate));
        progressPct = Math.min(100, Math.max(4, Math.round((elapsedDays / totalDays) * 100)));

        const cleanVer = (currentMain.version || '').replace(/\s*후반.*$/, '').trim();
        versionLabel = cleanVer ? `v${cleanVer}` : currentMain.title || '현재 버전';
        phaseBadge = currentHalf ? '후반 픽업' : '전반 픽업';
      }

      // 4. 가장 가까운 다음 주요 마일스톤 (공식방송 / 후반업데이트 / 차기 전반업데이트)
      const upcomingMilestones = gameEvents
        .filter((e) => {
          const sDate = e.start_date || e.date;
          if (!sDate || sDate < todayStr) return false;
          if (currentMain && e.id === currentMain.id) return false;
          if (currentHalf && e.id === currentHalf.id) return false;
          return (
            e.type === '공식방송' ||
            e.type === '전반업데이트' ||
            e.type === '후반업데이트'
          );
        })
        .sort((a, b) => {
          const dA = a.start_date || a.date;
          const dB = b.start_date || b.date;
          if (dA !== dB) return dA.localeCompare(dB);
          if (a.type === '공식방송') return -1;
          if (b.type === '공식방송') return 1;
          return 0;
        });

      const nextMilestone = upcomingMilestones[0] || null;
      let nextMilestoneInfo = null;

      if (nextMilestone) {
        const mDate = nextMilestone.start_date || nextMilestone.date;
        const dDiff = diffDays(todayStr, mDate);
        const dDayText = dDiff === 0 ? 'TODAY' : `D-${dDiff}`;
        const cleanVer = (nextMilestone.version || '').replace(/\s*후반.*$/, '').trim();

        let typeShort = '업데이트';
        if (nextMilestone.type === '공식방송') typeShort = '특별방송';
        else if (nextMilestone.type === '후반업데이트') typeShort = '후반 픽업';
        else if (nextMilestone.type === '전반업데이트') typeShort = '신규 버전';

        nextMilestoneInfo = {
          event: nextMilestone,
          label: `${cleanVer ? `v${cleanVer} ` : ''}${typeShort}`,
          dateLabel: formatDisplayDate(mDate, false),
          dDayText,
          isToday: dDiff === 0,
          isImminent: dDiff <= 5,
          isFixed: nextMilestone.is_fixed === true,
          isStream: nextMilestone.type === '공식방송',
        };
      }

      const pickupSummary = activePhaseEvent
        ? extractPickupCharacters(activePhaseEvent.detail) || activePhaseEvent.title
        : '예정된 업데이트 일정을 확인하세요';

      return {
        gameName,
        color,
        iconUrl,
        activePhaseEvent,
        versionLabel,
        phaseBadge,
        progressPct,
        remainDays,
        elapsedDays,
        totalDays,
        pickupSummary,
        nextMilestoneInfo,
      };
    });
  }, [events, gamesConfig, activeGames, todayStr]);

  if (gameCards.length === 0) return null;

  return (
    <section className="status-strip" aria-label="게임별 실시간 버전 및 차기 일정 요약">
      <div className="status-strip__grid">
        {gameCards.map((card) => {
          const {
            gameName,
            color,
            iconUrl,
            activePhaseEvent,
            versionLabel,
            phaseBadge,
            progressPct,
            remainDays,
            pickupSummary,
            nextMilestoneInfo,
          } = card;

          return (
            <article
              key={gameName}
              className="status-card"
              style={{ '--game-accent': color }}
              onClick={() => {
                const targetEv = activePhaseEvent || nextMilestoneInfo?.event;
                if (targetEv && onEventClick) {
                  onEventClick(targetEv, targetEv.type, 'status_strip');
                }
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  const targetEv = activePhaseEvent || nextMilestoneInfo?.event;
                  if (targetEv && onEventClick) {
                    onEventClick(targetEv, targetEv.type, 'status_strip');
                  }
                }
              }}
              title={`${gameName} 현재 버전 상세 정보 보기`}
            >
              {/* 상단: 게임 아이콘/이름 + 현재 버전/페이즈 배지 */}
              <div className="status-card__top">
                <div className="status-card__game">
                  {iconUrl ? (
                    <img src={iconUrl} alt="" className="status-card__icon" />
                  ) : (
                    <span className="status-card__dot" />
                  )}
                  <span className="status-card__game-name">{gameName}</span>
                </div>

                <div className="status-card__badges">
                  <span className="status-card__ver-badge">{versionLabel}</span>
                  <span className="status-card__phase-badge">{phaseBadge}</span>
                </div>
              </div>

              {/* 중단: 현재 픽업/버전 핵심 1줄 요약 + 진행률 바 */}
              <div className="status-card__mid">
                <p className="status-card__summary">{pickupSummary}</p>

                <div className="status-card__progress-row">
                  <div className="status-card__progress-track">
                    <div
                      className="status-card__progress-fill"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <span className="status-card__remain-text">
                    {remainDays !== null
                      ? remainDays === 0
                        ? '오늘 마감'
                        : `${remainDays}일 남음`
                      : '—'}
                  </span>
                </div>
              </div>

              {/* 하단: 다음 임박 일정 (특별방송 / 후반픽업 / 차기버전) */}
              {nextMilestoneInfo ? (
                <div
                  className={`status-card__next ${
                    nextMilestoneInfo.isToday
                      ? 'is-today'
                      : nextMilestoneInfo.isImminent
                      ? 'is-imminent'
                      : ''
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onEventClick && nextMilestoneInfo.event) {
                      onEventClick(
                        nextMilestoneInfo.event,
                        nextMilestoneInfo.event.type,
                        'status_strip_next'
                      );
                    }
                  }}
                  title={`다음 일정: ${nextMilestoneInfo.label} (${nextMilestoneInfo.dateLabel})`}
                >
                  <div className="status-card__next-left">
                    {nextMilestoneInfo.isStream ? (
                      <Radio size={12} className="status-card__next-icon is-stream" />
                    ) : (
                      <Clock size={12} className="status-card__next-icon" />
                    )}
                    <span className="status-card__next-label">{nextMilestoneInfo.label}</span>
                    {!nextMilestoneInfo.isFixed && (
                      <span className="status-card__next-est">예상</span>
                    )}
                  </div>
                  <div className="status-card__next-right">
                    <span className="status-card__next-date">{nextMilestoneInfo.dateLabel}</span>
                    <span className="status-card__next-dday">{nextMilestoneInfo.dDayText}</span>
                    <ArrowUpRight size={11} className="status-card__next-arrow" />
                  </div>
                </div>
              ) : (
                <div className="status-card__next status-card__next--empty">
                  <Sparkles size={11} />
                  <span>차기 일정 자동 산출 대기 중</span>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
