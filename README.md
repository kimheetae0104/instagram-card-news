# 📱 인스타그램 카드뉴스 AI 스튜디오

> 주제나 텍스트를 입력하면 AI가 자동으로 인스타그램 최적화 카드뉴스를 생성해주는 풀스택 웹 애플리케이션

🚀 **라이브 데모**: https://instagram-card-news-psi.vercel.app

---

## ✨ 주요 기능

- **AI 카드뉴스 생성** — 주제 입력 → AI가 슬라이드 HTML 자동 생성
- **Canva 스타일 편집기** — 드래그/리사이즈/회전 자유 편집
- **Google OAuth 로그인** — 소셜 로그인 + JWT 인증
- **PNG 내보내기** — 인스타그램 규격(1080×1350) 자동 변환
- **생성 히스토리** — 이전 작업물 저장 및 불러오기
- **모바일 반응형** — 모바일/데스크톱 최적화

---

## 🛠️ 기술 스택

| 구분 | 기술 |
|------|------|
| **프론트엔드** | React 18 + Vite + TailwindCSS |
| **백엔드** | FastAPI (Python 3.12) |
| **인증** | Google OAuth 2.0 + JWT |
| **AI 엔진** | Gemini / Claude / OpenAI / DeepSeek |
| **PNG 렌더링** | Playwright (Chromium) |
| **배포 - 프론트** | Vercel |
| **배포 - 백엔드** | Railway |

---

## 📁 프로젝트 구조

```
instagram-card-news/
├── frontend/
│   └── src/
│       ├── App.jsx          # 메인 앱 (캔버스 편집기 포함)
│       └── Login.jsx        # Google OAuth 로그인 페이지
├── backend/
│   ├── main.py              # FastAPI 백엔드 서버
│   └── .env                 # 환경변수 (로컬용)
├── execution/
│   ├── __init__.py
│   ├── generate_html_from_text.py   # 텍스트 → HTML 생성
│   ├── research_topic.py            # AI 리서치
│   └── export_slides_to_png.py      # HTML → PNG 변환
├── directives/              # AI 에이전트 지시서
├── requirements.txt         # Python 의존성
├── Procfile                 # Railway 배포 설정
├── railway.json             # Railway 플랫폼 설정
└── .env.example             # 환경변수 템플릿
```

---

## 🚀 로컬 실행

### 1. 저장소 클론
```bash
git clone https://github.com/kimheetae0104/instagram-card-news.git
cd instagram-card-news
```

### 2. 백엔드 설정
```bash
pip install -r requirements.txt
playwright install chromium

# backend/.env 파일 생성
cp .env.example backend/.env
# backend/.env 편집 후 값 입력
```

### 3. 프론트엔드 설정
```bash
cd frontend
npm install
```

### 4. 서버 실행
```bash
# 터미널 1 - 백엔드
cd backend && python main.py

# 터미널 2 - 프론트엔드
cd frontend && npm run dev
```

접속: http://localhost:5191

---

## ⚙️ 환경변수

### backend/.env (로컬)
```env
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
SECRET_KEY=your-jwt-secret-key
FRONTEND_URL=http://localhost:5191
```

### Railway 환경변수 (프로덕션)
```env
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
SECRET_KEY=...
BACKEND_URL=https://your-railway-url.railway.app
FRONTEND_URL=https://your-vercel-url.vercel.app
```

### Vercel 환경변수 (프론트엔드)
```env
VITE_BACKEND_URL=https://your-railway-url.railway.app
```

---

## 🌐 배포 구성

```
사용자
  ↓
Vercel (프론트엔드)
  https://instagram-card-news-psi.vercel.app
  ↓
Railway (백엔드)
  https://web-production-2b43.up.railway.app
  ↓
Google OAuth 2.0
```

### Google Cloud Console 설정
승인된 리다이렉트 URI:
```
http://localhost:8899/auth           ← 로컬 개발용
https://[railway-url]/auth           ← 프로덕션용
```

---

## 🔧 주요 문제 해결 이력

| 문제 | 원인 | 해결 |
|------|------|------|
| `ModuleNotFoundError: execution` | `__init__.py` 없음 | `execution/__init__.py` 생성 |
| `deleted_client` OAuth 오류 | OAuth 클라이언트 삭제됨 | Google Cloud Console에서 새 클라이언트 생성 |
| 백엔드가 루트 `.env` 로드 | `load_dotenv()` 경로 미지정 | `dotenv_path` + `override=True` 명시 |
| `mismatching_state` CSRF 오류 | HTTPS 환경서 세션 쿠키 설정 오류 | `https_only=True`, `same_site='none'` |
| 외부 접속 시 localhost로 이동 | `BACKEND_URL` 미설정 | `BACKEND_URL` 환경변수 추가 |
| Vercel이 localhost 호출 | `BACKEND_URL` 하드코딩 | `import.meta.env.VITE_BACKEND_URL` 사용 |
| `itsdangerous` 없음 | requirements.txt 누락 | `itsdangerous==2.1.2` 추가 |

---

## 📝 라이선스

MIT License

---

*Built with ❤️ using Claude AI*
