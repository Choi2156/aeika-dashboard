import { useState, useEffect } from 'react';
import { processEvents } from '../engine/scheduler';
import { validateSchedule } from '../engine/validator';
import { GAMES_CONFIG } from '../config/gamesConfig';

/**
 * 스케줄 데이터를 fetch하고 예측 엔진을 통해 가공된 전체 이벤트 목록을 반환하는 훅
 * 
 * @returns {{ events, gamesConfig, meta, loading, error }}
 */
export function useScheduleData() {
  const [state, setState] = useState({
    events: [],
    gamesConfig: GAMES_CONFIG,
    recommendedVideos: null,
    briefingData: null,
    patchNotes: [],
    notices: [],
    meta: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    async function fetchData() {
      try {
        // 10분 단위 캐시 키: 브라우저 캐시를 적극 활용하여 네트워크 트래픽 및 서버 부하 최소화
        const cacheKey = Math.floor(Date.now() / (10 * 60 * 1000));

        // 부가 JSON용 안전 페치 헬퍼 (네트워크 거절/파싱 에러 시에도 기본값으로 안전 격리)
        const fetchJsonSafe = async (url, fallback) => {
          try {
            const res = await fetch(url);
            if (res && res.ok) {
              return await res.json();
            }
          } catch (e) {
            console.warn(`[useScheduleData] Non-critical resource fetch fallback for ${url}:`, e);
          }
          return fallback;
        };

        // 1) 필수 일정 데이터 페치 (실패 시 메인 에러 처리)
        const dataRes = await fetch('./data/schedule_data.json?t=' + cacheKey);
        if (!dataRes.ok) throw new Error('schedule_data.json 로드 실패');
        const scheduleData = await dataRes.json();

        // 2) 부가 데이터 6종 병렬 페치 (각각의 실패가 메인 스케줄 로딩을 방해하지 않도록 격리)
        const [hintsData, recommendedVideos, briefingData, updatesData, patchNotes, notices] = await Promise.all([
          fetchJsonSafe('./data/schedule_hints.json?t=' + cacheKey, { hints: [] }),
          fetchJsonSafe('./data/recommended_videos.json?t=' + cacheKey, { shorts: [], longform: [] }),
          fetchJsonSafe('./data/briefing_data.json?t=' + cacheKey, { last_checked: '', articles: [] }),
          fetchJsonSafe('./data/schedule_updates.json?t=' + cacheKey, []),
          fetchJsonSafe('./data/patch_notes.json?t=' + cacheKey, []),
          fetchJsonSafe('./data/notices.json?t=' + cacheKey, []),
        ]);

        // ID 기반 중복 제거 및 실시간 대치 (Merge & Override by ID Map)
        const baseEvents = scheduleData.events || [];
        const updateEvents = Array.isArray(updatesData) ? updatesData : [];
        const mergedMap = new Map();

        // 1. 기존 누적 스케줄 데이터 주입
        baseEvents.forEach(evt => {
          if (evt && evt.id) {
            mergedMap.set(evt.id, evt);
          }
        });

        // 2. 신규 업데이트 데이터 주입 (기존 ID와 동일하면 기존 속성을 보존하며 병합, 다르면 신규 추가)
        updateEvents.forEach(evt => {
          if (evt && evt.id) {
            const existing = mergedMap.get(evt.id);
            if (existing) {
              mergedMap.set(evt.id, { ...existing, ...evt });
            } else {
              mergedMap.set(evt.id, evt);
            }
          }
        });

        const mergedEvents = Array.from(mergedMap.values());

        // 예측 엔진 가동: 병합된 확정 데이터 + 힌트 → 전체 이벤트 (예상 포함)
        const allEvents = processEvents({ ...scheduleData, events: mergedEvents }, hintsData, GAMES_CONFIG);

        // 일정 정합성 검증 (개발 모드 및 콘솔 진단용)
        if (import.meta.env.DEV) {
          const valResult = validateSchedule(allEvents, GAMES_CONFIG, hintsData);
          if (valResult.warningCount > 0 || valResult.errorCount > 0) {
            console.warn('[ScheduleValidator] 일정 정합성 진단 결과:', valResult);
          }
        }

        // meta.last_updated에서 실제 일정 데이터 최종 수정일자(YYYY-MM-DD) 추출
        let computedLastUpdated = null;
        if (scheduleData.meta?.last_updated) {
          computedLastUpdated = scheduleData.meta.last_updated.includes('T')
            ? scheduleData.meta.last_updated.split('T')[0]
            : scheduleData.meta.last_updated;
        } else {
          computedLastUpdated = new Date().toISOString().split('T')[0];
        }

        setState({
          events: allEvents,
          gamesConfig: GAMES_CONFIG,
          recommendedVideos,
          briefingData,
          patchNotes,
          notices,
          meta: { ...(scheduleData.meta || {}), last_updated: computedLastUpdated },
          loading: false,
          error: null,
        });
      } catch (err) {
        console.error('데이터 로딩 오류:', err);
        setState(prev => ({
          ...prev,
          loading: false,
          error: err.message,
        }));
      }
    }

    fetchData();
  }, []);

  return state;
}
