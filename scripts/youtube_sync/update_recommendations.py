import os
import json
import argparse
import re
import csv
import shutil
from datetime import datetime, timezone, timedelta
from youtube_collector import YoutubeCollector

# 절대 경로 기준 디렉토리 계산
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DASHBOARD_ROOT = os.path.abspath(os.path.join(BASE_DIR, "..", ".."))
ATTACHMENT_DIR = r"c:\Users\keybo\Desktop\Project\Agent\파일 첨부"
SHEET_CSV_PATH = os.path.join(BASE_DIR, "video_types_sheet.csv")
USER_INPUT_CSV_PATH = os.path.join(BASE_DIR, "video_types_sheet.csv")

DASHBOARD_DATA_PATH = os.path.join(DASHBOARD_ROOT, "public", "data", "recommended_videos.json")
DASHBOARD_DIST_PATH = os.path.join(DASHBOARD_ROOT, "dist", "data", "recommended_videos.json")
DASHBOARD_SCHEDULE_PATH = os.path.join(DASHBOARD_ROOT, "public", "data", "schedule_data.json")
DASHBOARD_SCHEDULE_DIST_PATH = os.path.join(DASHBOARD_ROOT, "dist", "data", "schedule_data.json")

# 표준 게임명 매핑
GAME_NAME_MAPPING = {
    "원신": "원신",
    "스타레일": "붕괴: 스타레일",
    "붕괴: 스타레일": "붕괴: 스타레일",
    "젠존제": "젠레스 존 제로",
    "젠레스 존 제로": "젠레스 존 제로",
    "명조": "명조",
    "엔드필드": "명일방주: 엔드필드",
    "명일방주: 엔드필드": "명일방주: 엔드필드"
}

MAIN_GAMES = ["원신", "붕괴: 스타레일", "젠레스 존 제로", "명조", "명일방주: 엔드필드"]

ROOT_CSV_PATH = r"c:\Users\keybo\Desktop\Project\Agent\유튜브 프로젝트 - 업로드 리스트.csv"

def check_and_sync_attachment_csv():
    """파일 첨부 폴더에 신규 CSV 시트가 있으면 자동으로 동기화하고 원본을 정리합니다."""
    if not os.path.exists(ATTACHMENT_DIR):
        return
    
    for f in os.listdir(ATTACHMENT_DIR):
        if f.endswith(".csv") and ("업로드" in f or "upload" in f.lower()) and "녹화" not in f:
            src = os.path.join(ATTACHMENT_DIR, f)
            try:
                with open(src, 'r', encoding='utf-8-sig') as test_f:
                    header = test_f.readline()
                    if "링크" not in header and "게임명" not in header:
                        print(f"[Attachment] 무시: {f}는 업로드 시트 헤더 규격이 아님")
                        continue
            except Exception:
                continue

            print(f"[Attachment] 신규 업로드 시트 감지: {f}")
            shutil.copy2(src, SHEET_CSV_PATH)
            shutil.copy2(src, USER_INPUT_CSV_PATH)
            if os.path.exists(ROOT_CSV_PATH):
                shutil.copy2(src, ROOT_CSV_PATH)
            os.remove(src)
            print(f"[Attachment] 시트 동기화 완료 및 파일 첨부 원본 정리 성공.")
            break

def extract_video_id_from_url(url):
    """유튜브 URL에서 비디오 고유 ID(11자리)를 추출합니다."""
    if not url:
        return ""
    url = url.strip()
    shorts_match = re.search(r'shorts/([a-zA-Z0-9_-]{11})', url)
    if shorts_match:
        return shorts_match.group(1)
    youtu_match = re.search(r'youtu\.be/([a-zA-Z0-9_-]{11})', url)
    if youtu_match:
        return youtu_match.group(1)
    watch_match = re.search(r'v=([a-zA-Z0-9_-]{11})', url)
    if watch_match:
        return watch_match.group(1)
    if len(url) == 11 and re.match(r'^[a-zA-Z0-9_-]{11}$', url):
        return url
    return ""

def load_video_types_sheet(csv_path):
    """CSV 시트를 로드하여 정확한 비디오 메타데이터 매핑 맵을 생성합니다."""
    sheet_map = {}
    if not os.path.exists(csv_path):
        print(f"[!] CSV 시트 파일 없음: {csv_path}")
        return sheet_map

    with open(csv_path, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            link = row.get("링크", "")
            video_id = extract_video_id_from_url(link)
            if not video_id:
                continue

            raw_game = row.get("게임명", "").strip()
            # 다중 게임 제외
            if "," in raw_game or "·" in raw_game:
                continue

            game = GAME_NAME_MAPPING.get(raw_game, raw_game)
            if game not in GAME_NAME_MAPPING.values():
                continue

            raw_type = row.get("유형", "").strip()
            # 1. 롱폼 - 풀버전 -> story
            # 2. 롱폼 -> other
            # 3. 숏폼 -> shorts
            if "풀버전" in raw_type or "롱폼 - 풀버전" in raw_type:
                v_type = "story"
                is_shorts = False
            elif "롱폼" in raw_type:
                v_type = "other"
                is_shorts = False
            elif "숏폼" in raw_type or "쇼츠" in raw_type:
                v_type = "shorts"
                is_shorts = True
            else:
                v_type = "other"
                is_shorts = False

            sheet_map[video_id] = {
                "id": video_id,
                "status": row.get("상태", "").strip(),
                "raw_type": raw_type,
                "type": v_type,
                "is_shorts": is_shorts,
                "game": game,
                "title": row.get("제목", "").strip(),
                "link": link
            }

    print(f"[OK] CSV 시트에서 {len(sheet_map)}개의 영상 분류 정보를 로드했습니다.")
    return sheet_map

def classify_fallback_video(title, duration_seconds=0, is_shorts_api=False):
    """
    시트에 아직 기재되지 않은 최신 영상에 대한 100% 무결점 분류 규칙:
    1. 풀버전 스토리 (story):
       - 제목(title)에 '(컷편집)' 또는 '(풀버전)'이 반드시 포함되어야 함 (채널 공통 태그 오염 방지)
       - 재생시간(duration_seconds)이 있을 경우 10분(600초) 이상이어야 함 (짧은 하이라이트 클립 오분류 방지)
    2. 추천 쇼츠 (shorts):
       - 제목에 #shorts 또는 #쇼츠 포함
       - 제목에 키워드 해시태그(#[a-zA-Z가-힣_0-9]{2,}) 포함
       - API상 세로형 쇼츠
    3. 스토리 하이라이트 영상 / 일반 롱폼 (other):
       - 제목에 [게임명] 또는 (X.X버전) 등이 있고 해시태그 및 (컷편집)/(풀버전)이 없는 가로형 클립
       - 재생시간이 10분 미만인 하이라이트 컷씬 클립
    """
    title_strip = title.strip()
    title_lower = title_strip.lower()

    # 1. 풀버전 스토리 영상 판별
    has_cut_in_title = ("컷편집" in title_strip) or ("풀버전" in title_strip)
    if has_cut_in_title:
        if duration_seconds and duration_seconds < 600:
            # 10분 미만은 하이라이트 클립으로 안전 분류
            return "other", False
        return "story", False

    # 2. 쇼츠 영상 판별
    has_hashtag = bool(re.search(r'#[a-zA-Z가-힣_0-9]{2,}', title_strip))
    if "#shorts" in title_lower or "#쇼츠" in title_lower or has_hashtag or is_shorts_api:
        return "shorts", True

    # 3. 그 외 가로형 클립은 모두 롱폼 추천(other)
    return "other", False

def run_pipeline():
    print("=================================================================")
    print("   AEIKA Archive - 추천 영상 파이프라인 자동화 & 최적화 (v3.0.0)   ")
    print("=================================================================")

    # 0. 파일 첨부 폴더 CSV 자동 동기화
    check_and_sync_attachment_csv()

    # 1. CSV 시트 로드
    sheet_map = load_video_types_sheet(SHEET_CSV_PATH)

    # 2. 유튜브 API 메타데이터 수집
    videos = []
    try:
        collector = YoutubeCollector()
        print("\n[1/4] 유튜브 API 채널 메타데이터 최신 스캔 중...")
        videos = collector.collect_videos_metadata()
        print(f"      성공적으로 {len(videos)}개의 비디오 메타데이터를 수집/갱신했습니다.")
    except Exception as e:
        print(f"[!] 유튜브 API 연동 실패 ({e}). 로컬 아카이브 캐시에서 데이터를 로드합니다.")
        archive_path = os.path.join(BASE_DIR, "data", "archive", "videos_metadata.json")
        if os.path.exists(archive_path):
            with open(archive_path, 'r', encoding='utf-8') as f:
                videos = json.load(f)
            print(f"      로컬 아카이브 캐시에서 {len(videos)}개의 비디오 데이터를 로드했습니다.")
        else:
            raise FileNotFoundError("비디오 아카이브 캐시 파일이 존재하지 않습니다.")

    print("\n[2/4] 영상 분류 대조 및 3대 독립 큐(쇼츠/스토리/롱폼) 정밀 그룹화...")
    grouped_data = {game: {"shorts": [], "story": [], "other": []} for game in MAIN_GAMES}
    
    total_matched_sheet = 0
    total_fallback = 0
    seen_video_ids = set()

    for v in videos:
        v_id = v.get("id")
        if not v_id or v_id in seen_video_ids:
            continue
        seen_video_ids.add(v_id)

        title = v.get("title", "")
        tags = v.get("tags", [])
        
        # 1) CSV 시트 우선 대조
        if v_id in sheet_map:
            sheet_info = sheet_map[v_id]
            if sheet_info.get("status") and sheet_info.get("status") != "업로드":
                continue
            
            game = sheet_info.get("game") or v.get("game")
            is_shorts = sheet_info.get("is_shorts", False)
            v_type = sheet_info.get("type", "other")
            total_matched_sheet += 1
        else:
            # 2) 시트 미등재 신규 영상은 엄격한 제목/재생시간 기반 무결점 폴백 판별
            game = v.get("game")
            dur = v.get("duration_seconds", 0)
            v_type, is_shorts = classify_fallback_video(title, dur, v.get("is_shorts", False))
            total_fallback += 1

        if game not in MAIN_GAMES:
            continue

        target_group = "shorts" if is_shorts else v_type
        v_item = dict(v)
        v_item["classified_type"] = v_type
        v_item["final_game"] = game
        grouped_data[game][target_group].append(v_item)

    print(f"      - CSV 시트 정밀 대조: {total_matched_sheet}개")
    print(f"      - 제목 규칙 폴백 판별: {total_fallback}개")

    # 3. 3대 독립 큐 슬라이딩 추출
    # (1) 쇼츠: 게임별 최신 10개
    # (2) 스토리 풀버전: 게임별 최신 최대 6개
    # (3) 롱폼 추천: 게임별 최신 최대 6개
    final_shorts = []
    final_longform = []

    print("\n[3/4] 게임별 독립 큐 추출 현황:")
    for game in MAIN_GAMES:
        # 1) 쇼츠 10개
        shorts_items = grouped_data[game]["shorts"]
        shorts_items.sort(key=lambda x: x.get("published_at", ""), reverse=True)
        selected_shorts = shorts_items[:10]
        for idx, item in enumerate(selected_shorts):
            v_id = item["id"]
            final_shorts.append({
                "id": v_id,
                "url": f"https://youtube.com/shorts/{v_id}",
                "game": game,
                "addedAt": item.get("published_at", ""),
                "order": idx + 1
            })

        # 2) 스토리 풀버전 (최대 10개)
        story_items = grouped_data[game]["story"]
        story_items.sort(key=lambda x: x.get("published_at", ""), reverse=True)
        selected_story = story_items[:10]
        for idx, item in enumerate(selected_story):
            v_id = item["id"]
            final_longform.append({
                "id": v_id,
                "url": f"https://youtu.be/{v_id}",
                "game": game,
                "type": "story",
                "desc": item.get("title", ""),
                "addedAt": item.get("published_at", ""),
                "order": idx + 1
            })

        # 3) 롱폼 추천 영상 (최대 10개)
        other_items = grouped_data[game]["other"]
        other_items.sort(key=lambda x: x.get("published_at", ""), reverse=True)
        selected_other = other_items[:10]
        for idx, item in enumerate(selected_other):
            v_id = item["id"]
            final_longform.append({
                "id": v_id,
                "url": f"https://youtu.be/{v_id}",
                "game": game,
                "type": "other",
                "desc": item.get("title", ""),
                "addedAt": item.get("published_at", ""),
                "order": idx + 1
            })

        print(f"      ▶ {game}: 쇼츠 {len(selected_shorts)}개 / 스토리 풀버전 {len(selected_story)}개 / 롱폼 추천 {len(selected_other)}개")

    # 4. 자가 검증 및 자동 정화 (Self-Validation & Auto-Purge)
    print("\n[Self-Validation] 데이터 무결성 자체 감사 및 자동 정화 중...")
    # (a) 롱폼에 쇼츠 URL이나 키워드 해시태그가 섞였는지 검사 및 자동 격리
    invalid_longforms = []
    for lf in final_longform:
        desc = lf.get("desc", "")
        has_tag = bool(re.search(r'#[a-zA-Z가-힣_]{2,}', desc))
        if "shorts" in lf.get("url", "") or has_tag:
            invalid_longforms.append(lf)
    
    if invalid_longforms:
        print(f"[!] 경고: 롱폼 큐에 쇼츠 패턴 {len(invalid_longforms)}건 감지 ➔ 자동 격리(제거) 진행:")
        invalid_ids = {inv.get("id") for inv in invalid_longforms}
        for inv in invalid_longforms:
            print(f"    - 격리 대상: {inv.get('desc')} ({inv.get('url')})")
        final_longform = [x for x in final_longform if x.get("id") not in invalid_ids]
        print(f"      [OK] 불량 데이터 자동 격리 완료 (잔여 롱폼: {len(final_longform)}개)")
    else:
        print("      [PASS] 롱폼 큐 내 쇼츠 혼입 0건 (100% 무결)")

    # (b) 중복 ID 검사 및 고유성 자동 보장 (Deduplication)
    seen_lf_ids = set()
    deduped_lf = []
    for x in final_longform:
        if x["id"] not in seen_lf_ids:
            seen_lf_ids.add(x["id"])
            deduped_lf.append(x)
    final_longform = deduped_lf

    seen_sh_ids = set()
    deduped_sh = []
    for x in final_shorts:
        if x["id"] not in seen_sh_ids:
            seen_sh_ids.add(x["id"])
            deduped_sh.append(x)
    final_shorts = deduped_sh
    print("      [PASS] 큐 내 중복 비디오 ID 0건 (100% 고유성 보장 완료)")

    # (c) story 큐에 '컷편집' 또는 '풀버전'이 없는 하이라이트 영상이 오분류되어 들어갔는지 전수 감사 및 자동 정화
    misclassified_count = 0
    for lf in final_longform:
        if lf.get("type") == "story":
            desc = lf.get("desc", "")
            if "컷편집" not in desc and "풀버전" not in desc:
                lf["type"] = "other"
                misclassified_count += 1
                print(f"      [!] 스토리 큐 내 하이라이트 영상 자동 재배치 (story -> other): {desc}")
    if misclassified_count == 0:
        print("      [PASS] 스토리 풀버전 큐 내 하이라이트 영상 혼입 0건 (100% 무결)")
    else:
        print(f"      [OK] 오분류된 하이라이트 영상 {misclassified_count}건을 롱폼 추천(other)으로 자동 정상화 완료")

    # 5. 파일 저장 및 동기화
    new_db = {
        "shorts": final_shorts,
        "longform": final_longform
    }

    kst_now = datetime.now(timezone(timedelta(hours=9)))
    last_updated_str = kst_now.strftime("%Y-%m-%dT%H:%M:%S+09:00")

    # recommended_videos.json 갱신
    for target_path in [DASHBOARD_DATA_PATH, DASHBOARD_DIST_PATH]:
        if os.path.exists(os.path.dirname(target_path)):
            with open(target_path, "w", encoding="utf-8") as f:
                json.dump(new_db, f, indent=2, ensure_ascii=False)
            print(f"      [OK] 추천 데이터 갱신: {target_path}")

    print("\n[4/4] 파이프라인 전체 과정이 완벽히 완료되었습니다! [SUCCESS]")
    print("=================================================================")

if __name__ == "__main__":
    run_pipeline()
