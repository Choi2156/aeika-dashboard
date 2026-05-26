/**
 * 서브컬처 게임 일정 예측 엔진 (Scheduler Engine)
 * 
 * 3단계 우선순위 시스템:
 *   1순위: is_fixed = true → 관리자 직접 주입 확정 데이터 (절대 덮어쓰지 않음)
 *   2순위: schedule_hints → "날짜 미확정이지만 이미 알려진 사실" 반영
 *   3순위: games_config 기본값 → 게임별 기본 패턴 주기 자동 연산
 */

// ─── 유틸리티 함수 ──────────────────────────────────────

/**
 * Date 객체를 'YYYY-MM-DD' 문자열로 변환
 */
export function formatDate(d) {
  return (
    d.getFullYear() +
    '-' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(d.getDate()).padStart(2, '0')
  );
}

/**
 * 'YYYY-MM-DD' 문자열을 Date 객체로 변환 (시간 0시 고정)
 */
export function parseDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * 두 날짜 사이의 일수 차이 (정수)
 */
export function getDaysDiff(startDate, endDate) {
  const s = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const e = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  return Math.floor((e - s) / (1000 * 60 * 60 * 24));
}

/**
 * 기준 날짜에 일수를 더한 새 Date 반환
 */
export function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * 오늘 날짜 (시간 0시 고정) 반환
 */
export function getToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * 요일 인덱스(0~6)를 한국어 요일명으로 변환
 */
export function getKoreanDay(dayNum) {
  return ['일', '월', '화', '수', '목', '금', '토'][dayNum];
}

// ─── 버전 번호 처리 ──────────────────────────────────────

/**
 * 버전 문자열에서 "X.Y 후반" 같은 접미사를 제거하고 순수 버전 번호만 추출
 */
export function cleanVersion(versionStr) {
  return versionStr.replace(/\s*후반.*$/, '').trim();
}

/**
 * 다음 버전 번호를 계산
 * 
 * @param {string} currentVersion - 현재 버전 (예: "6.7")
 * @param {Object[]} hints - 해당 게임의 schedule_hints 배열
 * @returns {string} 다음 버전 번호
 */
export function getNextVersion(currentVersion, hints = []) {
  // 1순위: 힌트에서 next_version_number 확인
  const hint = hints.find(h => h.trigger_version === currentVersion);
  if (hint && hint.next_version_number) {
    return hint.next_version_number;
  }

  // 2순위: 기본 규칙 X.Y → X.(Y+1)
  const parts = currentVersion.split('.');
  if (parts.length === 2) {
    const major = parseInt(parts[0], 10);
    const minor = parseInt(parts[1], 10);
    return `${major}.${minor + 1}`;
  }

  // 파싱 불가 시 그대로 반환
  return currentVersion;
}

// ─── 핵심 예측 엔진 ──────────────────────────────────────

/**
 * 확정 이벤트 + 힌트를 기반으로 예상 이벤트를 생성하여 전체 이벤트 목록을 반환
 * 
 * @param {Object} scheduleData - schedule_data.json 파싱 결과
 * @param {Object} hintsData - schedule_hints.json 파싱 결과
 * @param {Object} gamesConfig - 게임별 설정 (from gamesConfig.js)
 * @returns {Object[]} 전체 이벤트 배열 (확정 + 예상)
 */
export function processEvents(scheduleData, hintsData, gamesConfig) {
  const allEvents = [...scheduleData.events];
  const configs = scheduleData.games_config || {};
  const hintsByGame = {};

  // 힌트를 게임별로 그룹화
  if (hintsData && hintsData.hints) {
    for (const hint of hintsData.hints) {
      if (!hintsByGame[hint.game]) {
        hintsByGame[hint.game] = [];
      }
      hintsByGame[hint.game].push(hint);
    }
  }

  // 각 게임별로 예상 일정 생성
  for (const game of Object.keys(gamesConfig)) {
    const gameConfig = gamesConfig[game];
    const serverConfig = configs[game];
    if (!gameConfig || !serverConfig) continue;

    const gameHints = hintsByGame[game] || [];

    // 해당 게임의 가장 최신 확정 전반업데이트 찾기
    const fixedUpdates = allEvents.filter(
      e => e.game === game && e.is_fixed && e.type === '전반업데이트'
    );
    if (fixedUpdates.length === 0) continue;

    fixedUpdates.sort((a, b) => parseDate(b.date) - parseDate(a.date));
    const latestUpdate = fixedUpdates[0];
    const baseDate = parseDate(latestUpdate.date);
    const baseVersion = cleanVersion(latestUpdate.version);

    const baseHints = gameHints.find(h => h.trigger_version === baseVersion);
    const baseCycle = baseHints?.cycle_override || serverConfig.cycle || gameConfig.cycle;
    const baseHalfCycle = baseHints?.half_cycle_override || serverConfig.halfCycle || gameConfig.halfCycle;
    const streamOffset = serverConfig.streamOffset || gameConfig.streamOffset;

    // --- [1] 현재 확정 버전의 후반업데이트 예상 생성 ---
    const hasFixedHalf = allEvents.some(
      e => e.game === game && e.type === '후반업데이트' && cleanVersion(e.version) === baseVersion
    );
    if (!hasFixedHalf) {
      const midDate = addDays(baseDate, baseHalfCycle);
      allEvents.push({
        id: `${game}_${baseVersion}_half_pred`,
        game,
        version: `${baseVersion} 후반`,
        type: '후반업데이트',
        title: `${baseVersion} 버전 후반기 콘텐츠 추가 및 픽업 전환`,
        date: formatDate(midDate),
        time: '',
        is_fixed: false,
        detail: '후반기 캐릭터 전환 및 인게임 서브 수집/도전 이벤트 위주의 기간이 전개됩니다.',
        custom_img: '',
        link: '',
      });
    }

    // --- [2] 전반업데이트 차기 예상 생성 ---
    // 최신 확정 이후, 이미 확정된 다음 버전들이 연속적으로 존재하면 그 최장 미래 버전을 새로운 기준점으로 삼음
    let currentBaseVer = baseVersion;
    let currentBaseDate = baseDate;
    let currentBaseCycle = baseCycle;
    let nextVer = getNextVersion(currentBaseVer, gameHints);

    let hasFixedNextUpdate = allEvents.some(
      e => e.game === game && e.type === '전반업데이트' && cleanVersion(e.version) === nextVer && e.is_fixed
    );
    while (hasFixedNextUpdate) {
      const fixedNext = allEvents.find(
        e => e.game === game && e.type === '전반업데이트' && cleanVersion(e.version) === nextVer && e.is_fixed
      );
      currentBaseVer = nextVer;
      currentBaseDate = parseDate(fixedNext.date);
      const nextHint = gameHints.find(h => h.trigger_version === currentBaseVer);
      currentBaseCycle = nextHint?.cycle_override || serverConfig.cycle || gameConfig.cycle;
      
      nextVer = getNextVersion(currentBaseVer, gameHints);
      hasFixedNextUpdate = allEvents.some(
        e => e.game === game && e.type === '전반업데이트' && cleanVersion(e.version) === nextVer && e.is_fixed
      );
    }

    // 최종 미래 기준점으로부터 '바로 다음 버전' 전반업데이트 예상을 생성
    const nextUpdateDate = addDays(currentBaseDate, currentBaseCycle);
    const nextPredId = `${game}_${nextVer}_update_pred`;
    const hasNextPred = allEvents.some(e => e.id === nextPredId || (e.game === game && e.type === '전반업데이트' && cleanVersion(e.version) === nextVer));
    
    if (!hasNextPred) {
      allEvents.push({
        id: nextPredId,
        game,
        version: nextVer,
        type: '전반업데이트',
        title: `${nextVer} 버전 대규모 정기 업데이트`,
        date: formatDate(nextUpdateDate),
        time: '',
        is_fixed: false,
        detail: '대규모 서버 점검 이후 정식 버전 라이브 개시일입니다.',
        custom_img: '',
        link: '',
      });
    }

    // --- [3] 다음 예상 버전의 후반업데이트 예상 생성 ---
    const nextHint = gameHints.find(h => h.trigger_version === nextVer);
    const nextHalfCycle = nextHint?.half_cycle_override || serverConfig.halfCycle || gameConfig.halfCycle;
    const nextHalfVerStr = `${nextVer} 후반`;
    const hasNextFixedHalf = allEvents.some(
      e => e.game === game && e.type === '후반업데이트' && cleanVersion(e.version) === nextVer
    );
    if (!hasNextFixedHalf) {
      const nextHalfDate = addDays(nextUpdateDate, nextHalfCycle);
      allEvents.push({
        id: `${game}_${nextVer}_half_pred`,
        game,
        version: nextHalfVerStr,
        type: '후반업데이트',
        title: `${nextVer} 버전 후반기 콘텐츠 추가 및 픽업 전환`,
        date: formatDate(nextHalfDate),
        time: '',
        is_fixed: false,
        detail: '후반기 캐릭터 전환 및 인게임 서브 수집/도전 이벤트 위주의 기간이 전개됩니다.',
        custom_img: '',
        link: '',
      });
    }

    // --- [4] 공식방송 예상 생성 (유형별 정밀 연쇄 타겟팅) ---
    // 이미 확정 공식방송이 존재하는 버전은 건너뛰고 차기의 가장 최신 예상을 생성
    let streamTargetVer = nextVer;
    let streamTargetUpdateDate = nextUpdateDate;
    let hasFixedStream = allEvents.some(
      e => e.game === game && e.type === '공식방송' && cleanVersion(e.version) === streamTargetVer && e.is_fixed
    );

    if (hasFixedStream) {
      const nextNextVer = getNextVersion(streamTargetVer, gameHints);
      const nextNextHint = gameHints.find(h => h.trigger_version === nextNextVer);
      const nextNextCycle = nextNextHint?.cycle_override || currentBaseCycle;
      streamTargetUpdateDate = addDays(streamTargetUpdateDate, nextNextCycle);
      streamTargetVer = nextNextVer;
    }

    const currentStreamHint = gameHints.find(h => h.trigger_version === streamTargetVer);
    const shouldSkipStream = currentStreamHint?.skip_stream === true;

    if (!shouldSkipStream) {
      let targetStreamDate;
      if (currentStreamHint?.stream_date_override) {
        targetStreamDate = parseDate(currentStreamHint.stream_date_override);
      } else {
        targetStreamDate = addDays(streamTargetUpdateDate, streamOffset);
      }

      const hasFixedOrPredStream = allEvents.some(
        e => e.game === game && e.type === '공식방송' && cleanVersion(e.version) === streamTargetVer
      );
      if (!hasFixedOrPredStream) {
        allEvents.push({
          id: `${game}_${streamTargetVer}_stream_pred`,
          game,
          version: streamTargetVer,
          type: '공식방송',
          title: `${streamTargetVer} 버전 공식 특별 방송 프로그램`,
          date: formatDate(targetStreamDate),
          time: '20:00',
          is_fixed: false,
          detail: '차기 정규 버전 스펙 선공개 안내 특별 프로그램입니다.',
          custom_img: '',
          link: '',
        });
      }
    }
  }

  // 모든 이벤트에 start_date와 end_date 주입 (간트 차트 렌더링용)
  const processedEvents = allEvents.map((ev) => {
    // 1. 이미 데이터 상에 end_date가 명시적으로 기재되어 있으면 새로 연산하지 않고 보존
    if (ev.end_date) {
      return {
        ...ev,
        start_date: ev.date,
        end_date: ev.end_date,
      };
    }

    const duration = getEventDuration(ev, allEvents, gamesConfig, hintsData);
    const startD = parseDate(ev.date);
    const endD = addDays(startD, duration - 1);
    return {
      ...ev,
      start_date: ev.date,
      end_date: formatDate(endD),
    };
  });

  return processedEvents;
}

/**
 * 이벤트의 간트 차트 표시 기간(Duration)을 일 단위로 계산
 * 
 * @param {Object} event - 이벤트 객체
 * @param {Object[]} allEvents - 전체 이벤트 배열 (해당 게임의 전반업데이트 찾기용)
 * @param {Object} gamesConfig - 게임별 설정
 * @param {Object} hintsData - 전체 힌트 데이터 (schedule_hints.json)
 * @returns {number} 일 단위 기간
 */
export function getEventDuration(event, allEvents, gamesConfig, hintsData) {
  // 1. 이벤트 객체 자체에 지정된 duration이 있으면 최우선으로 사용
  if (typeof event.duration === 'number' && event.duration > 0) {
    return event.duration;
  }

  const gameConfig = gamesConfig[event.game];
  
  // 힌트 데이터에서 이 게임에 해당하는 힌트 목록 필터링
  const gameHints = [];
  if (hintsData && hintsData.hints) {
    const gameHintsList = hintsData.hints.filter(h => h.game === event.game);
    gameHints.push(...gameHintsList);
  }

  const cleanVer = cleanVersion(event.version);
  const currentHint = gameHints.find(h => h.trigger_version === cleanVer);
  const cycle = currentHint?.cycle_override || gameConfig?.cycle || 42;

  if (event.type === '공식방송') {
    return 1;
  }

  if (event.type === '전반업데이트') {
    // 다음 버전의 확정 전반업데이트가 존재하면 그 시작일 전날까지를 기간으로 삼아 자동 단축/연장 대응!
    const nextVer = getNextVersion(cleanVer, gameHints);
    const nextUpdate = allEvents.find(
      e => e.game === event.game && e.type === '전반업데이트' && cleanVersion(e.version) === nextVer && e.is_fixed
    );
    if (nextUpdate) {
      const startD = parseDate(event.date);
      const nextStartD = parseDate(nextUpdate.date);
      return Math.max(1, getDaysDiff(startD, nextStartD));
    }
    return cycle;
  }

  if (event.type === '후반업데이트') {
    // 후반업데이트는 해당 버전의 전반업데이트 '실제 렌더링 종료일'을 기준으로 연쇄 추적 계산하여 어긋남 오류 원천 소멸!
    const mainUpdate = allEvents.find(
      e => e.game === event.game && e.type === '전반업데이트' && cleanVersion(e.version) === cleanVer
    );
    if (mainUpdate) {
      const mainDuration = getEventDuration(mainUpdate, allEvents, gamesConfig, hintsData);
      const mainStart = parseDate(mainUpdate.date);
      const mainEnd = addDays(mainStart, mainDuration);
      const halfStart = parseDate(event.date);
      return Math.max(1, getDaysDiff(halfStart, mainEnd));
    }
    const halfCycle = currentHint?.half_cycle_override || gameConfig?.halfCycle || Math.floor(cycle / 2);
    return halfCycle;
  }

  // 2. '행사' 등 예측 시스템 외부의 기타 커스텀 유형들은 기본적으로 1일 표시 (end_date가 없을 경우)
  return 1;
}
