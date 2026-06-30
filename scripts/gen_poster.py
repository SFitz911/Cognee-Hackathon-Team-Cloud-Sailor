"""
Generate the 'Hangover 4: Berlin' movie poster with OpenAI's image API.

Tries gpt-image-1 first, falls back to dall-e-3. Saves to images/poster.png.
Stdlib-only (urllib), reads OPENAI_API_KEY from .env.

  python gen_poster.py
"""

from __future__ import annotations

import base64
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

from dotenv import load_dotenv

OUT = Path(__file__).resolve().parent.parent / "media" / "images" / "poster.png"

PROMPT = (
    "A theatrical comedy movie poster for 'HANGOVER 4: BERLIN'. Cinematic, glossy, "
    "high-budget film-poster look. Four hungover, disheveled friends stumble through a "
    "trashed neon-lit Berlin apartment at dawn — party aftermath everywhere, confetti, "
    "tipped-over bottles, string lights. A handsome Hungarian Vizsla dog (rust-golden coat) "
    "sits front and center looking smug, with a tiny mysterious number tattoo on her belly. "
    "Through the window: the Berlin TV Tower and a hint of a Serbian town at sunrise. "
    "Vibrant magenta and teal neon color grade, dramatic rim lighting, chaotic comedic energy, "
    "shallow depth of field. Leave clean negative space across the top third for a big title. "
    "No text in the image. Portrait-friendly wide cinematic composition."
)


def _post(api_key: str, payload: dict) -> dict:
    req = urllib.request.Request(
        "https://api.openai.com/v1/images/generations",
        data=json.dumps(payload).encode(),
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=180) as resp:
        return json.loads(resp.read().decode())


def _save_b64(data: dict) -> bool:
    item = data["data"][0]
    if "b64_json" in item and item["b64_json"]:
        OUT.write_bytes(base64.b64decode(item["b64_json"]))
        return True
    if item.get("url"):
        with urllib.request.urlopen(item["url"], timeout=120) as r:
            OUT.write_bytes(r.read())
        return True
    return False


def main() -> int:
    load_dotenv()
    key = os.getenv("OPENAI_API_KEY")
    if not key:
        print("OPENAI_API_KEY not set in .env")
        return 1

    attempts = [
        {"model": "gpt-image-1", "prompt": PROMPT, "size": "1024x1536", "quality": "high"},
        {"model": "dall-e-3", "prompt": PROMPT, "size": "1024x1792"},
    ]
    for payload in attempts:
        try:
            print(f"Generating with {payload['model']} ({payload['size']})…")
            data = _post(key, payload)
            if _save_b64(data):
                print(f"✓ Saved poster -> {OUT}  ({OUT.stat().st_size // 1024} KB)")
                return 0
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8", "replace")[:300]
            print(f"  {payload['model']} failed: HTTP {e.code} {body}")
        except Exception as e:  # noqa: BLE001
            print(f"  {payload['model']} failed: {e}")
    print("All image models failed.")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
