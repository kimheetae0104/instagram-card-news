import os
import sys
import argparse
import json
import re
import httpx
from dotenv import load_dotenv

load_dotenv()

OLLAMA_BASE_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "gemma3:12b")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")


def generate_caption_with_ollama(html_text):
    prompt = f"""You are an Instagram marketing expert. Analyze this Instagram Card News HTML and generate Korean captions and hashtags.

HTML CONTENT:
{html_text[:3000]}

Generate:
1. A compelling Korean Instagram caption (2-3 paragraphs, engaging tone)
2. 20-30 relevant Korean hashtags

Output ONLY valid JSON:
{{
  "caption": "인스타그램 캡션 내용...",
  "hashtags": "#해시태그1 #해시태그2 ..."
}}"""

    try:
        response = httpx.post(
            f"{OLLAMA_BASE_URL}/api/generate",
            json={
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False,
                "format": "json",
                "options": {"temperature": 0.7, "num_predict": 2000}
            },
            timeout=120.0
        )
        response.raise_for_status()
        result = response.json()
        raw = result.get("response", "").strip()

        if "```json" in raw:
            match = re.search(r'```json\s*(.*?)\s*```', raw, re.DOTALL)
            if match:
                raw = match.group(1)
        elif not (raw.startswith("{") and raw.endswith("}")):
            start, end = raw.find("{"), raw.rfind("}")
            if start != -1 and end != -1:
                raw = raw[start:end+1]

        return json.loads(raw)
    except Exception as e:
        print(f"Ollama error: {e}", file=sys.stderr)
        return None


def generate_caption_with_gemini(html_text):
    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=GEMINI_API_KEY)
        prompt = f"""Analyze this Instagram Card News HTML and generate Korean caption and hashtags.
HTML: {html_text[:3000]}
Output ONLY JSON: {{"caption": "...", "hashtags": "#..."}}"""

        response = client.models.generate_content(
            model="gemini-2.0-flash-lite",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.7,
            )
        )
        return json.loads(response.text.strip())
    except Exception as e:
        print(f"Gemini error: {e}", file=sys.stderr)
        return None


def generate_caption(html_text):
    print("[INFO] Generating caption with Ollama...", file=sys.stderr)
    result = generate_caption_with_ollama(html_text)
    if result:
        print("[INFO] Caption generation succeeded!", file=sys.stderr)
        return result

    if GEMINI_API_KEY:
        print("[INFO] Trying Gemini fallback...", file=sys.stderr)
        result = generate_caption_with_gemini(html_text)
        if result:
            return result

    print("Error: Caption generation failed.", file=sys.stderr)
    sys.exit(1)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--html", required=True, help="Path to HTML file or raw HTML text")
    args = parser.parse_args()

    if os.path.exists(args.html):
        with open(args.html, "r", encoding="utf-8") as f:
            html_text = f.read()
    else:
        html_text = args.html

    result = generate_caption(html_text)
    print(json.dumps(result, ensure_ascii=False, indent=2))
