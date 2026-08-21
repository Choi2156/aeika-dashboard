# 🎮 AEIKA Archive - 서브컬처 게임 통합 일정 대시보드

<div align="center">

![React](https://img.shields.io/badge/React-19.1.0-61DAFB?style=flat-square&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-6.3.0-646CFF?style=flat-square&logo=vite&logoColor=white)
![Version](https://img.shields.io/badge/Version-v1.2.3-818CF8?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

**원신 · 붕괴: 스타레일 · 젠레스 존 제로 · 명조 · 명일방주: 엔드필드**  
주요 서브컬처 5대 타이틀의 버전 업데이트, 공식 특별 방송, 픽업 및 오프라인 행사를 한눈에 조망하는 **실시간 통합 일정 대시보드**입니다.

[🌐 **대시보드 라이브 웹사이트 바로가기**](https://choi2156.github.io/aeika-dashboard/) &nbsp;|&nbsp; [📺 **애이카 아카이브 유튜브 채널**](https://www.youtube.com/@AEIKA215)

</div>

---

## 📌 서비스 소개 (Overview)

**애이카 아카이브 대시보드**는 분산되어 있는 서브컬처 게임들의 패치 주기, 공식 방송 일정, 전/후반 픽업 기간을 단일 페이지에서 시각적으로 직관적이게 탐색할 수 있도록 설계된 비공식 오픈소스 팬 프로젝트입니다.

외부의 무거운 차트 라이브러리 없이, **순수 CSS Grid와 React State 연산 엔진**을 통해 0.5px 오차 없는 칼같은 타임라인을 구현하여 PC와 모바일 모든 환경에서 초경량·고성능으로 구동됩니다.

---

## ✨ 주요 핵심 기능 (Key Features)

```
┌────────────────────────────────────────────────────────────────────────┐
│ 📢 상단 롤링 공지 배너 (HOT / 카테고리 태그 알림)                     │
├────────────────────────────────────────────────────────────────────────┤
│ 🎮 게임 필터바 (원신 | 스타레일 | 젠존제 | 명조 | 엔드필드 | 전체선택) │
├────────────────────────────────────────────────────────────────────────┤
│ 📊 실시간 간트 차트 (확정 일정 1순위 + 미래 버전 자동 예측 합성 엔진) │
├──────────────────────────────────┬─────────────────────────────────────┤
│ 🎙️ 다가오는 방송/오프라인 행사     │ 🎬 추천 인기 쇼츠 (10개 풀 셔플)    │
│ 📺 스토리 풀버전 / 롱폼 추천 영상 │ 📢 공지사항 통합 박스 (3대 분류/모달)│
└──────────────────────────────────┴─────────────────────────────────────┘
```

- 📊 **실시간 간트 차트 타임라인 (Gantt Chart)**:
  - 각 게임별 전반/후반 버전 업데이트, 공식 방송, 오프라인 행사를 하나의 타임라인에 병렬 시각화.
  - 마우스 호버 및 클릭 시 상세 정보 모달과 공식 링크 제공.
- 🔮 **지능형 하이브리드 일정 예측 엔진 (Scheduler)**:
  - 공식 발표된 **[확정]** 일정과 과거 생명주기를 기반으로 한 **[예상]** 일정을 유기적으로 합성(Chaining).
  - 단축 패치 주기(32일/35일 등) 및 마일스톤 버전 점프(6.7 ➔ 7.0 등) 예외 힌트 오버라이드 엔진 탑재.
- 🎬 **추천 쇼츠 스마트 셔플 & 롱폼 분기 (YouTube Integration)**:
  - 채널 최신 쇼츠 풀(게임별 10개)에서 새로고침 시 균등/무작위 셔플을 통해 매번 색다른 6개 추천.
  - 스토리 풀버전(컷편집)과 일반 롱폼(하이라이트/클립) 섹션 분기 렌더링.
- 📢 **체계적인 공지사항 알림 시스템**:
  - 상단 1줄 롤링 띠배너, 하단 통합 공지 위젯, 전체/상세 팝업 모달 연계.
  - 3대 카테고리(`패치`, `일반`, `홍보`) 배지 및 중요(`🔥`) 독립 아이콘 하이라이트.
- 📱 **모바일 퍼스트 반응형 레이아웃**:
  - 모바일 접속 시 직관적인 리스트 뷰 디폴트화, 제스처 스와이프 및 브라우저 뒤로가기(`popstate`) 완벽 지원.

---

## 🛠️ 기술 스택 및 아키텍처 (Tech Stack)

| 구분 | 기술 스택 | 설명 |
|---|---|---|
| **Core** | `React 19.x` | 최신 동시성 렌더링 및 Hooks 기반 컴포넌트 아키텍처 |
| **Build** | `Vite 6.x` | 초고속 ESM 번들러 및 정적 사이트 컴파일러 |
| **Icons** | `Lucide React` | 가볍고 일관된 벡터 아이콘 세트 |
| **Styling** | `Vanilla CSS` | CSS Custom Properties 기반 다크/라이트 테마 및 글래스모피즘 |
| **Hosting** | `GitHub Pages` | 정적 CDN 호스팅 (`dist/` 배포 자동화) |

---

## 🚀 빠른 시작 (Getting Started)

### 1. 저장소 클론
```bash
git clone https://github.com/Choi2156/aeika-dashboard.git
cd aeika-dashboard
```

### 2. 패키지 설치
```bash
npm install
```

### 3. 로컬 개발 서버 실행
```bash
npm run dev
```
브라우저에서 `http://localhost:5173/` 접속

### 4. 프로덕션 빌드
```bash
npm run build
```

---

## 📂 프로젝트 구조 (Directory Structure)

```
002_Subculture-Game-Dashboard-Dev/
├── dist/                      # 컴파일된 정적 웹 사이트 배포 파일
├── public/
│   ├── assets/                # 최적화된 WebP 이미지 에셋
│   └── data/                  # 실시간 갱신용 JSON 데이터베이스
│       ├── schedule_data.json      # 확정 일정 데이터
│       ├── schedule_hints.json     # 예측 주기/점프 예외 힌트
│       ├── recommended_videos.json # 유튜브 추천 영상 목록 (쇼츠 10개 큐)
│       ├── notices.json            # 공지사항 데이터
│       └── patch_notes.json        # 릴리즈 패치노트
├── src/
│   ├── components/            # UI 컴포넌트 (모달, 배너, 위젯 등)
│   ├── engine/
│   │   └── scheduler.js       # 확정 + 예측 타임라인 합성 연산 엔진
│   ├── hooks/                 # 커스텀 훅 (useScheduleData)
│   ├── styles/                # CSS 스타일 시트
│   ├── views/                 # 간트 뷰 / 리스트 뷰
│   └── App.jsx                # 메인 애플리케이션 진입점
├── package.json
└── vite.config.js
```

---

## ⚖️ 저작권 및 상표권 고지 (Copyright Notice)

본 대시보드 사이트에 수납·표시되는 모든 서브컬처 게임들의 캐릭터 일러스트, 정식 로고, 타이틀 상표권 및 기타 게임 콘텐츠 데이터의 소유권은 원제조사 및 공식 퍼블리셔사에 귀속됩니다.

- **원신 / 붕괴: 스타레일 / 젠레스 존 제로**: Copyright © COGNOSPHERE. All Rights Reserved.
- **명조: 워더링 웨이브**: Copyright © KURO GAMES. ALL RIGHTS RESERVED.
- **명일방주 / 명일방주: 엔드필드**: Copyright © GRYPHLINE / HYPERGRYPH. All Rights Reserved.

본 대시보드는 정보 공유 및 게이머 커뮤니티 편의 제공을 목적으로 운영되는 **비공식 팬 사이트(Fan Project)**이며, 권리자들의 지식재산권을 전적으로 존중합니다.

---

## 🔮 면책 조항 (Disclaimers)

1. **데이터 신뢰성**:
   - 대시보드 일정 내 **[확정]** 마크는 제조사 공식 발표를 확인 후 반영한 정보이나 수동 입력 과정에서 오탈자가 발생할 수 있습니다.
   - **[예상]** 마크 및 D-Day 타이머는 과거 업데이트 주기를 바탕으로 알고리즘이 산출한 예상치이므로 실제 패치 시점과 차이가 발생할 수 있습니다.
2. **법적 책임 면제**:
   - 본 사이트의 정보를 참고하여 발생한 어떠한 직간접적인 손해나 법적 결과에 대해서도 책임을 지지 않습니다. 중요 일정은 반드시 각 게임의 인게임 공식 공지사항을 교차 확인해 주시기 바랍니다.

---

## 📄 라이선스 (License)

본 프로젝트의 소스 코드는 [MIT License](LICENSE)에 따라 자유롭게 수정 및 배포할 수 있습니다.

---

<div align="center">
  <sub>Developed & Managed with ❤️ by <strong>AEIKA Archive</strong></sub>
</div>
