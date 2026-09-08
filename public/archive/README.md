# 📦 Public Archive Hub (대시보드 통합 아카이브 저장소)

이 디렉토리는 사이트 운영 과정에서 누적되는 과거 일정 데이터, 월간 마일스톤 캘린더 이미지 등 아카이빙 자료를 체계적으로 보관하여 과거 기록을 손쉽게 열람/참고할 수 있도록 구성된 통합 아카이브 허브입니다.

---

## 📂 폴더 구조 및 규격

\public/archive/
├── calendars/           # 🗓️ 월별 최종 마일스톤 캘린더 이미지 보관소
│   ├── calendar_2026_09.png
│   └── calendar_2026_09.webp
│
├── schedules/           # 🗄️ 만료된 과거 분기/연도별 일정 데이터 보관소
│   └── archive_2026_Q2.json
│
└── README.md            # 본 안내 문서
\
---

## ⚙️ 자동 갱신 및 보존 정책

### 1. calendars/ (월별 캘린더 이미지)
- **자동 갱신 파이프라인**: 000_Operations_Guides/scripts/generate_calendar.py 실행 시 자동으로 당월 캘린더 이미지(calendar_{YYYY}_{MM}.png, calendar_{YYYY}_{MM}.webp)가 본 폴더에 복사/저장됩니다.
- **최신 1장 보존 원칙**: 확정되지 않은 일정의 수정 등으로 한 달 내에 캘린더 이미지가 여러 번 재생성되더라도, 동일한 파일명으로 덮어쓰기(overwrite) 처리되어 **각 월의 가장 마지막(최신) 버전 1장만 영구 보존**됩니다.
- **실시간 서빙과의 관계**: 사이트 라이브 모달은 public/assets/calendar/calendar_current.*를 바라보며, 본 아카이브 폴더는 과거 월별 히스토리 기록 보존용으로 활용됩니다.

### 2. schedules/ (과거 일정 데이터)
- **만료 데이터 아카이빙**: 분기(Quarter) 또는 반기/연 단위로 만료된 지난 일정 데이터를 분리 저장하여 대시보드 메인 로딩 성능(schedule_data.json 경량화)을 보장합니다.
- **기존 경로 호환성**: public/data/archive/ 경로와의 완벽한 하위 호환성을 유지합니다.
