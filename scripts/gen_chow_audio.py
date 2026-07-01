"""
Pre-generate Mr. Chow cameo audio clips with an Asian-accented voice via
edge-tts (open-source, free, no key). Writes mp3s + a manifest the frontend
cameo plays. The avatar animates while these play (no lip-sync needed).

  python scripts/gen_chow_audio.py

Outputs: media/audio/chow_XX.mp3 and media/audio/chow_manifest.json
"""

from __future__ import annotations

import asyncio
import csv
import json
import re
import sys
from pathlib import Path

import edge_tts

_ROOT = Path(__file__).resolve().parent.parent
CSV = _ROOT / "data" / "mr_chow_responses.csv"
OUT = _ROOT / "media" / "audio"
VOICE = "zh-CN-YunxiNeural"   # lively Chinese male — strong comedic accent
RATE = "+12%"
PITCH = "+8Hz"

# How many short lines to pull per category (keeps a varied ~20-clip pool).
PLAN = {"Greeting": 4, "Party": 4, "Brag": 4, "Confidence": 3, "Exit": 3, "Chaos": 2}
MAX_LEN = 64


def curate() -> list[dict]:
    rows = list(csv.DictReader(open(CSV, encoding="utf-8")))
    picked, seen = [], set()
    for cat, n in PLAN.items():
        pool = [r for r in rows if r["category"] == cat and len(r["response"]) <= MAX_LEN]
        for r in pool[:n]:
            key = r["response"]
            if key not in seen:
                seen.add(key)
                picked.append({"text": key.strip(), "category": cat})
    return picked


async def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    items = curate()
    manifest = []
    for i, it in enumerate(items):
        fname = f"chow_{i:02d}.mp3"
        try:
            c = edge_tts.Communicate(it["text"], VOICE, rate=RATE, pitch=PITCH)
            await c.save(str(OUT / fname))
            manifest.append({"file": f"/media/audio/{fname}", "text": it["text"], "category": it["category"]})
            print(f"  [{i+1}/{len(items)}] {it['category']:11} {it['text'][:44]}")
        except Exception as e:  # noqa: BLE001
            print(f"  FAILED {fname}: {str(e)[:80]}")
    (OUT / "chow_manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"\n✓ {len(manifest)} clips + manifest -> {OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
