"""
Pre-generate a pool of 'founder talking' videos so the cameo never waits.

  python scripts/gen_founder_video.py            # generate 8 (default)
  python scripts/gen_founder_video.py 5          # generate N

Videos go to media/clips/founder_talk_XX.mp4 (committed). At runtime, the
/cameo/videos/generate endpoint grows the pool further in the background.
"""

from __future__ import annotations

import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from backend import video_gen  # noqa: E402


def main() -> int:
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 8
    print(f"Generating {n} founder talking videos via {video_gen.SPACE} …")
    made = 0
    for i in range(n):
        try:
            out = video_gen.generate_one(video_gen.PROMPTS[i % len(video_gen.PROMPTS)])
            if out:
                made += 1
                print(f"  [{made}/{n}] -> {out.name} ({out.stat().st_size // 1024} KB)")
            else:
                print(f"  [{i+1}] no video returned")
        except Exception as e:  # noqa: BLE001
            print(f"  [{i+1}] failed: {str(e)[:120]}")
    print(f"\n✓ {made} videos in {video_gen.CLIPS}")
    return 0 if made else 1


if __name__ == "__main__":
    raise SystemExit(main())
