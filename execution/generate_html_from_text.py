import os
import sys
import argparse
import json
import re
import httpx
from dotenv import load_dotenv

load_dotenv()

OLLAMA_BASE_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "qwen2.5-coder:14b")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

# 예시 및 학습된 디자인 로드
EXAMPLE_PATH = os.path.join(os.path.dirname(__file__), "examples", "sample_5slides.html")
LEARNED_PATH = os.path.join(os.path.dirname(__file__), "learned_design.json")
DIRECTIVES_DIR = os.path.join(os.path.dirname(__file__), "..", "directives")
EXAMPLE_HTML = ""
LEARNED_DESIGN = {}
VIRAL_FORMULA = ""
DESIGN_SPECS = ""

if os.path.exists(EXAMPLE_PATH):
    with open(EXAMPLE_PATH, "r", encoding="utf-8") as f:
        EXAMPLE_HTML = f.read()
    print("[INFO] ✅ 예시 HTML 로드 완료", file=sys.stderr)

if os.path.exists(LEARNED_PATH):
    with open(LEARNED_PATH, "r", encoding="utf-8") as f:
        LEARNED_DESIGN = json.load(f)
    print("[INFO] ✅ 학습된 디자인 노하우 로드 완료", file=sys.stderr)

# 디렉티브 파일 로드 (바이럴 공식 + 디자인 스펙)
viral_path = os.path.join(DIRECTIVES_DIR, "viral_card_news_formula.md")
design_path = os.path.join(DIRECTIVES_DIR, "design_specs.md")

if os.path.exists(viral_path):
    with open(viral_path, "r", encoding="utf-8") as f:
        VIRAL_FORMULA = f.read()
    print("[INFO] ✅ 바이럴 카드뉴스 공식 로드 완료", file=sys.stderr)

if os.path.exists(design_path):
    with open(design_path, "r", encoding="utf-8") as f:
        DESIGN_SPECS = f.read()
    print("[INFO] ✅ 디자인 스펙 로드 완료", file=sys.stderr)


def build_prompt(text, slides=5, bg_image=None):
    bg_instruction = ""
    if bg_image:
        bg_instruction = f"""
EXTRA DESIGN RULE (Priority 1):
- Use the provided background image URL: `{bg_image}`
- Apply this image as the background for the COVER SLIDE (slide 1).
- Use `background-image: url('{bg_image}'); background-size: cover; background-position: center;`
- CRITICAL: Use a sophisticated gradient overlay: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.7) 70%, #000 100%)` to ensure text blends perfectly.
"""

    # 바이럴 공식 요약 (핵심만)
    viral_rules = """
=== 바이럴 카드뉴스 7가지 공식 (MUST APPLY) ===
1. 커버 슬라이드: 3초 안에 시선 고정 → 숫자("N가지"), 질문형("왜 ~할까?"), 강한 키워드 사용. 호기심/두려움/욕망 중 하나 자극 필수.
2. 한 장 = 하나의 메시지: 슬라이드당 하나의 핵심 포인트만. 텍스트 3줄 이내.
3. 저장하고 싶은 실용 정보: 가이드, 체크리스트, HOW TO 형식. "완벽정리", "가이드" 키워드.
4. 공감 구조: 문제 상황 → 해결책 구조. "내 얘기 같다" 감정 유발.
5. 공유 요소: 친구에게 보내고 싶은 콘텐츠. 욕망 카테고리(건강/부/사랑/재미) 활용.
6. 직관적 디자인: 핵심 키워드 중심, 깔끔한 레이아웃. 화려함보다 한눈에 이해 가능하게.
7. CTA 필수: 마지막 슬라이드에 "저장해두세요", "팔로우하면 더 볼 수 있어요" 등 행동 유도 문구 포함.
""" if VIRAL_FORMULA else ""

    # 디자인 스펙 요약
    design_rules = """
=== 디자인 스펙 (MUST FOLLOW) ===
- 커버 타이틀: 60px 이상, 두껍게 (Bold/ExtraBold). 좌측 정렬 권장.
- 본문 타이틀: 45px, 두껍게.
- 본문 내용: 28px, 얇게. 3줄 이내.
- 출처/브랜드: 15-25px, 얇게.
- 텍스트 가독성: 이미지 위에 투명 그라데이션 오버레이 배치.
- 텍스트 색상: 흰색 우선.
""" if DESIGN_SPECS else ""

    return f"""You are a World-Class Creative Director and Frontend Developer specialized in high-end Instagram Card News.
Your mission is to generate HTML/CSS that looks like it was designed by a top-tier global agency (e.g., Pentagram, IDEO) and rendered with the highest quality.

=== THE REFERENCE (Study for Technique, NOT for direct copying) ===
The following code represents the "minimum viable premium quality".
Analyze its use of layers, gradients, high-end typography (Noto Sans KR), and brand-aligned footers.
```html
{EXAMPLE_HTML}
```

=== LEARNED DESIGN KNOW-HOW (MUST FOLLOW) ===
The system has analyzed premium references. You MUST implement these specific patterns:
- DECORATION: {", ".join(LEARNED_DESIGN.get("decorative", []))}
- HIGHLIGHTS: {", ".join(LEARNED_DESIGN.get("highlights", []))}
- BEST PRACTICES: {", ".join(LEARNED_DESIGN.get("best_practices", []))}
- LAYOUT: {LEARNED_DESIGN.get("layout", {}).get("요소_배치", "중앙 정렬")}
- TYPOGRAPHY: Titles around {LEARNED_DESIGN.get("typography", {}).get("제목_크기", "100px")}, Body around {LEARNED_DESIGN.get("typography", {}).get("본문_크기", "40px")}

{viral_rules}
{design_rules}

=== mission ===
Generate a ultra-premium card news with perfect BALANCE & NO OVERFLOW.
CRITICAL: Every element must stay within the 1080px width.
CRITICAL: Apply the 7 viral formulas above. The cover slide MUST have a hook (number/question/strong keyword).
CRITICAL: Last slide MUST have a CTA (저장/팔로우/DM 유도 문구).
CRITICAL: Each slide = ONE message. Max 3 lines of body text per slide.

=== content source ===
RESEARCH DATA: "{text}"

=== design rules (harmony & safety) ===
1. OVERFLOW PROTECTION (CRITICAL):
   - Use `* {{ box-sizing: border-box; word-break: keep-all; overflow-wrap: break-word; }}` in CSS.
   - For TITLES: If the title is long, use `font-size: 90px` instead of 120px to prevent bleeding out.
   - PADDING: Strict `padding: 80px 100px;`. Content must NEVER touch edges.

2. EDITORIAL BALANCE:
   - Use `display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center;` to keep the "Visual Gravity" at the absolute center.
   - VERTICAL SPACING: Distribute content evenly to fill the 1350px height. Use `gap: 40px` or `margin: auto 0`.

3. TYPOGRAPHY (from design specs):
   - COVER TITLES: 60px-110px (Extra Bold). Body: 28px-48px.
   - Maintain a clear contrast between elements.
   - Text color: white preferred for dark backgrounds.

4. VISUAL DENSITY:
   - Use balanced decorative blobs (e.g., top-right and bottom-left) to stabilize the frame.
   - Add gradient overlay on images for text readability.

=== output standards ===
- Return ONLY JSON: {{"html": "..."}}
- Inline CSS, Noto Sans KR. Exactly {slides} slides.
- CRITICAL: DO NOT USE markdown bold syntax like `**text**`.
- CRITICAL: Instead, use direct HTML tags like `<b>text</b>` or `<span style="font-weight: bold;">text</span>` for emphasis.
- Ensure NO raw markdown symbols (**, #, etc.) appear in the final HTML string.

{bg_instruction}

CRITICAL: The user is seeing raw `**` symbols in the output. Replace them with proper HTML `<b>` tags. Fix the text being cut off by ensuring centered alignment and correct box model. Fill the space with HARMONY, not just size.
"""


def generate_with_ollama(text, slides=5, bg_image=None):
    prompt = build_prompt(text, slides, bg_image)
    try:
        print(f"[INFO] Generating with {OLLAMA_MODEL}...", file=sys.stderr)
        response = httpx.post(
            f"{OLLAMA_BASE_URL}/api/generate",
            json={
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False,
                "format": "json",
                "options": {
                    "temperature": 0.3,
                    "num_predict": 16000,
                }
            },
            timeout=300.0
        )
        response.raise_for_status()
        raw = response.json().get("response", "").strip()
        return extract_html(raw)
    except Exception as e:
        print(f"[ERROR] Ollama: {e}", file=sys.stderr)
        return None


def generate_with_gemini(text, slides=5, bg_image=None, api_key=None):
    key = api_key or GEMINI_API_KEY
    if not key:
        return None
    try:
        from google import genai
        from google.genai import types
        print(f"[INFO] Gemini (1.5-flash) generating...", file=sys.stderr)
        client = genai.Client(api_key=key)
        
        # 최신 모델 우선순위 반영 (사용자 제공 리스트 기반)
        # 존재하지 않는 모델 ID는 즉시 실패하므로 로그로 확인 가능하게 함
        # 실제로 가용한 모델 ID 리스트 (404 예방)
        models_to_try = [
            "gemini-flash-latest",
            "gemini-flash-lite-latest",
            "gemini-2.5-flash-lite",
            "gemini-3-flash-preview",
            "gemini-pro-latest",
            "gemini-3.1-pro-preview"
        ]
        
        last_error = None
        for model_id in models_to_try:
            try:
                print(f"[INFO] Attempting generation with {model_id}...", file=sys.stderr)
                response = client.models.generate_content(
                    model=model_id,
                    contents=build_prompt(text, slides, bg_image),
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        temperature=0.3,
                    )
                )
                html = extract_html(response.text.strip())
                if html:
                    print(f"[INFO] ✅ 생성 완료 ({model_id})", file=sys.stderr)
                    return html
                else:
                    print(f"[WARN] {model_id} produced empty or invalid HTML", file=sys.stderr)
            except Exception as e:
                print(f"[WARN] {model_id} failed: {e}", file=sys.stderr)
                last_error = e
                continue
        
        return None
    except Exception as e:
        print(f"[ERROR] Gemini general error: {e}", file=sys.stderr)
        return None


def generate_with_claude(text, slides=5, bg_image=None, api_key=None):
    if not api_key:
        return None
    try:
        print(f"[INFO] Claude (Sonnet 3.5) generating...", file=sys.stderr)
        prompt = build_prompt(text, slides, bg_image)
        headers = {
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
        }
        data = {
            "model": "claude-3-5-sonnet-20240620",
            "max_tokens": 8000,
            "messages": [{"role": "user", "content": prompt}]
        }
        response = httpx.post("https://api.anthropic.com/v1/messages", headers=headers, json=data, timeout=120.0)
        response.raise_for_status()
        content = response.json()["content"][0]["text"]
        return extract_html(content)
    except Exception as e:
        print(f"[ERROR] Claude error: {e}", file=sys.stderr)
        return None

def generate_with_openai(text, slides=5, bg_image=None, api_key=None):
    if not api_key:
        return None
    try:
        print(f"[INFO] OpenAI (GPT-4o) generating...", file=sys.stderr)
        prompt = build_prompt(text, slides, bg_image)
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        data = {
            "model": "gpt-4o",
            "messages": [{"role": "user", "content": prompt}],
            "response_format": { "type": "json_object" }
        }
        response = httpx.post("https://api.openai.com/v1/chat/completions", headers=headers, json=data, timeout=120.0)
        response.raise_for_status()
        content = response.json()["choices"][0]["message"]["content"]
        return extract_html(content)
    except Exception as e:
        print(f"[ERROR] OpenAI error: {e}", file=sys.stderr)
        return None

def generate_with_deepseek(text, slides=5, bg_image=None, api_key=None):
    if not api_key:
        return None
    try:
        print(f"[INFO] DeepSeek (chat) generating...", file=sys.stderr)
        prompt = build_prompt(text, slides, bg_image)
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        data = {
            "model": "deepseek-chat",
            "messages": [{"role": "user", "content": prompt}],
            "stream": False
        }
        # DeepSeek API endpoint may vary, common one used here
        response = httpx.post("https://api.deepseek.com/chat/completions", headers=headers, json=data, timeout=120.0)
        response.raise_for_status()
        content = response.json()["choices"][0]["message"]["content"]
        return extract_html(content)
    except Exception as e:
        print(f"[ERROR] DeepSeek error: {e}", file=sys.stderr)
        return None

def extract_html(raw):
    try:
        if "```json" in raw:
            m = re.search(r'```json\s*(.*?)\s*```', raw, re.DOTALL)
            if m:
                raw = m.group(1)
        if not (raw.startswith("{") and raw.endswith("}")):
            s, e = raw.find("{"), raw.rfind("}")
            if s != -1 and e != -1:
                raw = raw[s:e+1]
        return json.loads(raw).get("html", "")
    except Exception as e:
        print(f"[ERROR] JSON parse: {e}", file=sys.stderr)
        return None


def generate_html(text, slides=5, bg_image=None, gemini_key=None, claude_key=None, openai_key=None, deepseek_key=None):
    # 우선순위: 제미나이 -> 클로드 -> 오픈AI -> 딥시크
    
    # 1. GEMINI
    g_key = gemini_key or GEMINI_API_KEY
    if g_key:
        html = generate_with_gemini(text, slides, bg_image, api_key=g_key)
        if html:
            print("[INFO] ✅ 생성 완료 (Gemini)", file=sys.stderr)
            return html

    # 2. CLAUDE
    if claude_key:
        html = generate_with_claude(text, slides, bg_image, api_key=claude_key)
        if html:
            print("[INFO] ✅ 생성 완료 (Claude)", file=sys.stderr)
            return html

    # 3. OPENAI
    if openai_key:
        html = generate_with_openai(text, slides, bg_image, api_key=openai_key)
        if html:
            print("[INFO] ✅ 생성 완료 (OpenAI)", file=sys.stderr)
            return html

    # 4. DEEPSEEK
    if deepseek_key:
        html = generate_with_deepseek(text, slides, bg_image, api_key=deepseek_key)
        if html:
            print("[INFO] ✅ 생성 완료 (DeepSeek)", file=sys.stderr)
            return html

    # 모든 시도가 실패한 경우
    error_msg = "모든 AI 서비스 호출에 실패했습니다. API 키가 유효한지 확인해주세요."
    if not any([g_key, claude_key, openai_key, deepseek_key]):
        error_msg = "설정된 AI API 키가 없습니다. 설정 탭에서 API 키를 입력해주세요."
        
    print(f"[ERROR] {error_msg}", file=sys.stderr)
    raise Exception(error_msg)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--text", required=True)
    parser.add_argument("--slides", type=int, default=5)
    parser.add_argument("--bg_image", default=None)
    args = parser.parse_args()
    print(generate_html(args.text, args.slides, args.bg_image))
