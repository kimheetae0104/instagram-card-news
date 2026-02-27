import os
import sys
import shutil
import glob
import subprocess
import json
import base64
import hashlib
from fastapi import FastAPI, UploadFile, File, HTTPException, Form, Depends
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pathlib import Path
from dotenv import load_dotenv
from authlib.integrations.starlette_client import OAuth
from starlette.middleware.sessions import SessionMiddleware
from starlette.requests import Request
from jose import jwt, JWTError
from datetime import datetime, timedelta
import httpx
from fastapi.staticfiles import StaticFiles
import xml.etree.ElementTree as ET
from pytrends.request import TrendReq
from cryptography.fernet import Fernet

# 부모 디렉토리를 Python 경로에 추가
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from execution.research_topic import research_topic
from execution.generate_html_from_text import generate_html


# 환경변수로 pytrends 사용 여부 제어 (기본은 RSS 사용)
USE_PYTREND = os.getenv("USE_PYTREND", "false").lower() == "true"
from typing import Optional

load_dotenv(dotenv_path=os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env'), override=True)

app = FastAPI(title="Card News to Instagram Engine")

# JWT & OAuth Settings
SECRET_KEY = os.environ.get("SECRET_KEY", "A_VERY_SECRET_KEY_FOR_JWT")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 # 1 Day

GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET")
BACKEND_URL = os.environ.get("BACKEND_URL", "").rstrip("/")

# ── API 키 암호화 (Fernet 대칭키) ──────────────────────────────────────────
# ENCRYPTION_KEY 환경변수가 없으면 SECRET_KEY를 32바이트 해시로 변환해 사용
_raw_enc_key = os.environ.get("ENCRYPTION_KEY", SECRET_KEY)
_fernet_key = base64.urlsafe_b64encode(hashlib.sha256(_raw_enc_key.encode()).digest())
_fernet = Fernet(_fernet_key)

def encrypt_key(plain: str) -> str:
    """API 키를 Fernet으로 암호화해 문자열 반환"""
    if not plain:
        return ""
    return _fernet.encrypt(plain.encode()).decode()

def decrypt_key(token: str) -> str:
    """Fernet으로 암호화된 토큰을 복호화"""
    if not token:
        return ""
    try:
        return _fernet.decrypt(token.encode()).decode()
    except Exception:
        # Fernet 토큰 형식("gAAAAA"로 시작)이면 복호화 실패 → 빈 문자열 반환
        # (쓰레기 암호화 토큰이 API 키로 사용되는 것 방지)
        if token.startswith('gAAAAA'):
            return ""
        # 구버전 평문 API 키는 그대로 반환 (하위 호환)
        return token
# ──────────────────────────────────────────────────────────────────────────

oauth = OAuth()
oauth.register(
    name='google',
    client_id=GOOGLE_CLIENT_ID,
    client_secret=GOOGLE_CLIENT_SECRET,
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={
        'scope': 'openid email profile'
    }
)

IS_PRODUCTION = bool(BACKEND_URL and BACKEND_URL.startswith("https"))
app.add_middleware(
    SessionMiddleware,
    secret_key=SECRET_KEY,
    https_only=IS_PRODUCTION,
    same_site="none" if IS_PRODUCTION else "lax",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Auth Routes
@app.get('/debug-oauth')
async def debug_oauth(request: Request):
    """진단용: OAuth 설정 확인"""
    redirect_uri = BACKEND_URL + "/auth" if BACKEND_URL else str(request.url_for('auth')).replace("127.0.0.1", "localhost")
    return {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri_generated": redirect_uri,
        "backend_url_env": BACKEND_URL or "(not set - using request URL)",
        "request_base_url": str(request.base_url),
    }

@app.get('/login')
async def login(request: Request):
    # BACKEND_URL 환경변수가 있으면 그것을 사용 (프로덕션), 없으면 요청 URL 사용 (로컬)
    if BACKEND_URL:
        redirect_uri = BACKEND_URL + "/auth"
    else:
        redirect_uri = str(request.url_for('auth')).replace("127.0.0.1", "localhost")

    return await oauth.google.authorize_redirect(request, redirect_uri)

@app.get('/auth')
async def auth(request: Request):
    try:
        token = await oauth.google.authorize_access_token(request)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"OAuth failed: {str(e)}")
        
    user = token.get('userinfo')
    if user:
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user["email"], "name": user.get("name"), "picture": user.get("picture")},
            expires_delta=access_token_expires
        )
        frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:5189")
        from fastapi.responses import RedirectResponse
        return RedirectResponse(url=f"{frontend_url}?token={access_token}")
    
    return JSONResponse({"error": "Failed to login"})

@app.get("/api/me")
async def get_me(request: Request):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return JSONResponse({"authenticated": False})
    
    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return {"authenticated": True, "user": payload}
    except JWTError:
        return JSONResponse({"authenticated": False})

async def get_current_user(request: Request):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# Workspace Logic — use script-relative path so it works on any server (Railway, local, etc.)
WORKSPACE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TMP_DIR = os.path.join(WORKSPACE, ".tmp")
os.makedirs(TMP_DIR, exist_ok=True)
SLIDES_DIR = os.path.join(TMP_DIR, "slides")
os.makedirs(SLIDES_DIR, exist_ok=True)
UPLOADS_DIR = os.path.join(WORKSPACE, "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)

# Serve static files
app.mount("/api/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

pytrend = TrendReq(hl='ko-KR', tz=540)
# 히스토리는 유저별로 user_settings.json 내 "history" 키에 저장 (전역 파일 사용 안 함)

def load_user_history(email: str) -> list:
    """특정 유저의 히스토리만 반환"""
    all_settings = load_settings()
    return all_settings.get(email, {}).get("history", [])

def save_user_history(email: str, entry: dict):
    """특정 유저의 히스토리에 항목 추가 (최대 20개)"""
    all_settings = load_settings()
    user_data = all_settings.get(email, {})
    history = user_data.get("history", [])
    entry["id"] = datetime.now().strftime("%Y%m%d%H%M%S")
    entry["timestamp"] = datetime.now().isoformat()
    history.insert(0, entry)
    history = history[:20]  # 최대 20개 유지
    user_data["history"] = history
    all_settings[email] = user_data
    try:
        with open(SETTINGS_FILE, "w", encoding="utf-8") as f:
            json.dump(all_settings, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"History save error: {e}")

SETTINGS_FILE = os.path.join(TMP_DIR, "user_settings.json")

def load_settings():
    try:
        if os.path.exists(SETTINGS_FILE):
            with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception as e:
        print(f"Settings load error: {e}")
    return {}

def save_user_settings(email, settings: dict):
    """API 키를 암호화해서 저장 (history 등 기존 데이터는 보존)"""
    all_settings = load_settings()
    # 기존 유저 데이터 로드 (history 등 보존)
    user_data = all_settings.get(email, {})
    # API 키만 업데이트 (history 등 다른 필드는 건드리지 않음)
    for k, v in settings.items():
        if v:
            user_data[k] = encrypt_key(v)
        else:
            user_data[k] = ""
    all_settings[email] = user_data
    with open(SETTINGS_FILE, "w", encoding="utf-8") as f:
        json.dump(all_settings, f, ensure_ascii=False, indent=2)

def get_decrypted_settings(email: str) -> dict:
    """저장된 암호화 키를 복호화해서 반환"""
    all_settings = load_settings()
    user_settings = all_settings.get(email, {})
    return {
        "gemini_api_key": decrypt_key(user_settings.get("gemini_api_key", "")),
        "claude_api_key": decrypt_key(user_settings.get("claude_api_key", "")),
        "openai_api_key": decrypt_key(user_settings.get("openai_api_key", "")),
    }

class UserSettings(BaseModel):
    gemini_api_key: Optional[str] = None
    claude_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None

def _mask(key: str) -> str:
    """프론트엔드 표시용 마스킹 — 앞 6자리만 노출"""
    if not key or len(key) < 8:
        return "****" if key else ""
    return key[:6] + "****"

@app.get("/api/user/settings")
async def get_user_settings_endpoint(user: dict = Depends(get_current_user)):
    dec = get_decrypted_settings(user["email"])
    # 프론트엔드에는 마스킹된 값만 반환 (실제 키는 노출 안 함)
    return {
        "gemini_api_key": _mask(dec["gemini_api_key"]),
        "claude_api_key": _mask(dec["claude_api_key"]),
        "openai_api_key": _mask(dec["openai_api_key"]),
        # 키 존재 여부 플래그 (UI에서 "저장됨" 표시용)
        "gemini_set": bool(dec["gemini_api_key"]),
        "claude_set": bool(dec["claude_api_key"]),
        "openai_set": bool(dec["openai_api_key"]),
    }

@app.post("/api/user/settings")
async def save_user_settings_endpoint(settings: UserSettings, user: dict = Depends(get_current_user)):
    save_user_settings(user["email"], settings.dict())
    return {"status": "ok"}

@app.get("/api/trends")
async def get_trends():
    try:
        # 1️⃣ 기존 옵션: USE_PYTREND 플래그가 true이면 일일 트렌드 직접 pytrends 사용
        if USE_PYTREND:
            df = pytrend.trending_searches(pn='south_korea')
            trends = df[0].tolist()[:15]
            return {"trends": trends, "source": "google_trends_pytrend"}

        # 3️⃣ RSS 피드 시도 (기본)
        rss_url = "https://trends.google.co.kr/trends/trendingsearches/daily/rss?geo=KR"
        async with httpx.AsyncClient() as client:
            resp = await client.get(rss_url, timeout=10.0)
            if resp.status_code == 200:
                root = ET.fromstring(resp.text)
                trends = []
                for item in root.findall(".//item"):
                    title = item.find("title").text
                    trends.append(title)
                if trends:
                    return {"trends": trends[:15], "source": "google_trends_rss"}

        # 4️⃣ RSS 실패 시 pytrends 일일 트렌드 fallback
        df = pytrend.trending_searches(pn='south_korea')
        trends = df[0].tolist()[:15]
        return {"trends": trends, "source": "google_trends_daily"}
    except Exception as e:
        print(f"Trend Error: {e}")
        return {
            "trends": [
                "비트코인 신고가", "2026 부동산 전망", "AI 자동화 트렌드", 
                "자기계발 루프", "재테크 시작하기", "나스닥 지수 현황",
                "건강한 식단 관리", "봄 여행지 추천", "인기 카페 투어",
                "넷플릭스 화제작", "애플 신기술", "전기차 시장 전망"
            ], 
            "source": "popular_topics_fallback"
        }

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "backend_url": "http://localhost:8899"}

@app.get("/api/history")
async def get_history(user: dict = Depends(get_current_user)):
    """로그인한 유저 본인의 히스토리만 반환"""
    history = load_user_history(user["email"])
    # html 필드는 크기가 크므로 목록 조회 시 제외 (필요 시 별도 API로 확장 가능)
    summary = [{"id": h.get("id"), "text": h.get("text"), "slide_count": h.get("slide_count"), "timestamp": h.get("timestamp"), "html": h.get("html")} for h in history]
    return {"history": summary}

@app.post("/api/upload")
async def upload_image(file: UploadFile = File(...)):
    try:
        file_extension = Path(file.filename).suffix
        file_name = f"bg_{datetime.now().strftime('%Y%m%d%H%M%S')}{file_extension}"
        file_path = os.path.join(UPLOADS_DIR, file_name)
        
        with open(file_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
            
        # Return the public URL
        # Assuming the backend runs on port 8899
        return {"url": f"http://localhost:8899/api/uploads/{file_name}"}
    except Exception as e:
        print(f"Upload Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# API Models

class GenerateHtmlRequest(BaseModel):
    text: str
    slide_count: Optional[int] = 5
    bg_image_url: Optional[str] = None
    gemini_api_key: Optional[str] = None
    claude_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None

@app.post("/api/generate_html")
async def generate_html_endpoint(request: GenerateHtmlRequest, request_raw: Request):
    try:
        # 저장된 키(복호화)를 우선 사용, 요청에 포함된 키는 fallback
        stored_keys = {"gemini_api_key": "", "claude_api_key": "", "openai_api_key": ""}
        auth_header = request_raw.headers.get("Authorization")
        if auth_header:
            try:
                user = await get_current_user(request_raw)
                stored_keys = get_decrypted_settings(user["email"])
            except:
                pass

        # 서버에 저장된 키 우선, 없으면 요청에 포함된 키(localStorage fallback) 사용
        gemini_key = stored_keys.get("gemini_api_key") or request.gemini_api_key
        claude_key = stored_keys.get("claude_api_key") or request.claude_api_key
        openai_key = stored_keys.get("openai_api_key") or request.openai_api_key

        print(f"1. Researching: {request.text[:50]}...")
        expanded_text = research_topic(request.text, api_key=gemini_key)

        print(f"2. Generating HTML with researched context...")
        html_content = generate_html(
            text=expanded_text,
            slides=request.slide_count,
            bg_image=request.bg_image_url,
            gemini_key=gemini_key,
            claude_key=claude_key,
            openai_key=openai_key,
        )
        
        # 유저별 히스토리 저장 (인증된 경우만)
        if auth_header:
            try:
                hist_user = await get_current_user(request_raw)
                save_user_history(hist_user["email"], {
                    "text": request.text,
                    "slide_count": request.slide_count,
                    "html": html_content
                })
            except Exception as he:
                print(f"History save skipped: {he}")
        
        return {"html": html_content}
    except Exception as e:
        error_msg = str(e)
        if hasattr(e, 'stderr') and e.stderr:
            print(f"Subprocess Error: {e.stderr}")
            # 만약 에러 내용 중에 특정 키워드가 있다면 사용자 친화적으로 변경
            if "RESOURCE_EXHAUSTED" in e.stderr:
                error_msg = "AI 서비스 할당량이 초과되었습니다. 1분 후 다시 시도해주세요."
            elif "timed out" in e.stderr:
                error_msg = "서버 응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요."
            else:
                # stderr의 마지막 몇 줄을 에러 메시지에 포함
                error_msg = e.stderr.strip().split("\n")[-1]
                
        print(f"Final Error: {error_msg}")
        raise HTTPException(status_code=500, detail=error_msg)

@app.post("/api/convert")
async def convert_html_to_png(html_content: str = Form(...)):
    try:
        # 1. Save HTML to temporary file
        html_path = os.path.join(TMP_DIR, "temp_slides.html")
        with open(html_path, "w", encoding="utf-8") as f:
            f.write(html_content)
            
        # 2. Run capture script
        # Note: We use absolute path to ensure the script is found
        capture_script = os.path.join(WORKSPACE, "execution", "export_slides_to_png.py")
        
        # Clear previous slides
        if os.path.exists(SLIDES_DIR):
            shutil.rmtree(SLIDES_DIR)
        os.makedirs(SLIDES_DIR, exist_ok=True)
        
        subprocess.run(
            [sys.executable, capture_script, "--input", html_path],
            check=True
        )
        
        # 3. Get generated files
        files = sorted(glob.glob(os.path.join(SLIDES_DIR, "*.png")))
        file_names = [os.path.basename(f) for f in files]
        
        return {"slides": file_names}
    except Exception as e:
        print(f"Conversion Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/slides/{filename}")
async def get_slide(filename: str):
    file_path = os.path.join(SLIDES_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8899)
