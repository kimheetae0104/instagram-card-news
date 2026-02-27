"""
레퍼런스 이미지를 gemma3 (로컬 비전 모델)로 분석하여 디자인 패턴 추출
"""
import os
import sys
import json
import base64
import glob
import httpx
from dotenv import load_dotenv

load_dotenv()

OLLAMA_BASE_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434")
VISION_MODEL = "gemma3:12b"  # 비전 지원 모델
OUTPUT_FILE = os.path.join(os.path.dirname(__file__), "learned_design.json")
REFERENCE_DIR = os.path.join(os.path.dirname(__file__), "references")


def encode_image(path):
    with open(path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")


def analyze_batch(image_paths, batch_label=""):
    """gemma3로 이미지 배치 분석"""
    images_b64 = [encode_image(p) for p in image_paths]

    prompt = """이 인스타그램 카드뉴스 이미지들을 분석해서 디자인 패턴을 추출해줘.

다음 항목을 JSON으로 출력해줘:
{
  "color_palette": {"배경색들": [], "강조색들": [], "텍스트색들": []},
  "typography": {"제목_크기": "", "본문_크기": "", "폰트_굵기들": [], "정렬": ""},
  "layout": {"슬라이드_구성": "", "여백": "", "요소_배치": ""},
  "decorative": ["장식 요소들 CSS로 설명"],
  "highlights": ["핵심 데이터 강조 방식"],
  "best_practices": ["관찰된 디자인 베스트 프랙티스"]
}

CSS 값은 최대한 구체적으로 (px, hex색상 등). JSON만 출력해."""

    try:
        print(f"[INFO] Batch {batch_label}: {len(image_paths)}개 이미지 분석 중...", file=sys.stderr)
        response = httpx.post(
            f"{OLLAMA_BASE_URL}/api/generate",
            json={
                "model": VISION_MODEL,
                "prompt": prompt,
                "images": images_b64,
                "stream": False,
                "format": "json",
                "options": {
                    "temperature": 0.2,
                    "num_predict": 4000,
                }
            },
            timeout=180.0
        )
        response.raise_for_status()
        raw = response.json().get("response", "").strip()
        return json.loads(raw)
    except json.JSONDecodeError as e:
        print(f"[WARN] JSON 파싱 실패: {e}", file=sys.stderr)
        return {"raw": raw}
    except Exception as e:
        print(f"[ERROR] 분석 실패: {e}", file=sys.stderr)
        return None


def merge_analysis(results):
    """여러 배치 결과를 하나로 합치기"""
    merged = {
        "color_palette": {"배경색들": set(), "강조색들": set(), "텍스트색들": set()},
        "typography": {},
        "layout": {},
        "decorative": [],
        "highlights": [],
        "best_practices": []
    }

    for r in results:
        if not r or "raw" in r:
            continue
        # 색상 합치기
        cp = r.get("color_palette", {})
        for key in ["배경색들", "강조색들", "텍스트색들"]:
            vals = cp.get(key, [])
            if isinstance(vals, list):
                merged["color_palette"][key].update(vals)

        # 나머지 합치기
        if r.get("typography"):
            merged["typography"] = r["typography"]
        if r.get("layout"):
            merged["layout"] = r["layout"]
        merged["decorative"].extend(r.get("decorative", []))
        merged["highlights"].extend(r.get("highlights", []))
        merged["best_practices"].extend(r.get("best_practices", []))

    # set → list
    for key in merged["color_palette"]:
        merged["color_palette"][key] = list(merged["color_palette"][key])

    # 중복 제거
    merged["decorative"] = list(set(merged["decorative"]))
    merged["highlights"] = list(set(merged["highlights"]))
    merged["best_practices"] = list(set(merged["best_practices"]))

    return merged


def main():
    images = []
    for ext in ["*.png", "*.jpg", "*.jpeg"]:
        images.extend(glob.glob(os.path.join(REFERENCE_DIR, ext)))

    if not images:
        print("[ERROR] references/ 폴더에 이미지가 없습니다.", file=sys.stderr)
        sys.exit(1)

    print(f"[INFO] 총 {len(images)}개 이미지 발견", file=sys.stderr)

    # 3개씩 배치 (gemma3 비전 모델 제한)
    batch_size = 3
    results = []
    for i in range(0, min(len(images), 15), batch_size):  # 최대 15개
        batch = images[i:i + batch_size]
        label = f"{i//batch_size + 1}/{min(len(images), 15)//batch_size + 1}"
        result = analyze_batch(batch, label)
        if result:
            results.append(result)

    if not results:
        print("[ERROR] 분석 결과 없음", file=sys.stderr)
        sys.exit(1)

    merged = merge_analysis(results)

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(merged, f, ensure_ascii=False, indent=2)

    print(f"\n[INFO] ✅ 학습 완료! → {OUTPUT_FILE}", file=sys.stderr)
    print(json.dumps(merged, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
