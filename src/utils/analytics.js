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

/**
 * 일정 항목(이벤트) 클릭 추적
 * @param {object} event - 클릭된 이벤트 객체
 * @param {string} displayTypeName - UI 표기 유형
 * @param {'gantt' | 'list' | 'live_banner' | 'bottom_stream' | string} source - 클릭 위치
 */
export const trackScheduleEventClick = (event, displayTypeName, source = 'unknown') => {
  if (!event) return;
  trackEvent('click_schedule_event', {
    game: event.game || '기타',
    event_title: (event.title || '').replace(/「|」/g, '').trim(),
    event_type: event.type || displayTypeName || '기타',
    version: event.version || '',
    is_fixed: event.is_fixed === true,
    click_source: source,
  });
};

/**
 * 범용 외부 아웃바운드 링크 클릭 추적 (후원사/플랫폼/예매처 변경에 유연한 구조)
 * @param {object} options
 * @param {'official_notice' | 'ticket' | 'donation' | 'guide_video' | 'feedback' | 'github' | 'channel'} options.linkCategory - 링크 목적
 * @param {string} [options.platform] - 플랫폼 식별자 ('ctee', 'toss', 'youtube', 'naver_cafe', 'naver_lounge', 'interpark', 'ticketlink', 'google_forms', 'github' 등)
 * @param {string} options.targetUrl - 대상 URL
 * @param {string} [options.game] - 관련 게임명 (선택)
 * @param {string} [options.title] - 링크 타이틀 또는 이벤트명 (선택)
 */
export const trackOutboundLink = ({
  linkCategory,
  platform = 'external',
  targetUrl = '',
  game = '',
  title = '',
}) => {
  trackEvent('click_outbound_link', {
    link_category: linkCategory,
    platform: platform,
    target_url: targetUrl,
    game: game,
    link_title: title,
  });
};

/**
 * 클립보드 복사 추적 (이메일 복사 등)
 * @param {'email' | 'event_share' | 'link'} targetType
 * @param {string} contentLabel
 */
export const trackClipboardCopy = (targetType, contentLabel = '') => {
  trackEvent('copy_clipboard', {
    target_type: targetType,
    content_label: contentLabel,
  });
};

/**
 * 영상 캐러셀 좌/우 슬라이드 내비게이션 추적
 * @param {'story' | 'other' | 'shorts'} carouselType
 * @param {'prev' | 'next'} direction
 */
export const trackCarouselNavigation = (carouselType, direction) => {
  trackEvent('navigate_video_carousel', {
    carousel_type: carouselType,
    direction: direction,
  });
};

/**
 * 쇼츠 인라인(사이트 내부) 재생 추적
 * @param {string} game
 * @param {string} videoId
 * @param {string} title
 */
export const trackShortsInlinePlay = (game, videoId, title = '') => {
  trackEvent('play_short_inline', {
    game: game,
    video_id: videoId,
    video_title: title,
  });
};

/**
 * 상단 공지사항 티커 배너 클릭 추적
 * @param {object} notice
 */
export const trackNoticeTickerClick = (notice) => {
  if (!notice) return;
  trackEvent('click_notice_ticker', {
    notice_id: notice.id || '',
    notice_title: notice.title || '',
    category: notice.category || '공지',
  });
};

/**
 * 가이드 모달 탭 전환 추적
 * @param {'guide' | 'patches'} tabName
 */
export const trackGuideTabSwitch = (tabName) => {
  trackEvent('switch_guide_tab', {
    tab_name: tabName,
  });
};

/**
 * 설정 자동 저장(로컬 스토리지) 동의 ON/OFF 추적
 * @param {boolean} isConsent
 */
export const trackStorageConsentToggle = (isConsent) => {
  trackEvent('toggle_storage_consent', {
    consent_state: isConsent ? 'enabled' : 'disabled',
  });
};

