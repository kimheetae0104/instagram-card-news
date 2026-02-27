import os
import sys
import shutil
import glob
import subprocess
import json
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

# 부모 디렉토리를 Python 경로에 추가
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from execution.research_topic import research_topic
from execution.generate_html_from_text import generate_html


# 환경변수로 pytrends 사용 여부 제어 (기본은 RSS 사용)
USE_PYTREND = os.getenv("USE_PYTREND", "false").lower() == "true"
from typing import Optional

load_dotenv()

app = FastAPI(title="Card News to Instagram Engine")

# JWT & OAuth Settings
SECRET_KEY = os.environ.get("SECRET_KEY", "A_VERY_SECRET_KEY_FOR_JWT")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 # 1 Day

GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET")

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

app.add_middleware(
    SessionMiddleware, 
    secret_key=SECRET_KEY
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Auth Routes
@app.get('/login')
async def login(request: Request):
    # Use the absolute URL for 'auth' route
    redirect_uri = str(request.url_for('auth'))
    
    # Handle environment-specific redirect URI fixes
    if "localhost" in redirect_uri or "127.0.0.1" in redirect_uri:
        # Ensure we use localhost specifically if that's what's registered
        redirect_uri = redirect_uri.replace("127.0.0.1", "localhost")
    elif request.headers.get("x-forwarded-proto") == "https":
        redirect_uri = redirect_uri.replace("http://", "https://")
        
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

# Workspace Logic
WORKSPACE = "/Users/gimhuitae/Work/Instargram_card_news"
TMP_DIR = os.path.join(WORKSPACE, ".tmp")
os.makedirs(TMP_DIR, exist_ok=True)
SLIDES_DIR = os.path.join(TMP_DIR, "slides")
os.makedirs(SLIDES_DIR, exist_ok=True)
UPLOADS_DIR = os.path.join(WORKSPACE, "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)

# Serve static files
app.mount("/api/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

pytrend = TrendReq(hl='ko-KR', tz=540)
HISTORY_FILE = os.path.join(TMP_DIR, "history.json")

def load_history():
    try:
        if os.path.exists(HISTORY_FILE):
            with open(HISTORY_FILE, "r", encoding="utf-8") as f:
                content = f.read().strip()
                if not content:
                    return []
                return json.loads(content)
    except Exception as e:
        print(f"History load error: {e}")
    return []

def save_history(entry):
    history = load_history()
    # Add new entry at the beginning
    entry["id"] = datetime.now().strftime("%Y%m%d%H%M%S")
    entry["timestamp"] = datetime.now().isoformat()
    history.insert(0, entry)
    # Keep last 20 entries
    history = history[:20]
    with open(HISTORY_FILE, "w", encoding="utf-8") as f:
        json.dump(history, f, ensure_ascii=False, indent=2)

SETTINGS_FILE = os.path.join(TMP_DIR, "user_settings.json")

def load_settings():
    try:
        if os.path.exists(SETTINGS_FILE):
            with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception as e:
        print(f"Settings load error: {e}")
    return {}

def save_user_settings(email, settings):
    all_settings = load_settings()
    all_settings[email] = settings
    with open(SETTINGS_FILE, "w", encoding="utf-8") as f:
        json.dump(all_settings, f, ensure_ascii=False, indent=2)

class UserSettings(BaseModel):
    gemini_api_key: Optional[str] = None
    claude_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None
    deepseek_api_key: Optional[str] = None

@app.get("/api/user/settings")
async def get_user_settings_endpoint(user: dict = Depends(get_current_user)):
    all_settings = load_settings()
    user_settings = all_settings.get(user["email"], {})
    # Return masked keys for security, or just indicators
    return {
        "gemini_api_key": user_settings.get("gemini_api_key", ""),
        "claude_api_key": user_settings.get("claude_api_key", ""),
        "openai_api_key": user_settings.get("openai_api_key", ""),
        "deepseek_api_key": user_settings.get("deepseek_api_key", "")
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
async def get_history():
    return {"history": load_history()}

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
    deepseek_api_key: Optional[str] = None

@app.post("/api/generate_html")
async def generate_html_endpoint(request: GenerateHtmlRequest, request_raw: Request):
    try:
        # Get stored keys if not provided in request
        stored_keys = {}
        auth_header = request_raw.headers.get("Authorization")
        if auth_header:
            try:
                user = await get_current_user(request_raw)
                stored_keys = load_settings().get(user["email"], {})
            except:
                pass

        gemini_key = request.gemini_api_key or stored_keys.get("gemini_api_key")
        claude_key = request.claude_api_key or stored_keys.get("claude_api_key")
        openai_key = request.openai_api_key or stored_keys.get("openai_api_key")
        deepseek_key = request.deepseek_api_key or stored_keys.get("deepseek_api_key")

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
            deepseek_key=deepseek_key
        )
        
        # Save to history
        save_history({
            "text": request.text,
            "slide_count": request.slide_count,
            "html": html_content
        })
        
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
