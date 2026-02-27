# 배포 가이드

이 문서는 Instagram Card News 앱을 Railway(백엔드)와 Vercel(프론트엔드)에 배포하는 방법을 설명합니다.

## 1️⃣ Railway (백엔드) 배포

### Step 1: Railway.app 가입 및 프로젝트 생성
1. https://railway.app 접속
2. "Start a New Project" 클릭
3. "Deploy from GitHub repo" 선택
4. GitHub 계정 연동
5. `instagram-card-news` 레포지토리 선택

### Step 2: 환경 변수 설정
Railway 대시보드에서 다음 환경변수를 추가합니다:

```
GOOGLE_CLIENT_ID=your-google-client-id-from-cloud-console
GOOGLE_CLIENT_SECRET=your-google-client-secret-from-cloud-console
SECRET_KEY=generate-a-random-secure-key
FRONTEND_URL=https://your-vercel-domain.vercel.app (나중에 업데이트)
```

**Google OAuth 자격증명 얻기:**
1. Google Cloud Console (https://console.cloud.google.com) 접속
2. OAuth 2.0 클라이언트 ID 생성
3. 클라이언트 ID와 비밀번호를 복사하여 위의 값으로 대체

### Step 3: 배포 확인
- Railway 대시보드에서 배포 상태 확인
- 배포 완료 후 공개 URL 복사 (예: `https://instagram-card-news-prod.up.railway.app`)

---

## 2️⃣ Vercel (프론트엔드) 배포

### Step 1: Vercel.com 가입 및 프로젝트 생성
1. https://vercel.com 접속
2. "New Project" 클릭
3. GitHub 계정 연동
4. `instagram-card-news` 레포지토리 선택
5. Root Directory: `frontend`로 설정

### Step 2: 환경 변수 설정
Vercel 대시보드 → Settings → Environment Variables에 추가:

```
VITE_BACKEND_URL=https://instagram-card-news-prod.up.railway.app
```

### Step 3: 배포 확인
- Vercel에서 자동으로 배포됨
- 배포 완료 후 공개 URL 복사 (예: `https://instagram-card-news.vercel.app`)

---

## 3️⃣ Railway에서 FRONTEND_URL 업데이트

Vercel 배포 후:
1. Railway 대시보드 접속
2. 프로젝트 → 환경 변수
3. `FRONTEND_URL` = `https://instagram-card-news.vercel.app` 로 업데이트

---

## 🔄 자동 배포 설정

GitHub에 코드를 푸시하면 자동으로 배포됩니다.

### 필수 GitHub Secrets 설정:

**GitHub 설정:** Settings → Secrets and variables → Actions

1. **RAILWAY_TOKEN**
   - Railway 계정 → Account Settings → Tokens
   - 새 토큰 생성 후 복사

2. **VERCEL_TOKEN**
   - Vercel 계정 → Settings → Tokens
   - 새 토큰 생성 후 복사

```bash
# GitHub Secrets 추가 (CLI)
gh secret set RAILWAY_TOKEN --body "your-railway-token"
gh secret set VERCEL_TOKEN --body "your-vercel-token"
```

---

## ✅ 배포 완료 체크리스트

- [ ] Railway 프로젝트 생성
- [ ] Railway 환경 변수 설정
- [ ] Railway 배포 완료 및 URL 확인
- [ ] Vercel 프로젝트 생성
- [ ] Vercel 환경 변수 설정
- [ ] Vercel 배포 완료 및 URL 확인
- [ ] Railway FRONTEND_URL 업데이트
- [ ] GitHub Secrets 설정 (RAILWAY_TOKEN, VERCEL_TOKEN)
- [ ] 로그인 테스트
- [ ] 카드 생성 및 PNG 내보내기 테스트

---

## 🔧 문제 해결

### Google OAuth 리다이렉트 URI 오류
Google Cloud Console → OAuth 2.0 클라이언트 ID → 승인된 리다이렉트 URI:
```
https://instagram-card-news-prod.up.railway.app/auth
https://instagram-card-news.vercel.app
```

### 백엔드 CORS 오류
백엔드 main.py의 CORS 설정 확인:
```python
allow_origins=[
    "http://localhost:5189",
    "https://instagram-card-news.vercel.app"
]
```

### 환경 변수 오류
Railway/Vercel에서 환경 변수가 제대로 설정되었는지 확인:
```
Railway: Deployments → View Logs → Check environment variables
Vercel: Deployments → Details → Environment
```

---

## 📊 배포 후 모니터링

- **Railway:** Logs → View Logs에서 백엔드 로그 확인
- **Vercel:** Deployments → Analytics에서 성능 모니터링

---

## 🚀 로컬 개발 계속하기

배포 후에도 로컬에서 개발 계속 가능:

```bash
# 로컬 백엔드
cd backend
python main.py

# 로컬 프론트엔드 (다른 터미널)
cd frontend
npm run dev
```

로컬과 배포 환경이 분리되어 있으므로 자유롭게 개발할 수 있습니다.
