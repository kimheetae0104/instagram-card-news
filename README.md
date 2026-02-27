# 인스타그램 카드뉴스 자동화 시스템

## 프로젝트 개요

블로그 글이나 주제 텍스트를 입력하면, AI가 자동으로 **인스타그램용 카드뉴스(1080×1350 PNG)**를 생성해 주는 풀스택 자동화 시스템입니다.

사람이 할 일은 **주제 입력** 하나뿐입니다.

---

## 핵심 플로우 (4단계)

```
[입력] 주제 or 블로그 글
   ↓
[1단계] 리서치 → 카피
   ↓
[2단계] 후킹 팀 토론 (점수 미달 시 재작성)
   ↓
[3단계] 구조 토론 (검토 → 보완 → 승인)
   ↓
[4단계] 1080×1350 PNG 자동 생성
   ↓
[출력] 인스타그램용 PNG 카드뉴스
```

### 1단계: 리서치 → 카피
- 사용자가 주제를 입력하면 AI가 웹 리서치를 수행합니다
- 리서치 결과를 바탕으로 카드뉴스 카피(글)를 자동 작성합니다
- 사람이 할 일: **주제 입력뿐**

### 2단계: 후킹 팀 토론
- 후킹 전문가 에이전트와 카피 에디터가 협력하여 카피를 평가합니다
- 7점 이상이면 통과, 미달이면 자동으로 다시 작성합니다
- 점수 기준: 첫 3초 안에 스크롤을 멈추게 만드는 후킹력

### 3단계: 구조 토론
- AI 에이전트들이 10장의 카드뉴스 흐름이 적절한지 검토합니다
- 끝까지 읽게 만드는지 (구조적 완성도)를 점검합니다
- 검토 → 보완 → 승인 순서로 진행

### 4단계: PNG 자동 생성
- 승인된 카피를 HTML 템플릿에 주입합니다
- Puppeteer(Playwright)로 1080×1350px 규격에 맞게 렌더링합니다
- 각 슬라이드별 PNG 파일로 자동 출력합니다

---

## 템플릿 커스터마이징

한 번 만들어두면 주제만 바꿔서 무한으로 만들 수 있습니다:
1. 원하는 디자인을 캡처하세요
2. AI에게 전달하세요
3. HTML 템플릿이 만들어져요

---

## 시스템 아키텍처 (3Layer)

Agent.md에 정의된 3계층 구조를 따릅니다:

| 계층 | 역할 | 위치 |
|------|------|------|
| **Layer 1: Directive** | 무엇을 할지 정의 (SOP) | `directives/*.md` |
| **Layer 2: Orchestration** | AI가 의사결정 및 라우팅 | AI Agent (Claude/Gemini) |
| **Layer 3: Execution** | 결정론적 Python 스크립트 실행 | `execution/*.py` |

---

## 디렉토리 구조

```
Instargram_card_news/
├── Agent.md                    # AI 에이전트 운영 원칙
├── .env                        # API 키 및 환경변수
├── .tmp/                       # 임시 파일 (중간 산출물)
│   └── slides/                 # 생성된 PNG 슬라이드
├── backend/
│   └── main.py                 # FastAPI 백엔드 서버 (포트 8899)
├── frontend/
│   └── src/
│       ├── App.jsx             # 메인 React 앱
│       └── Login.jsx           # Google OAuth 로그인 페이지
├── execution/                  # 결정론적 실행 스크립트
│   ├── generate_html_from_text.py        # 텍스트 → HTML 카드뉴스 생성
│   ├── refine_html.py                    # HTML 수정/개선
│   ├── generate_instagram_caption_and_tags.py  # 캡션 & 해시태그 생성
│   └── export_slides_to_png.py           # HTML → PNG 변환
└── directives/                 # SOPs (지시서)
    ├── generate_card_news.md
    ├── refine_card_news.md
    └── export_to_png.md
```

---

## 기술 스택

| 구분 | 기술 |
|------|------|
| **프론트엔드** | React + Vite + TailwindCSS |
| **백엔드** | FastAPI (Python) |
| **AI 엔진 (로컬)** | Ollama - gemma3:12b |
| **AI 엔진 (클라우드)** | Google Gemini 2.0 Flash Lite |
| **인증** | Google OAuth 2.0 + JWT |
| **PNG 렌더링** | Playwright (Chromium) |
| **폰트** | Google Fonts - Noto Sans KR |

---

## 환경변수 (.env)

```env
GOOGLE_CLIENT_ID=...          # Google OAuth Client ID
GOOGLE_CLIENT_SECRET=...      # Google OAuth Client Secret
SECRET_KEY=...                # JWT 서명 키
GEMINI_API_KEY=...            # Gemini API 키 (Ollama 폴백용)
FRONTEND_URL=http://localhost:5189
OLLAMA_URL=http://localhost:11434  # 기본값
OLLAMA_MODEL=gemma3:12b           # 기본값
```

---

## 서버 실행

```bash
# 백엔드 (포트 8899)
python3 backend/main.py

# 프론트엔드 (포트 5189)
cd frontend && npm run dev
```

접속: http://localhost:5189
