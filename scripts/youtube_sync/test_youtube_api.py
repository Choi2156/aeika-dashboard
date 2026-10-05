import os
import json
import datetime
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from google.auth.transport.requests import Request

def test_api():
    # 1. 파일 경로 설정
    token_path = "token.json"
    creds_path = "credentials.json"
    
    if not os.path.exists(token_path) or not os.path.exists(creds_path):
        print("error: token.json 또는 credentials.json 파일이 존재하지 않습니다.")
        return

    # 2. 토큰 로드
    with open(token_path, 'r', encoding='utf-8') as f:
        token_data = json.load(f)
        
    # 3. Credentials 객체 생성
    creds = Credentials.from_authorized_user_info(token_data)

    # 4. 토큰 만료 여부 확인 및 갱신 시도
    print("Checking token validity and attempting refresh...")
    if creds.expired and creds.refresh_token:
        try:
            creds.refresh(Request())
            print("Token refreshed successfully!")
            # 갱신된 토큰 저장
            with open(token_path, 'w', encoding='utf-8') as tf:
                tf.write(creds.to_json())
        except Exception as e:
            print(f"Token refresh failed: {e}")

    # 5. YouTube Data API 호출 테스트
    print("\n--- 1. YouTube Data API Test ---")
    channel_id = None
    try:
        youtube = build('youtube', 'v3', credentials=creds)
        ch_request = youtube.channels().list(
            part="snippet,statistics",
            mine=True
        )
        ch_response = ch_request.execute()
        
        if "items" in ch_response and len(ch_response["items"]) > 0:
            channel = ch_response["items"][0]
            channel_id = channel["id"]
            snippet = channel["snippet"]
            stats = channel["statistics"]
            # UTF-8 출력 보정
            print(f"Channel ID: {channel_id}")
            print(f"Channel Title: {snippet.get('title')}")
            print(f"Subscribers: {stats.get('subscriberCount')}")
            print(f"Total Views: {stats.get('viewCount')}")
            print(f"Total Videos: {stats.get('videoCount')}")
            print("YouTube Data API call success! [OK]")
        else:
            print("Success but channel details not found (check scopes).")
    except Exception as e:
        print(f"YouTube Data API Error: {e}")

    # 6. YouTube Analytics API 호출 테스트
    print("\n--- 2. YouTube Analytics API Test ---")
    if not channel_id:
        print("Skip: Channel ID is missing, cannot query Analytics API.")
        return

    try:
        analytics = build('youtubeAnalytics', 'v2', credentials=creds)
        
        # YouTube Analytics API는 2~3일의 지연이 있으므로 안전하게 3일 전을 종료일로 지정
        today = datetime.date.today()
        start_date = (today - datetime.timedelta(days=10)).strftime("%Y-%m-%d")
        end_date = (today - datetime.timedelta(days=3)).strftime("%Y-%m-%d")
        
        print(f"Attempting query with channel=={channel_id} and dates: {start_date} ~ {end_date}")
        an_request = analytics.reports().query(
            ids=f"channel=={channel_id}",
            startDate=start_date,
            endDate=end_date,
            metrics="views,comments,likes,shares",
            dimensions="day"
        )
        an_response = an_request.execute()
        
        print(f"Query Period: {start_date} ~ {end_date}")
        if "rows" in an_response and an_response["rows"]:
            print(f"Fetched days: {len(an_response['rows'])} days")
            print("Sample daily data (Date, Views, Comments, Likes, Shares):")
            for row in an_response["rows"][:3]:
                print(row)
            print("YouTube Analytics API call success! [OK]")
        else:
            print("API call success but no data in selected period.")
    except Exception as e:
        print(f"YouTube Analytics API Error: {e}")

if __name__ == "__main__":
    test_api()
