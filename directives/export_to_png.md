# Directive: PNG 자동 출력

## 목표
완성된 카드뉴스 HTML을 1080×1350px PNG 파일로 자동 변환한다.

## 입력
- `html_path`: 변환할 HTML 파일 경로 (`.tmp/temp_slides.html`)

## 실행 도구
- `execution/export_slides_to_png.py --input {html_path}`

## 출력
- `.tmp/slides/slide_01.png`, `slide_02.png`, ... (슬라이드별 PNG)

## 렌더링 스펙
- 해상도: 1080 × 1350 px (인스타그램 세로 규격)
- 엔진: Playwright (Chromium)
- 대상 선택자: `.slide` class 또는 `#slide1`, `#slide2` ...
- 파일명: `slide_01.png` ~ `slide_NN.png` (2자리 패딩)

## 전제 조건
- Playwright 설치 필요: `pip install playwright && playwright install chromium`
- HTML 내 모든 리소스는 인터넷 접속 또는 인라인으로 포함되어야 함

## 엣지 케이스
- **`.slide` 클래스 미발견**: `#slide1` ~ `#slide10` ID로 폴백 시도
- **폴백도 실패**: 전체 페이지 스크린샷으로 대체 저장
- **Playwright 미설치**: 에러 메시지 출력 후 설치 명령 안내
