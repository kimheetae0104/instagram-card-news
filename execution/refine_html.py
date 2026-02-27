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


def refine_with_ollama(html, request):
    prompt = f"""You are an expert HTML editor. Modify the following Instagram Card News HTML based on the user's request.

USER REQUEST: {request}

CURRENT HTML:
{html}

=== RULES ===
1. Output ONLY valid JSON: {{"html": "..."}}
2. Apply the user's requested changes precisely
3. Keep the overall structure and number of slides the same
4. NEVER use <img> tags. CSS only.
5. Maintain all existing styles unless directly related to the change

Now output the modified HTML as JSON:"""

    try:
        response = httpx.post(
            f"{OLLAMA_BASE_URL}/api/generate",
            json={
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False,
                "format": "json",
                "options": {"temperature": 0.3, "num_predict": 12000}
            },
            timeout=180.0
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

        parsed = json.loads(raw)
        return parsed.get("html", "")
    except Exception as e:
        print(f"Ollama refine error: {e}", file=sys.stderr)
        return None


def refine_with_gemini(html, request):
    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=GEMINI_API_KEY)
        prompt = f"""Modify this Instagram Card News HTML based on the request.
REQUEST: {request}
HTML: {html}
Rules: No <img> tags. Output ONLY JSON: {{"html": "..."}}"""

        response = client.models.generate_content(
            model="gemini-2.0-flash-lite",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.3,
            )
        )
        parsed = json.loads(response.text.strip())
        return parsed.get("html", "")
    except Exception as e:
        print(f"Gemini refine error: {e}", file=sys.stderr)
        return None


def refine_html(html, request):
    print(f"[INFO] Refining with Ollama ({OLLAMA_MODEL})...", file=sys.stderr)
    result = refine_with_ollama(html, request)
    if result:
        print("[INFO] Ollama refinement succeeded!", file=sys.stderr)
        return result

    if GEMINI_API_KEY:
        print("[INFO] Trying Gemini fallback...", file=sys.stderr)
        result = refine_with_gemini(html, request)
        if result:
            return result

    print("Error: Refinement failed.", file=sys.stderr)
    sys.exit(1)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--html", required=True, help="Path to HTML file")
    parser.add_argument("--request", required=True, help="Refinement request")
    args = parser.parse_args()

    with open(args.html, "r", encoding="utf-8") as f:
        current_html = f.read()

    refined = refine_html(current_html, args.request)
    print(refined)
