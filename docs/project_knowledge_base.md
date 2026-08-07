# 📚 AEIKA Dashboard 아키텍처 & 기술 지식 종합 백서 (Project Knowledge Base)

본 문서는 대시보드 개발 및 운영 과정에서 정립된 **아키텍처 설계 철학, 3단계 예측 연산 엔진 구조, 화면 레이아웃 보정 기법, UX 최적화 노하우 및 해결된 주요 이슈 히스토리**를 종합적으로 수록한 프로젝트 통합 기술 지식 가이드북입니다.

---

## 1. 개요 및 설계 철학 (Architecture Philosophy)

### 1.1 하이브리드 정적 아키텍처 (Static JSON + React SPA)
- **무장애 안정성 최우선**: RDBMS/NoSQL 서버 관리가 유발할 수 있는 서버 다운, API 요청 쿼터 초과, 네트워크 지연을 근본적으로 방지하기 위해 **정적 JSON 파일 기반 스토리지 및 CDN 배포 구조**를 채택했습니다.
- **AI 파트너십 구축**: AI 에이전트와의 밀접한 협업을 통해 초고속으로 구현되었으며, 하드코딩 방식 대신 정밀 설계된 **알고리즘 기반 자동 예측 엔진**을 이식하여 운영 부하를 최소화했습니다.
- **수동 확정 + 자동 예측 하이브리드**: 공식 발표된 일정(`is_fixed: true`)은 100% 정확하게 노출하되, 발표되지 않은 미래 일정은 게임별 고유 패치 주기 패턴에 따라 알고리즘이 겹침 없이 유연하게 예측 계산합니다.

---

## 2. 데이터 구조 및 병합 파이프라인 (Data Architecture)

일정 데이터는 총 4개의 데이터 소스가 유기적으로 병합되어 동작합니다:

```
[ gamesConfig.js ] (마스터 프로필 & 기본 주기)
         │
[ schedule_data.json ] (히스토리 베이스) ───┐
         │                                  ├──> [ useScheduleData.js ] ──> [ scheduler.js ] ──> [ Gantt / List View ]
[ schedule_updates.json ] (실시간 수동 확정) ──┤   (10분 캐시 & Map Merge)   (3단계 예측 연산)
         │                                  │
[ schedule_hints.json ] (예외 주기 힌트) ───┘
```

### 2.1 4대 데이터 소스 역할
1. `src/config/gamesConfig.js`: 게임별 기본 고유 속성(테마 색상, 기본 패치 주기 `cycle: 42일`, 반주기 `halfCycle: 21일`, 방송 오프셋 `streamOffset: -12일`, 공식 링크 등) 관리
2. `public/data/schedule_data.json`: 시계열 기초 일정 데이터 히스토리 저장
3. `public/data/schedule_updates.json`: 신규 공지사항(공식방송, 버전 전/후반, 콜라보 등) 수동 확정 주입
4. `public/data/schedule_hints.json`: 버전 번호 점프(`4.8 -> 5.0`), 연장 주기 변경 등 예외 예측 규칙 제어

### 2.2 비동기 캐싱 & 덮어쓰기 (`useScheduleData.js`)
- 10분 단위 브라우저 타임스탬프(`?t=...`)를 부여하여 정적 JSON 파일들을 병렬 `fetch`합니다.
- `schedule_data.json`의 데이터 위에 `schedule_updates.json`의 최신 데이터가 **ID 맵(Map) 기반으로 덮어쓰기(Merge & Override)**되어 완벽한 무결성을 유지합니다.

---

## 3. 3단계 스케줄 예측 & 보정 알고리즘 (`src/engine/scheduler.js`)

### 3.1 3단계 우선순위 메커니즘
1. **1순위 (확정 데이터, `is_fixed: true`)**: 수동 입력된 정식 공지사항. 연산 엔진이 절대수정하거나 삭제하지 않고 최우선 원본을 보존합니다.
2. **2순위 (힌트 데이터, `schedule_hints.json`)**: 예외 패치 주기 및 버전 강제 점프 오버라이드 힌트를 2순위로 반영합니다.
3. **3순위 (패턴 연산 데이터, `gamesConfig.js`)**: 기준일로부터 기본 패치 주기(`cycle: 42일`)를 더해 미래의 전반/후반/방송 일정을 연산(`is_fixed: false`)합니다.

### 3.2 겹침 및 연장 자동 보정 알고리즘
- **버전 기간 연장 보정 (`end_date` 이격)**: 주년 행사 등으로 이전 버전의 `end_date`가 명시되어 패치 기간이 연장된 경우, 차기 버전의 예상 시작일이 이전 버전 종료일 이전이 되지 않도록 **`end_date + 1일`로 자동으로 밀어내어 이격**시킵니다.
- **특정 게임 요일 보정**: 명일방주: 엔드필드 등 특정 요일(목요일) 패치 고정 게임의 경우, 자동 연산 결과가 금요일에 걸칠 때 하루를 당겨 목요일로 맞추는 요일 보정이 작동합니다.

---

## 4. UI/UX 레이아웃 제어 및 성능 최적화 노하우

### 4.1 간트 차트 겹침 일정 레인 전환 기법 (`lane_override`)
- **개요**: 동일 타입(예: `오프라인이벤트` vs `오프라인이벤트`)의 일정이 동일 기간 내에 겹쳐 세로 위치가 중첩되는 경우 사용합니다.
- **원칙**: 이벤트 본래 데이터 속성(`type: "오프라인이벤트"`, 📍 아이콘, 상세 팝업 정보)은 **100% 원본 유지**하며, 간트 차트 세로 위치(레인)만 비어있는 방송 라인으로 옮겨 렌더링합니다.
- **GanttView.jsx 연산 로직**:
  ```javascript
  const targetType = ev.lane_override || ev.type;
  const laneIndex = lanes.indexOf(targetType) !== -1 ? lanes.indexOf(targetType) : 0;
  const topPos = `${laneIndex * 36 + 6}px`;
  ```
- **설정 예시 (`schedule_updates.json`)**:
  ```json
  {
    "id": "EVT_WW_20260829_0001",
    "game": "명조",
    "type": "오프라인이벤트",
    "title": "명조 월드 투어 콘서트",
    "lane_override": "공식방송"
  }
  ```

### 4.2 모바일 UX & 뒤로가기 팝업 제어
- **모바일 뒤로가기(`popstate`) 제어**: 상세 모달(`DetailModal.jsx`) 및 후원/안내 팝업이 열린 상태에서 스마트폰의 '뒤로가기' 버튼이나 제스처 실행 시, 페이지 이탈 대신 팝업만 닫히도록 히스토리 이벤트를 캡처합니다.
- **뷰 전환 스크롤 리셋**: 간트 차트 뷰 ➔ 리스트 뷰 교차 전환 시 `window.scrollTo(0, 0)`를 자동 호출하여 최상단 위치를 복구합니다.
- **모바일 75% 축소 배율 (`zoom: 0.75`)**: [src/styles/base.css](file:///src/styles/base.css)의 미디어 쿼리 조정을 통해 모바일 기기 접속 시 정보 밀도와 가독성을 상향했습니다.

### 4.3 렌더링 가속 & 터치/마우스 조작성
- **DOM 가속**: 화면 밖의 차트 그리드 렌더링 부하를 제거하기 위해 `.gantt-row`에 `content-visibility: auto` CSS 속성이 이식되어 있습니다.
- **마우스 휠 & 드래그 가로 스크롤**: PC 뷰에서 마우스 세로 휠 이벤트를 가로 스크롤로 변환하며, 마우스 드래그(Swipe to Scroll) 시 클릭 이벤트 오발동을 캡처 차단합니다.

---

## 5. 이미지 에셋 수집 및 자동 최적화 규격 (`.agents/rules/images.md`)

- **원본 수집 폴더**: `c:\Users\keybo\Desktop\Project\Agent\파일 첨부`
- **배치 경로**: `public/assets/`
- **파일명 규격**: 영문 소문자 + 언더스코어 (`game_version_type.webp`)
- **자동 최적화 워크플로우**: Python PIL 스크립트를 가동하여 이미지 수집 ➔ WebP 품질 80% 압축 ➔ `public/assets/` 배치 ➔ `파일 첨부` 폴더의 원본 자동 삭제

---

## 6. 주요 해결 이슈 & 기술 히스토리

| 버전 | 일자 | 주요 내용 및 해결 이슈 | 적용 기술 및 파일 |
|---|---|---|---|
| **v1.2.2** | 2026-07-21 | 모바일 축소 배율(`0.75`), 뷰 전환 스크롤 리셋, 최상위 `ErrorBoundary` 탑재, WebP 압축 적용 | `base.css`, `App.jsx`, `ErrorBoundary.jsx` |
| **v1.2.1** | 2026-07-11 | 엔드필드 등 목요일 점검 게임의 이전 버전 마감일(수요일) 이격 연산 보정 | `scheduler.js` |
| **v1.2.0** | 2026-06-12 | 데이터 10분 캐싱 타임스탬프 파이프라인 구축 및 번들 분리 최적화 | `useScheduleData.js` |
| **v1.1.3** | 2026-06-12 | 모바일 뒤로가기(`popstate`) 시 모달/팝업 제어 및 크티 후원 연동 | `DetailModal.jsx`, `Header.jsx` |
| **v1.1.0** | 2026-05-30 | 종료된 오프라인 이벤트 간트 차트 14일 연장 표기 및 자동 아카이빙 | `GanttView.jsx` |
| **v1.0.3** | 2026-05-27 | 모바일 터치 스와이프 및 PC 마우스 휠/드래그 가로 스크롤 변환 지원 | `GanttView.jsx` |
| **최신** | 2026-08-07 | 간트 차트 겹침 해소용 `lane_override` 동적 레인 전환 기법 구현 (명조 월드투어 8/29 반영) | `GanttView.jsx`, `schedule_updates.json` |
