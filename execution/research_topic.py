import os
import sys
import argparse
import json
import httpx
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

def research_topic(topic, api_key=None):
    key = api_key or GEMINI_API_KEY
    if not key:
        error_msg = "[ERROR] Gemini API 키가 없어 자료 조사를 수행할 수 없습니다. 설정에서 키를 입력해주세요."
        print(error_msg, file=sys.stderr)
        # 생성 단계에서 에러를 내기 위해 일단 원본 텍스트를 반환하거나 에러를 던질 수 있음
        # 여기서는 원본을 반환하되 로그를 명확히 남깁니다.
        return topic

    try:
        from google import genai
        from google.genai import types
        
        print(f"[INFO] Researching topic: {topic}...", file=sys.stderr)
        # Google Search Grounding 은 v1beta 에서만 지원됨 → v1beta 명시 또는 기본값 사용
        # gemini-2.0-flash 등 최신 모델도 v1beta 에서만 제공되므로 v1 사용 금지
        client = genai.Client(
            api_key=key,
            http_options={"api_version": "v1beta"},
        )

        prompt = f"""
        You are a world-class technology analyst. Research the ABSOLUTE LATEST information of 2026 for the topic: "{topic}".
        Use Google Search to find current facts, specific model versions (e.g., Claude 3.7, Gemini 3.1 Pro, GPT-5/o), and real-world 2026 benchmarks.

        CRITICAL: Provide a HIGH-DENSITY research report (1500+ characters).
        1. [2026 CURRENT LEADERS] List the top tools/models as of February 2026. Mention specific names like Claude 3.7+, Gemini 3.1 Pro, etc.
        2. [TECHNICAL SPECS] Provide actual features, parameter trends (if known), or specific use cases that emerged in late 2025/early 2026.
        3. [MARKET DATA] 3+ Real statistics, user counts, or market share data from 2025-2026 reports.

        All content must be in KOREAN. Do not provide 2024/2025 info unless it's for comparison. Focus on the NEWEST stuff that just came out.
        """

        models = [
            "gemini-2.0-flash",
            "gemini-2.0-flash-lite",
            "gemini-1.5-flash",
        ]
        for model_id in models:
            try:
                print(f"[INFO] Researching with {model_id} (Google Search enabled)...", file=sys.stderr)
                # 구글 검색(Grounding) 기능 활성화하여 최신 정보 반영
                response = client.models.generate_content(
                    model=model_id,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        tools=[types.Tool(google_search=types.GoogleSearch())],
                        temperature=0.3
                    )
                )
                return response.text.strip()
            except Exception as e:
                print(f"[WARN] Research with {model_id} failed: {e}", file=sys.stderr)
                continue
        
        print(f"[ERROR] All research models failed", file=sys.stderr)
        return topic
    except Exception as e:
        print(f"[ERROR] Research failed: {e}", file=sys.stderr)
        return topic

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--topic", required=True)
    args = parser.parse_args()
    
    print(research_topic(args.topic))
