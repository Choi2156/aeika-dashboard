/**
 * Google Analytics (GA4) Event Helper Utility
 * G-31RYJPK3T8 연동
 */

export const trackEvent = (eventName, params = {}) => {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    try {
      window.gtag('event', eventName, params);
    } catch (e) {
      console.warn('[GA4] Event tracking error:', e);
    }
  }
};

/**
 * 대시보드 ➔ 유튜브 영상 클릭 추적
 * @param {string} videoType - 'shorts' | 'story' | 'other'
 * @param {string} game - 게임명
 * @param {string} title - 영상 제목
 * @param {string} videoId - 유튜브 영상 ID
 */
export const trackVideoClick = (videoType, game, title, videoId) => {
  trackEvent('click_recommended_video', {
    video_type: videoType,
    game: game,
    video_title: title,
    video_id: videoId,
  });
};

/**
 * 유튜브 채널 바로가기 클릭 추적
 * @param {string} location - 클릭 위치 ('header' | 'bottom_shorts' | 'footer' | 'gantt_row')
 */
export const trackChannelClick = (location) => {
  trackEvent('click_youtube_channel', {
    click_location: location,
  });
};

/**
 * 쇼츠 셔플 버튼 클릭 추적
 */
export const trackShuffleClick = () => {
  trackEvent('click_shorts_shuffle', {
    action: 'shuffle_recommendations',
  });
};

/**
 * 게임 필터 토글 클릭 추적
 * @param {string} game - 대상 게임명
 * @param {boolean} nextActive - 변경 후 활성화 상태
 */
export const trackGameFilterToggle = (game, nextActive) => {
  trackEvent('toggle_game_filter', {
    game: game,
    filter_state: nextActive ? 'enabled' : 'disabled',
  });
};

/**
 * 게임 전체 선택 / 전체 해제 클릭 추적
 * @param {'select_all' | 'deselect_all'} action
 */
export const trackGameFilterAll = (action) => {
  trackEvent('filter_all_games', {
    action: action,
  });
};

/**
 * 뷰 모드 전환 추적 (PC 간트 vs 모바일 리스트)
 * @param {'gantt' | 'list'} viewMode
 */
export const trackViewModeChange = (viewMode) => {
  trackEvent('change_view_mode', {
    view_mode: viewMode,
  });
};

/**
 * 다크 / 라이트 테마 전환 추적
 * @param {'dark' | 'light'} theme
 */
export const trackThemeToggle = (theme) => {
  trackEvent('toggle_theme', {
    theme: theme,
  });
};

/**
 * 모달 팝업 열람 추적
 * @param {'notice' | 'guide' | 'license' | 'support' | 'detail'} modalName
 */
export const trackModalOpen = (modalName) => {
  trackEvent('open_modal', {
    modal_name: modalName,
  });
};
