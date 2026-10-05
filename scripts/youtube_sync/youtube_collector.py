import os
import json
import datetime
import time
import isodate  # youtube 비디오 길이(duration) 파싱용
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from google.auth.transport.requests import Request

# 절대 경로 기준 디렉토리 계산
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Shorts 판별용 최대 재생 시간 (3분 = 180초)
SHORTS_MAX_DURATION = 180


class YoutubeCollector:
    def __init__(self, config_path=None):
        if config_path is None:
            self.config_path = os.path.join(BASE_DIR, "config.json")
        else:
            self.config_path = config_path
        self.load_config()
        self.setup_clients()

    def load_config(self):
        with open(self.config_path, 'r', encoding='utf-8') as f:
            self.config = json.load(f)
        self.channel_id = self.config.get("channel_id")

        # 아카이브 디렉토리를 절대 경로로 변환
        archive_rel = self.config.get("archive_dir", "data/archive")
        self.archive_dir = os.path.join(BASE_DIR, archive_rel)
        os.makedirs(self.archive_dir, exist_ok=True)

    def setup_clients(self):
        token_path = os.path.join(BASE_DIR, "token.json")
        creds_path = os.path.join(BASE_DIR, "credentials.json")

        if not os.path.exists(token_path) or not os.path.exists(creds_path):
            raise FileNotFoundError(
                "token.json 또는 credentials.json 파일이 존재하지 않습니다. 먼저 auth_setup.py를 실행하세요."
            )

        with open(token_path, 'r', encoding='utf-8') as f:
            token_data = json.load(f)

        self.creds = Credentials.from_authorized_user_info(token_data)

        # 토큰 갱신
        if self.creds.expired and self.creds.refresh_token:
            self.creds.refresh(Request())
            with open(token_path, 'w', encoding='utf-8') as tf:
                tf.write(self.creds.to_json())

        self.youtube = build('youtube', 'v3', credentials=self.creds)
        self.analytics = build('youtubeAnalytics', 'v2', credentials=self.creds)

    # ──────────────────────────────────────────────
    # Shorts / Long-form 판별 (v2 – 3분 기준 + 해시태그)
    # ──────────────────────────────────────────────
    @staticmethod
    def classify_is_shorts(duration_seconds, title, tags=None):
        """
        영상이 Shorts인지 판별합니다.
        - 재생시간 180초 이하 → Shorts
        - 제목에 #shorts / #쇼츠 포함 → Shorts
        - 태그에 shorts / 쇼츠 포함 → Shorts
        - 그 외 → Long-form
        """
        if duration_seconds <= SHORTS_MAX_DURATION:
            return True

        title_lower = title.lower()
        if "#shorts" in title_lower or "#쇼츠" in title_lower:
            return True

        if tags:
            tags_lower = [t.lower() for t in tags]
            if "shorts" in tags_lower or "쇼츠" in tags_lower:
                return True

        return False

    # ──────────────────────────────────────────────
    # 업로드 플레이리스트 ID 조회
    # ──────────────────────────────────────────────
    def get_uploads_playlist_id(self):
        """내 채널의 '업로드된 동영상' 플레이리스트 ID 조회"""
        try:
            ch_request = self.youtube.channels().list(
                part="contentDetails", mine=True
            )
            ch_response = ch_request.execute()
            return ch_response["items"][0]["contentDetails"]["relatedPlaylists"]["uploads"]
        except Exception:
            ch_request = self.youtube.channels().list(
                part="contentDetails", id=self.channel_id
            )
            ch_response = ch_request.execute()
            return ch_response["items"][0]["contentDetails"]["relatedPlaylists"]["uploads"]

    # ──────────────────────────────────────────────
    # 전체 비디오 메타데이터 수집
    # ──────────────────────────────────────────────
    def collect_videos_metadata(self):
        """채널의 모든 동영상 정보 및 통계 데이터 수집"""
        playlist_id = self.get_uploads_playlist_id()
        videos = []
        next_page_token = None

        # 1. 플레이리스트에서 모든 비디오 ID 수집
        while True:
            pl_request = self.youtube.playlistItems().list(
                part="snippet",
                playlistId=playlist_id,
                maxResults=50,
                pageToken=next_page_token,
            )
            pl_response = pl_request.execute()

            for item in pl_response.get("items", []):
                snippet = item.get("snippet", {})
                resource = snippet.get("resourceId", {})
                if resource.get("kind") == "youtube#video":
                    videos.append({
                        "id": resource.get("videoId"),
                        "published_at": snippet.get("publishedAt"),
                        "title": snippet.get("title"),
                        "description": snippet.get("description"),
                        "thumbnail": (
                            snippet.get("thumbnails", {}).get("high", {}).get("url")
                            or snippet.get("thumbnails", {}).get("default", {}).get("url")
                        ),
                    })

            next_page_token = pl_response.get("nextPageToken")
            if not next_page_token:
                break

        print(f"총 {len(videos)}개의 동영상 ID 수집 완료. 세부 데이터 쿼리 중...")

        # 2. 비디오 50개씩 묶어서 상세 정보 조회
        detailed_videos = []
        seen_detail_ids = set()
        chunks = [videos[i : i + 50] for i in range(0, len(videos), 50)]

        for chunk in chunks:
            video_ids = ",".join([v["id"] for v in chunk])
            v_request = self.youtube.videos().list(
                part="snippet,statistics,contentDetails", id=video_ids
            )
            v_response = v_request.execute()

            video_info_map = {item["id"]: item for item in v_response.get("items", [])}

            for v in chunk:
                v_id = v["id"]
                if v_id in video_info_map:
                    item = video_info_map[v_id]
                    stats = item.get("statistics", {})
                    details = item.get("contentDetails", {})
                    snippet = item.get("snippet", {})

                    # 재생시간 파싱 (ISO 8601 -> 초)
                    duration_str = details.get("duration", "PT0S")
                    try:
                        parsed_duration = isodate.parse_duration(duration_str)
                        duration_seconds = int(parsed_duration.total_seconds())
                    except Exception:
                        duration_seconds = 0

                    # 태그 추출
                    tags = snippet.get("tags", [])

                    # Shorts 여부 판별 (v2 – 180초 기준 + 해시태그)
                    is_shorts = self.classify_is_shorts(duration_seconds, v["title"], tags)

                    # 게임 태깅 분석
                    title = v["title"]
                    description = v["description"]
                    detected_game = "기타"

                    for game, keywords in self.config.get("games_mapping", {}).items():
                        matched = False
                        for kw in keywords:
                            if kw.lower() in title.lower() or kw.lower() in description.lower():
                                matched = True
                                break
                        if not matched:
                            for t in tags:
                                for kw in keywords:
                                    if kw.lower() in t.lower():
                                        matched = True
                                        break
                        if matched:
                            detected_game = game
                            break

                    if v_id in seen_detail_ids:
                        continue
                    seen_detail_ids.add(v_id)

                    detailed_videos.append({
                        "id": v_id,
                        "title": title,
                        "published_at": v["published_at"],
                        "thumbnail": v["thumbnail"],
                        "duration_seconds": duration_seconds,
                        "is_shorts": is_shorts,
                        "game": detected_game,
                        "views": int(stats.get("viewCount", 0)),
                        "likes": int(stats.get("likeCount", 0)),
                        "comments": int(stats.get("commentCount", 0)),
                        "tags": tags,
                    })

        # 3. 아카이브 저장 (설정된 채널 시작일 이전의 과거 테스트 영상 필터링 제외)
        start_date = self.config.get("channel_start_date")
        if start_date:
            detailed_videos = [v for v in detailed_videos if v["published_at"].split("T")[0] >= start_date]

        # ID 기준 최종 고유 정렬
        unique_videos = []
        final_seen = set()
        for v in detailed_videos:
            if v["id"] not in final_seen:
                final_seen.add(v["id"])
                unique_videos.append(v)
        detailed_videos = unique_videos

        output_path = os.path.join(self.archive_dir, "videos_metadata.json")
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(detailed_videos, f, indent=2, ensure_ascii=False)

        print(f"동영상 메타데이터 아카이브 저장 완료: {output_path} (총 {len(detailed_videos)}개)")
        return detailed_videos

    # ──────────────────────────────────────────────
    # 채널 누적 통계 수집
    # ──────────────────────────────────────────────
    def collect_channel_stats(self):
        """내 채널의 현재 시점 누적 지표 수집"""
        ch_request = self.youtube.channels().list(
            part="snippet,statistics", id=self.channel_id
        )
        ch_response = ch_request.execute()

        if "items" in ch_response and len(ch_response["items"]) > 0:
            channel = ch_response["items"][0]
            snippet = channel["snippet"]
            stats = channel["statistics"]

            data = {
                "collected_at": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "channel_id": self.channel_id,
                "title": snippet.get("title"),
                "custom_url": snippet.get("customUrl"),
                "subscribers": int(stats.get("subscriberCount", 0)),
                "views": int(stats.get("viewCount", 0)),
                "videos": int(stats.get("videoCount", 0)),
            }

            output_path = os.path.join(self.archive_dir, "channel_stats.json")
            history = []
            if os.path.exists(output_path):
                try:
                    with open(output_path, 'r', encoding='utf-8') as f:
                        history = json.load(f)
                        if not isinstance(history, list):
                            history = [history]
                except Exception:
                    history = []

            history.append(data)

            unique_history = {}
            for h in history:
                date = h["collected_at"].split(" ")[0]
                unique_history[date] = h

            sorted_history = [unique_history[k] for k in sorted(unique_history.keys())]

            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(sorted_history, f, indent=2, ensure_ascii=False)

            print(f"채널 누적 통계 아카이브 저장 완료: {output_path}")
            return data
        raise ValueError("채널 통계를 가져올 수 없습니다.")

    # ──────────────────────────────────────────────
    # 일별 시계열 데이터 수집
    # ──────────────────────────────────────────────
    def collect_daily_stats(self, days_back=90):
        """최근 N일간의 일별 시계열 데이터 수집 및 점진적 병합"""
        today = datetime.date.today()
        end_date_obj = today - datetime.timedelta(days=3)
        start_date_obj = today - datetime.timedelta(days=days_back)

        start_date = start_date_obj.strftime("%Y-%m-%d")
        end_date = end_date_obj.strftime("%Y-%m-%d")

        print(f"일별 애널리틱스 통계 요청 중: {start_date} ~ {end_date}")

        an_request = self.analytics.reports().query(
            ids=f"channel=={self.channel_id}",
            startDate=start_date,
            endDate=end_date,
            metrics="views,comments,likes,shares,subscribersGained,subscribersLost,estimatedMinutesWatched",
            dimensions="day",
        )
        an_response = an_request.execute()

        daily_records = {}
        if "rows" in an_response and an_response["rows"]:
            headers = [col["name"] for col in an_response.get("columnHeaders", [])]
            day_idx = headers.index("day")
            views_idx = headers.index("views")
            comments_idx = headers.index("comments")
            likes_idx = headers.index("likes")
            shares_idx = headers.index("shares")
            sub_gain_idx = headers.index("subscribersGained")
            sub_lost_idx = headers.index("subscribersLost")
            watch_time_idx = headers.index("estimatedMinutesWatched")

            for row in an_response["rows"]:
                day = row[day_idx]
                daily_records[day] = {
                    "date": day,
                    "views": int(row[views_idx]),
                    "comments": int(row[comments_idx]),
                    "likes": int(row[likes_idx]),
                    "shares": int(row[shares_idx]),
                    "subscribers_net": int(row[sub_gain_idx]) - int(row[sub_lost_idx]),
                    "watch_time_minutes": int(row[watch_time_idx]),
                }

        # 아카이브 병합 저장
        output_path = os.path.join(self.archive_dir, "daily_stats.json")
        existing_records = {}
        if os.path.exists(output_path):
            try:
                with open(output_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    for r in data:
                        existing_records[r["date"]] = r
            except Exception:
                existing_records = {}

        existing_records.update(daily_records)
        sorted_records = [existing_records[k] for k in sorted(existing_records.keys())]

        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(sorted_records, f, indent=2, ensure_ascii=False)

        print(f"일별 시계열 데이터 아카이브 저장 완료: {output_path} (총 {len(sorted_records)}일 기록)")
        return sorted_records

    # ──────────────────────────────────────────────
    # [신규] 비디오별 애널리틱스 수집 (조회수 + 시청시간)
    # ──────────────────────────────────────────────
    def collect_video_analytics(self, days_back=365):
        """
        최근 N일간 채널 내 모든 비디오의 유효 조회수 및 시청시간(분)을 전수 수집합니다.
        YouTube Analytics API는 video 차원에 200개 제한이 있으므로,
        수집된 videos_metadata의 모든 ID를 20개 단위 청크로 분할하여 전수 쿼리합니다.
        """
        today = datetime.date.today()
        end_date_obj = today - datetime.timedelta(days=3)
        start_date_obj = datetime.date(2026, 3, 1)

        start_date = start_date_obj.strftime("%Y-%m-%d")
        end_date = end_date_obj.strftime("%Y-%m-%d")

        print(f"전체 비디오별 애널리틱스(유효 조회수) 통계 요청 중: {start_date} ~ {end_date}")

        metadata_path = os.path.join(self.archive_dir, "videos_metadata.json")
        all_video_ids = []
        if os.path.exists(metadata_path):
            with open(metadata_path, 'r', encoding='utf-8') as f:
                meta = json.load(f)
            all_video_ids = [v["id"] for v in meta]

        video_analytics = {}
        if not all_video_ids:
            # 메타데이터가 아직 없으면 기본 200개 조회
            an_request = self.analytics.reports().query(
                ids=f"channel=={self.channel_id}",
                startDate=start_date,
                endDate=end_date,
                metrics="views,estimatedMinutesWatched",
                dimensions="video",
                sort="-views",
                maxResults=200,
            )
            an_response = an_request.execute()
            rows = an_response.get("rows", [])
            for row in rows:
                video_analytics[row[0]] = {
                    "video_id": row[0],
                    "views": int(row[1]),
                    "watch_time_minutes": int(row[2]),
                }
        else:
            chunk_size = 20
            chunks = [all_video_ids[i:i + chunk_size] for i in range(0, len(all_video_ids), chunk_size)]
            print(f"총 {len(all_video_ids)}개 비디오에 대해 {len(chunks)}개 청크로 분할 요청 시작...")

            for idx, chunk in enumerate(chunks, 1):
                video_filter = ",".join(chunk)
                success = False
                for attempt in range(3):
                    try:
                        an_request = self.analytics.reports().query(
                            ids=f"channel=={self.channel_id}",
                            startDate=start_date,
                            endDate=end_date,
                            metrics="views,estimatedMinutesWatched",
                            dimensions="video",
                            filters=f"video=={video_filter}",
                        )
                        an_response = an_request.execute()
                        rows = an_response.get("rows", [])
                        for row in rows:
                            video_analytics[row[0]] = {
                                "video_id": row[0],
                                "views": int(row[1]),
                                "watch_time_minutes": int(row[2]),
                            }
                        success = True
                        break
                    except Exception as e:
                        time.sleep(1.0)

                if not success:
                    # 실패한 청크는 1개씩 개별 조회 시도
                    for vid in chunk:
                        try:
                            an_request = self.analytics.reports().query(
                                ids=f"channel=={self.channel_id}",
                                startDate=start_date,
                                endDate=end_date,
                                metrics="views,estimatedMinutesWatched",
                                dimensions="video",
                                filters=f"video=={vid}",
                            )
                            an_response = an_request.execute()
                            rows = an_response.get("rows", [])
                            for row in rows:
                                video_analytics[row[0]] = {
                                    "video_id": row[0],
                                    "views": int(row[1]),
                                    "watch_time_minutes": int(row[2]),
                                }
                        except Exception:
                            pass

                if idx % 10 == 0 or idx == len(chunks):
                    print(f"애널리틱스 수집 진행: {idx}/{len(chunks)} 청크 완료 (수집된 비디오: {len(video_analytics)}개)")

        # 아카이브 저장
        output_path = os.path.join(self.archive_dir, "video_analytics.json")
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(video_analytics, f, indent=2, ensure_ascii=False)

        print(f"비디오별 애널리틱스(유효 조회수) 아카이브 저장 완료: {output_path} ({len(video_analytics)}개 비디오)")
        return video_analytics

    # ──────────────────────────────────────────────
    # 종합 동기화
    # ──────────────────────────────────────────────
    def sync_all(self):
        """종합 동기화 작업 실행"""
        print(f"=== 유튜브 데이터 동기화 시작: {datetime.datetime.now()} ===")
        ch_stats = self.collect_channel_stats()
        v_meta = self.collect_videos_metadata()
        d_stats = self.collect_daily_stats(days_back=180)
        v_analytics = self.collect_video_analytics(days_back=365)
        print("=== 유튜브 데이터 동기화 완료! ===")
        return {
            "channel_stats": ch_stats,
            "videos_count": len(v_meta),
            "daily_stats_days": len(d_stats),
            "video_analytics_count": len(v_analytics),
        }


if __name__ == "__main__":
    collector = YoutubeCollector()
    collector.sync_all()
