import asyncio
from playwright.async_api import async_playwright
import os
import argparse
import sys

async def capture_slides(html_path):
    output_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".tmp", "slides")
    os.makedirs(output_dir, exist_ok=True)
    
    if not html_path.startswith("http://") and not html_path.startswith("https://") and not html_path.startswith("file://"):
        html_path = f"file://{os.path.abspath(html_path)}"

    print(f"Opening: {html_path}")

    async with async_playwright() as p:
        browser = await p.chromium.launch()
        # Viewport for Instagram portrait format
        page = await browser.new_page(viewport={"width": 1080, "height": 1350})
        await page.goto(html_path, wait_until="networkidle")
        await asyncio.sleep(2)

        # Find slides
        slides = await page.query_selector_all(".slide")
        count = 0
        
        if slides:
            print(f"Found {len(slides)} slides.")
            for i, slide in enumerate(slides, 1):
                out_path = os.path.join(output_dir, f"slide_{i:02d}.png")
                await slide.screenshot(path=out_path)
                print(f"Saved: {out_path}")
                count += 1
        else:
            print("No slides found with .slide class. Trying to find by ID...")
            for i in range(1, 11): # Try up to 10 slides
                slide = await page.query_selector(f"#slide{i}")
                if slide:
                    out_path = os.path.join(output_dir, f"slide_{i:02d}.png")
                    await slide.screenshot(path=out_path)
                    print(f"Saved: {out_path}")
                    count += 1
            
            if count == 0:
                print("No slides found. Taking full page screenshot...", file=sys.stderr)
                out_path = os.path.join(output_dir, "slide_page.png")
                await page.screenshot(path=out_path, full_page=True)
                count = 1

        await browser.close()
    
    print(f"Successfully processed {count} slides.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    args = parser.parse_args()
    
    if not os.path.exists(args.input) and not args.input.startswith("http"):
        print(f"Error: Input file '{args.input}' not found.", file=sys.stderr)
        sys.exit(1)
        
    asyncio.run(capture_slides(args.input))
