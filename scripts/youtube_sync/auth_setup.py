import os
import json
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials

def run_auth():
    backup_path = r"c:\Users\keybo\Desktop\Project\Agent\99_Backups_and_Assets\안티그래비티_자격증명_백업.json"
    
    if not os.path.exists(backup_path):
        print(f"오류: 자격증명 백업 파일을 찾을 수 없습니다. 경로: {backup_path}")
        return

    # 1. 백업 데이터 로딩 및 credentials.json 추출
    with open(backup_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    yt_api_data = data.get("youtube_api", {})
    creds_config = yt_api_data.get("credentials") # installed 키를 포함한 전체 credentials 딕셔너리
    
    if not creds_config:
        print("오류: 백업 파일 내에 유튜브 OAuth 클라이언트 정보(credentials)가 없습니다.")
        return
        
    credentials_json_path = "credentials.json"
    with open(credentials_json_path, 'w', encoding='utf-8') as cf:
        json.dump(creds_config, cf, indent=2, ensure_ascii=False)
    print(f"[1] OAuth 클라이언트 정보 '{credentials_json_path}' 생성 완료.")

    # 2. OAuth 2.0 로컬 인증 플로우 실행 (웹 브라우저 팝업)
    scopes = [
        'https://www.googleapis.com/auth/youtube.readonly',
        'https://www.googleapis.com/auth/yt-analytics.readonly'
    ]
    
    print("\n[2] 구글 계정 인증을 위해 브라우저 창을 엽니다...")
    print("브라우저에서 유튜브 채널 읽기 권한을 허용해 주세요.")
    
    try:
        # OAuth flow
        flow = InstalledAppFlow.from_client_secrets_file(
            credentials_json_path,
            scopes=scopes
        )
        # 로컬 서버 실행하여 로그인 코드 수신
        creds = flow.run_local_server(port=0)
        
        # 3. 신규 token.json 파일 저장
        token_json_path = "token.json"
        with open(token_json_path, 'w', encoding='utf-8') as tf:
            tf.write(creds.to_json())
        print(f"\n[3] 새로운 인증 토큰 '{token_json_path}' 저장 완료!")
        
        # 4. 검증 호출 시도
        print("\n[4] 갱신된 토큰으로 API 연결 검증 진행...")
        youtube = build('youtube', 'v3', credentials=creds)
        ch_request = youtube.channels().list(
            part="snippet,statistics",
            mine=True
        )
        ch_response = ch_request.execute()
        
        if "items" in ch_response and len(ch_response["items"]) > 0:
            channel = ch_response["items"][0]
            snippet = channel["snippet"]
            stats = channel["statistics"]
            print(f"인증 성공! 연결된 채널명: {snippet.get('title')}")
            print(f"채널 구독자 수: {stats.get('subscriberCount')}명")
            print("이제 새로운 토큰 세션이 확보되어 API 통신이 가능합니다.")
        else:
            print("인증은 성공했으나 채널 정보 조회 결과가 비어있습니다.")
            
    except Exception as e:
        print(f"\n[!] 인증 과정 중 오류 발생: {e}")
        print("참고: 구글 클라우드 콘솔에 해당 계정이 '테스트 사용자'로 등록되어 있는지 확인해 주세요.")

if __name__ == "__main__":
    run_auth()
