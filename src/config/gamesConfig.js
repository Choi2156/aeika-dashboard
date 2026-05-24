/**
 * 게임별 설정 및 테마 정의
 * 
 * 신규 게임을 추가할 때 이 파일에만 항목을 추가하면
 * 예측 엔진, 간트 차트, 리스트 뷰, 모달 등 전체 시스템에 자동 반영됩니다.
 */

export const GAMES_CONFIG = {
  "원신": {
    cycle: 42,
    halfCycle: 21,
    streamOffset: -12,
    theme: {
      color: "#67dbed",
      colorDark: "#0e7490",
      textOnBar: "#0f172a",
    },
    defaultImg: "./assets/default_genshin.jpg",
    officialUrl: "https://genshin.hoyoverse.com/ko",
    copyright: "© COGNOSPHERE",
  },
  "붕괴: 스타레일": {
    cycle: 42,
    halfCycle: 21,
    streamOffset: -12,
    theme: {
      color: "#9ca4f8",
      colorDark: "#4338ca",
      textOnBar: "#0f172a",
    },
    defaultImg: "./assets/default_starrail.jpg",
    officialUrl: "https://hsr.hoyoverse.com/ko-kr/",
    copyright: "© COGNOSPHERE",
  },
  "젠레스 존 제로": {
    cycle: 42,
    halfCycle: 21,
    streamOffset: -12,
    theme: {
      color: "#ebd66b",
      colorDark: "#a16207",
      textOnBar: "#0f172a",
    },
    defaultImg: "./assets/default_zzz.jpg",
    officialUrl: "https://zenless.hoyoverse.com/ko-kr/",
    copyright: "© COGNOSPHERE",
  },
  "명조": {
    cycle: 42,
    halfCycle: 21,
    streamOffset: -13,
    theme: {
      color: "#6fe0b6",
      colorDark: "#047857",
      textOnBar: "#0f172a",
    },
    defaultImg: "./assets/default_wuthering.jpg",
    officialUrl: "https://wutheringwaves.kurogames.com/kr/",
    copyright: "© KURO GAMES",
  },
  "명일방주: 엔드필드": {
    cycle: 42,
    halfCycle: 21,
    streamOffset: -7,
    theme: {
      color: "#fcae74",
      colorDark: "#c2410c",
      textOnBar: "#0f172a",
    },
    defaultImg: "./assets/default_endfield.jpg",
    officialUrl: "https://endfield.gryphline.com/ko-kr/",
    copyright: "© GRYPHLINE",
  },
};

/**
 * 게임 표시 순서 (간트 차트에서의 행 순서)
 * GAMES_CONFIG의 키 순서와 일치시킵니다.
 */
export const GAME_ORDER = Object.keys(GAMES_CONFIG);

/**
 * 일정 타입 표시명 매핑
 */
export const EVENT_TYPE_DISPLAY = {
  "전반업데이트": "버전 업데이트",
  "후반업데이트": "후반업데이트",
  "공식방송": "공식방송",
  "행사": "공식 행사",
};
