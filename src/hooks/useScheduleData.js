import { useState, useEffect } from 'react';
import { processEvents } from '../engine/scheduler';
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
    meta: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const [dataRes, hintsRes, recRes, briefRes] = await Promise.all([
          fetch('./data/schedule_data.json?t=' + Date.now()),
          fetch('./data/schedule_hints.json?t=' + Date.now()),
          fetch('./data/recommended_videos.json?t=' + Date.now()),
          fetch('./data/briefing_data.json?t=' + Date.now()),
        ]);

        if (!dataRes.ok) throw new Error('schedule_data.json 로드 실패');

        const scheduleData = await dataRes.json();
        
        // 힌트 파일은 없어도 정상 동작해야 함
        let hintsData = { hints: [] };
        if (hintsRes.ok) {
          hintsData = await hintsRes.json();
        }

        // 추천 비디오 DB 로드 예외 처리
        let recommendedVideos = { shorts: [], longform: [] };
        if (recRes.ok) {
          recommendedVideos = await recRes.json();
        }

        // AI 데일리 브리핑 데이터 로드 예외 처리
        let briefingData = { last_checked: '', articles: [] };
        if (briefRes.ok) {
          briefingData = await briefRes.json();
        }

        // 예측 엔진 가동: 확정 데이터 + 힌트 → 전체 이벤트 (예상 포함)
        const allEvents = processEvents(scheduleData, hintsData, GAMES_CONFIG);

        setState({
          events: allEvents,
          gamesConfig: GAMES_CONFIG,
          recommendedVideos,
          briefingData,
          meta: scheduleData.meta || null,
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
