/**
 * 서브컬처 게임 대시보드 일정 정합성 검증기 (Schedule Validator)
 * 
 * 기능:
 * 1. 타 게임 간 동일 날짜 대형 업데이트 동시 발생(충돌) 감지
 * 2. 동일 게임 내 중복 대형 패치 및 날짜 역전 치명적 오류 감지 (ERROR 승격)
 * 3. 게임별 통상 점검 요일(수/목/수-금) 이탈 감지 (힌트 객체 기반 유연 판정)
 * 4. 게임별 설정 기반 비정상 주기(표준 ±7일 초과) 감지
 * 5. 후반 업데이트 및 배너 마감일 정합성 검증
 * 6. 공식 방송의 버전 패치 전 방영 정합성 검증
 * 7. 오프라인 이벤트 및 행사의 날짜 유효성 및 기간 정합성 전수 검증
 */

import { parseDate, cleanVersion, getDaysDiff, formatDate } from './scheduler.js';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

/**
 * YYYY-MM-DD 형식이면서 실제 그레고리력 달력에 존재하는 유효한 날짜인지 검증 (윤년 2월 29일/30일/31일 등 방어)
 */
export function isValidCalendarDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(Date.UTC(y, m - 1, d));
  return (
    dateObj.getUTCFullYear() === y &&
    dateObj.getUTCMonth() === m - 1 &&
    dateObj.getUTCDate() === d
  );
}

/**
 * 전체 이벤트 목록 및 게임 설정을 기반으로 정합성을 검증하고 진단 결과를 반환
 * 
 * @param {Array} allEvents - 전체 가공된 이벤트 배열
 * @param {Object} gamesConfig - GAMES_CONFIG 객체
 * @param {Object} hintsData - schedule_hints.json 파싱 데이터
 * @returns {Object} { isValid, errors, warnings, infos, offlineEventLogs, summary }
 */
export function validateSchedule(allEvents, gamesConfig = {}, hintsData = { hints: [] }) {
  const errors = [];
  const warnings = [];
  const infos = [];
  const offlineEventLogs = [];

  const hintsList = hintsData?.hints || [];
  const majorUpdates = allEvents.filter(e => e.type === '전반업데이트');
  const halfUpdates = allEvents.filter(e => e.type === '후반업데이트');

  // ─── [1] 오프라인 이벤트 / 행사 정합성 검증 ──────────────────
  const offlineEvents = allEvents.filter(
    e => e.type === '오프라인이벤트' || e.type === '행사'
  );

  for (const evt of offlineEvents) {
    if (!isValidCalendarDate(evt.date)) {
      errors.push({
        type: 'INVALID_DATE_FORMAT',
        game: evt.game,
        title: evt.title,
        message: `유효하지 않거나 실제 달력에 존재하지 않는 시작 날짜입니다: ${evt.date}`,
      });
      continue;
    }

    if (evt.end_date) {
      if (!isValidCalendarDate(evt.end_date)) {
        errors.push({
          type: 'INVALID_END_DATE_FORMAT',
          game: evt.game,
          title: evt.title,
          message: `유효하지 않거나 실제 달력에 존재하지 않는 종료 날짜입니다: ${evt.end_date}`,
        });
        continue;
      }

      if (evt.date > evt.end_date) {
        errors.push({
          type: 'DATE_RANGE_INVERTED',
          game: evt.game,
          title: evt.title,
          message: `종료일(${evt.end_date})이 시작일(${evt.date})보다 앞서 있습니다.`,
        });
        continue;
      }
    }

    const rangeStr = evt.end_date && evt.end_date !== evt.date 
      ? `${evt.date} - ${evt.end_date}` 
      : evt.date;

    offlineEventLogs.push({
      game: evt.game,
      title: evt.title,
      dateRange: rangeStr,
      status: 'OK',
      message: `날짜 포맷 및 행사 기간 정합성 정상 (버전 패치 주기와 무관한 오프라인 행사로 정상 승인)`,
    });
  }

  // ─── [2] 전반업데이트(메이저 패치) 검증 ─────────────────────────
  // ① 날짜 포맷 유효성 및 동일 일자 동시 패치 충돌/중복 검사
  const updatesByDate = new Map();
  for (const u of majorUpdates) {
    if (!isValidCalendarDate(u.date)) {
      errors.push({
        type: 'INVALID_UPDATE_DATE_FORMAT',
        game: u.game,
        version: u.version,
        message: `유효하지 않거나 실제 달력에 존재하지 않는 업데이트 날짜입니다: ${u.date}`,
      });
      continue;
    }

    if (!updatesByDate.has(u.date)) {
      updatesByDate.set(u.date, []);
    }
    updatesByDate.get(u.date).push(u);
  }

  for (const [date, updates] of updatesByDate.entries()) {
    if (updates.length > 1) {
      // 동일 게임 중복 패치 감지 (치명적 오류 ERROR)
      const gamesMap = new Map();
      for (const u of updates) {
        if (!gamesMap.has(u.game)) gamesMap.set(u.game, []);
        gamesMap.get(u.game).push(u);
      }
      for (const [gName, gUpdates] of gamesMap.entries()) {
        if (gUpdates.length > 1) {
          errors.push({
            type: 'DUPLICATE_GAME_UPDATE',
            game: gName,
            date,
            message: `${date}: 동일 게임(${gName})의 전반업데이트가 ${gUpdates.length}건 중복 등록되었습니다.`,
          });
        }
      }

      // 서로 다른 게임 간 대형 업데이트 충돌 (주의 경고 WARNING)
      const distinctGames = new Set(updates.map(u => u.game));
      if (distinctGames.size > 1) {
        const gameListStr = updates
          .map(u => `[${u.game} ${u.version || ''}${u.is_fixed ? ' 확정' : ' 예상'}]`)
          .join(', ');
        warnings.push({
          type: 'SAME_DAY_UPDATE_COLLISION',
          date,
          message: `${date}: 대형 업데이트 동일 일자 충돌 감지 -> ${gameListStr}`,
        });
      }
    }
  }

  // ② 게임별 통상 점검 요일 및 주기 검사
  for (const u of majorUpdates) {
    const config = gamesConfig[u.game];
    if (!config) continue;

    const uDate = parseDate(u.date);
    const dayOfWeek = uDate.getDay();
    const dayName = WEEKDAYS[dayOfWeek];

    // 요일 검사
    let isUnusual = false;
    let weekdayMsg = '';
    if (config.allowedWeekdays && Array.isArray(config.allowedWeekdays)) {
      if (!config.allowedWeekdays.includes(dayOfWeek)) {
        const allowedNames = config.allowedWeekdays.map(d => WEEKDAYS[d]).join('/');
        isUnusual = true;
        weekdayMsg = `${u.game} ${u.version} (${u.date} ${dayName}요일): 통상 허용 요일(${allowedNames})을 벗어난 요일입니다.`;
      }
    } else if (typeof config.standardWeekday === 'number') {
      if (dayOfWeek !== config.standardWeekday) {
        const stdName = WEEKDAYS[config.standardWeekday];
        isUnusual = true;
        weekdayMsg = `${u.game} ${u.version} (${u.date} ${dayName}요일): 통상 점검 요일(${stdName}요일)과 상이합니다.`;
      }
    }

    const cleanVer = cleanVersion(u.version);
    const matchingHint = hintsList.find(
      h => h.game === u.game && h.trigger_version === cleanVer
    );
    // 현재 버전의 시작 날짜를 결정한 직전 버전 힌트도 탐색
    const prevUpdate = majorUpdates
      .filter(other => other.game === u.game && other.date < u.date)
      .sort((a, b) => b.date.localeCompare(a.date))[0];
    const prevCleanVer = prevUpdate ? cleanVersion(prevUpdate.version) : null;
    const prevHint = prevCleanVer ? hintsList.find(h => h.game === u.game && h.trigger_version === prevCleanVer) : null;

    if (isUnusual) {
      // 힌트 객체(matchingHint 또는 prevHint)가 존재하거나 확정 일정이면 '확인된 예외'로 승인
      const hasReason = Boolean(matchingHint || prevHint);
      const hintReason = matchingHint?.note || prevHint?.note || '사전 등록된 단축/연장 힌트 확인';
      if (u.is_fixed) {
        infos.push({
          type: 'KNOWN_WEEKDAY_EXCEPTION',
          game: u.game,
          version: u.version,
          date: u.date,
          message: `${weekdayMsg} (공식 확정된 일정으로 정상 승인)`,
        });
      } else if (hasReason) {
        infos.push({
          type: 'KNOWN_WEEKDAY_EXCEPTION',
          game: u.game,
          version: u.version,
          date: u.date,
          message: `${weekdayMsg} (힌트 확인: ${hintReason})`,
        });
      } else {
        // 별도 사유 없이 비정규 요일로 예측된 경우만 주의 경고(WARNING) 발생
        warnings.push({
          type: 'UNUSUAL_WEEKDAY',
          game: u.game,
          version: u.version,
          date: u.date,
          message: `${weekdayMsg} (별도 단축/연장 힌트 없이 비정규 요일로 예측됨 -> 검토 필요)`,
        });
      }
    }

    // 주기 검사 (다음 버전과의 일수 차이 또는 힌트 확인)
    const nextUpdates = majorUpdates
      .filter(other => other.game === u.game && other.date > u.date)
      .sort((a, b) => a.date.localeCompare(b.date));

    if (nextUpdates.length > 0) {
      const nextU = nextUpdates[0];
      const cycleDays = getDaysDiff(parseDate(u.date), parseDate(nextU.date));

      // 날짜 역전 치명적 오류 감지 (ERROR 승격)
      if (cycleDays <= 0) {
        errors.push({
          type: 'DATE_SEQUENCE_INVERTED',
          game: u.game,
          version: u.version,
          message: `${u.game} ${u.version} 시작일(${u.date})이 차기 버전(${nextU.version}) 시작일(${nextU.date}) 이상으로 역전되었습니다.`,
        });
      } else {
        // 게임 설정 기반 동적 주기 허용 범위 (통상 주기 ±7일)
        const standardCycle = config.cycle || 42;
        const minCycle = standardCycle - 7;
        const maxCycle = standardCycle + 7;

        if (cycleDays < minCycle || cycleDays > maxCycle) {
          if (matchingHint) {
            infos.push({
              type: 'KNOWN_IRREGULAR_CYCLE',
              game: u.game,
              version: u.version,
              cycleDays,
              message: `${u.game} ${u.version}: 변칙 주기 ${cycleDays}일 적용됨 (힌트: ${matchingHint.note || '사유 등록됨'})`,
            });
          } else if (u.date < '2026-08-01') {
            // 과거 히스토리 아카이브 데이터
            infos.push({
              type: 'HISTORICAL_CYCLE',
              game: u.game,
              version: u.version,
              cycleDays,
              message: `${u.game} ${u.version}: 과거 완료된 주기 ${cycleDays}일 (아카이브)`,
            });
          } else {
            warnings.push({
              type: 'ABNORMAL_CYCLE_WITHOUT_HINT',
              game: u.game,
              version: u.version,
              cycleDays,
              message: `${u.game} ${u.version}: 주기가 ${cycleDays}일로 산출되었습니다 (별도 힌트 없이 통상 ${standardCycle}일 대비 편차 발생).`,
            });
          }
        }
      }

      // 배너 종료일 정합성 검사 (u.end_date vs nextU.date)
      if (u.end_date && u.end_date >= nextU.date) {
        warnings.push({
          type: 'BANNER_OVERLAP_NEXT_UPDATE',
          game: u.game,
          version: u.version,
          message: `${u.game} ${u.version} 배너 종료일(${u.end_date})이 다음 버전 시작일(${nextU.date})과 겹치거나 늦습니다.`,
        });
      }
    }
  }

  // ─── [3] 후반업데이트 정합성 검증 ─────────────────────────────
  // ─── [3] 후반업데이트 정합성 검증 ─────────────────────────────
  for (const half of halfUpdates) {
    if (!isValidCalendarDate(half.date)) {
      errors.push({
        type: 'INVALID_HALF_UPDATE_DATE_FORMAT',
        game: half.game,
        version: half.version,
        message: `유효하지 않거나 실제 달력에 존재하지 않는 후반 업데이트 날짜입니다: ${half.date}`,
      });
      continue;
    }

    if (half.end_date && !isValidCalendarDate(half.end_date)) {
      errors.push({
        type: 'INVALID_HALF_UPDATE_END_DATE_FORMAT',
        game: half.game,
        version: half.version,
        message: `유효하지 않거나 실제 달력에 존재하지 않는 후반 배너 종료 날짜입니다: ${half.end_date}`,
      });
      continue;
    }

    const cleanVer = cleanVersion(half.version);
    const mainUpdate = majorUpdates.find(
      u => u.game === half.game && cleanVersion(u.version) === cleanVer
    );

    if (mainUpdate) {
      if (half.date < mainUpdate.date) {
        errors.push({
          type: 'HALF_UPDATE_BEFORE_MAIN',
          game: half.game,
          version: half.version,
          message: `${half.game} ${half.version} 후반 업데이트 시작일(${half.date})이 전반 업데이트 시작일(${mainUpdate.date})보다 앞서 있습니다.`,
        });
      }

      // 차기 전반업데이트가 있는 경우 후반업데이트가 차기 시작일 이상인지 검사
      const nextMain = majorUpdates
        .filter(u => u.game === half.game && u.date > mainUpdate.date)
        .sort((a, b) => a.date.localeCompare(b.date))[0];

      if (nextMain && half.date >= nextMain.date) {
        errors.push({
          type: 'HALF_UPDATE_AFTER_NEXT_VERSION',
          game: half.game,
          version: half.version,
          message: `${half.game} ${half.version} 후반 시작일(${half.date})이 차기 버전(${nextMain.version}) 시작일(${nextMain.date})보다 늦거나 같습니다.`,
        });
      }
    }

    if (half.end_date && half.date > half.end_date) {
      errors.push({
        type: 'DATE_RANGE_INVERTED',
        game: half.game,
        version: half.version,
        message: `${half.game} ${half.version} 후반 배너 종료일(${half.end_date})이 시작일(${half.date})보다 앞서 있습니다.`,
      });
    }
  }

  // ─── [4] 공식 방송 정합성 검사 ────────────────────────────────
  const streams = allEvents.filter(e => e.type === '공식방송');
  for (const s of streams) {
    if (!isValidCalendarDate(s.date)) {
      errors.push({
        type: 'INVALID_STREAM_DATE_FORMAT',
        game: s.game,
        version: s.version,
        message: `유효하지 않거나 실제 달력에 존재하지 않는 공식방송 날짜입니다: ${s.date}`,
      });
      continue;
    }
    const cleanVer = cleanVersion(s.version);
    const relatedUpdate = majorUpdates.find(
      u => u.game === s.game && cleanVersion(u.version) === cleanVer
    );

    if (relatedUpdate) {
      if (s.date >= relatedUpdate.date) {
        if (s.date < '2026-08-01' && relatedUpdate.is_fixed) {
          infos.push({
            type: 'HISTORICAL_STREAM',
            game: s.game,
            version: s.version,
            message: `${s.game} ${s.version}: 과거 런칭 당일 동시 방송 이력 (${s.date})`,
          });
        } else {
          warnings.push({
            type: 'STREAM_AFTER_UPDATE',
            game: s.game,
            version: s.version,
            message: `${s.game} ${s.version} 공식방송일(${s.date})이 업데이트일(${relatedUpdate.date})보다 늦거나 같습니다.`,
          });
        }
      }
    }
  }

  const isValid = errors.length === 0;

  return {
    isValid,
    errorCount: errors.length,
    warningCount: warnings.length,
    infoCount: infos.length,
    offlineCount: offlineEvents.length,
    totalEventsCount: allEvents.length,
    errors,
    warnings,
    infos,
    offlineEventLogs,
  };
}

/**
 * 검증 결과를 가독성 높은 텍스트/마크다운 리포트로 포맷팅
 * 
 * @param {Object} result - validateSchedule() 반환 객체
 * @returns {string} 마크다운 포맷 리포트 문자열
 */
export function formatValidationReport(result) {
  const lines = [];

  lines.push(`### [시스템 일정 정합성 검증 리포트]`);
  lines.push(`- **전체 검증 이벤트**: 총 ${result.totalEventsCount}건 (오프라인 행사 ${result.offlineCount}건 포함)`);
  lines.push(`- **최종 검증 상태**: ${result.errorCount > 0 ? '❌ 오류 발생 (ERROR)' : result.warningCount > 0 ? '⚠️ 주의 감지 (WARNING)' : '✅ 전체 정상 (PASS)'}`);
  lines.push(`- **오류**: ${result.errorCount}건 | **주의 경고**: ${result.warningCount}건 | **특이사항 안내**: ${result.infoCount}건`);
  lines.push('');

  // 1. 오프라인 이벤트 검증 내역
  lines.push(`#### 1. 오프라인 이벤트 및 행사 검증 (${result.offlineCount}건)`);
  if (result.offlineEventLogs.length === 0) {
    lines.push(`- 등록된 오프라인 이벤트 없음.`);
  } else {
    for (const log of result.offlineEventLogs) {
      lines.push(`- [${log.status}] **${log.game}** - ${log.title} (${log.dateRange})`);
      lines.push(`  └ ${log.message}`);
    }
  }
  lines.push('');

  // 2. 오류 항목
  if (result.errorCount > 0) {
    lines.push(`#### 2. 치명적 오류 (CRITICAL ERRORS) - 즉시 조치 필요`);
    for (const err of result.errors) {
      lines.push(`- ❌ **[${err.type}]** ${err.game || ''} ${err.version || err.title || ''}: ${err.message}`);
    }
    lines.push('');
  }

  // 3. 주의/경고 항목
  if (result.warningCount > 0) {
    lines.push(`#### ${result.errorCount > 0 ? '3' : '2'}. 감지된 주의 경고 (WARNINGS) - 확인 권장`);
    for (const warn of result.warnings) {
      lines.push(`- ⚠️ **[${warn.type}]** ${warn.message}`);
    }
    lines.push('');
  }

  // 4. 변칙 주기 등 안내 항목
  if (result.infoCount > 0) {
    lines.push(`#### 안내 사항 (INFORMATIONAL)`);
    for (const info of result.infos) {
      lines.push(`- ℹ️ **[${info.type}]** ${info.message}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
