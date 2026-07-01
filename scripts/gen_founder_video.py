"""
Generate a short 'founder talking' video from Founder.png via the
Omni-Video-Factory image-to-video Space. Not lip-synced — it's a generative
talking/gesturing loop we play (muted) while the accented audio plays over it.

  python scripts/gen_founder_video.py

Output: media/clips/founder_talk.mp4
"""

from __future__ import annotations

import shutil
import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parent.parent
IMG = _ROOT / "media" / "images" / "Founder.png"
OUT = _ROOT / "media" / "clips" / "founder_talk.mp4"
SPACE = "FrameAI4687/Omni-Video-Factory"

PROMPT = (
    "A charismatic man talking energetically straight to the camera, mouth moving as he "
    "speaks, lively facial expressions, expressive hand gestures, subtle head movement, "
    "moody nightclub neon lighting, cinematic."
)


def _first_video(result):
    def one(x):
        if isinstance(x, str):
            return x
        if isinstance(x, dict):
            return x.get("video") or x.get("path") or x.get("url") or x.get("name")
        return None
    if isinstance(result, (list, tuple)):
        for it in result:
            p = one(it)
            if p and str(p).lower().endswith((".mp4", ".webm", ".mov")):
                return p
        for it in result:
            p = one(it)
            if p:
                return p
    return one(result)


def main() -> int:
    if not IMG.exists():
        print(f"Missing {IMG}")
        return 1
    from gradio_client import Client, handle_file

    print(f"Connecting to {SPACE} …")
    c = Client(SPACE, verbose=False)
    print("Generating founder talking video (image-to-video)… this can take a few minutes.")
    result = c.predict(
        1,              # scene_count (int choice)
        5,              # seconds_per_scene (int choice [3,5])
        384,            # resolution (int choice [384,512])
        handle_file(str(IMG)),  # image_file
        PROMPT,         # base_prompt
        PROMPT,         # s1
        "", "", "",     # s2, s3, s4
        api_name="/_submit_i2v_manual",
    )
    path = _first_video(result)
    if path and Path(path).exists():
        OUT.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(path, OUT)
        print(f"✓ Saved -> {OUT} ({OUT.stat().st_size // 1024} KB)")
        return 0
    print(f"No video in result: {str(result)[:200]}")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
