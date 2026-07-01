"""
Real lip-sync via fal.ai — sync the founder's lips to our accented Chow MP3s.

Uses each existing 'founder_talk' video as the base (real gestures) and syncs
its lips to a Chow audio clip, so the result has BOTH natural motion AND lips
matching our accented voice (audio baked in). Output: media/clips/founder_say_XX.mp4
played UNMUTED by the cameo.

Requires FAL_KEY in .env with a funded balance (fal.ai/dashboard/billing).

  python scripts/gen_lipsync_fal.py           # 6 clips
  python scripts/gen_lipsync_fal.py 10        # N clips
"""

from __future__ import annotations

import json
import sys
import urllib.request
from pathlib import Path

from dotenv import load_dotenv

_ROOT = Path(__file__).resolve().parent.parent
CLIPS = _ROOT / "media" / "clips"
AUDIO = _ROOT / "media" / "audio"
MODEL = "fal-ai/sync-lipsync"


def main() -> int:
    load_dotenv()
    import fal_client

    n = int(sys.argv[1]) if len(sys.argv) > 1 else 6
    manifest = json.loads((AUDIO / "chow_manifest.json").read_text(encoding="utf-8"))[:n]
    bases = sorted(CLIPS.glob("founder_talk_*.mp4"))
    if not bases:
        print("No base 'founder_talk' videos found — run scripts/gen_founder_video.py first.")
        return 1

    made = []
    for i, clip in enumerate(manifest):
        base = bases[i % len(bases)]
        audio_path = _ROOT / clip["file"].lstrip("/")
        out = CLIPS / f"founder_say_{i:02d}.mp4"
        try:
            print(f"[{i+1}/{len(manifest)}] syncing {base.name} <- {audio_path.name} …")
            v_url = fal_client.upload_file(str(base))
            a_url = fal_client.upload_file(str(audio_path))
            res = fal_client.subscribe(MODEL, arguments={"video_url": v_url, "audio_url": a_url})
            vid = res.get("video")
            url = vid.get("url") if isinstance(vid, dict) else vid
            if url:
                urllib.request.urlretrieve(url, str(out))
                made.append({"file": f"/media/clips/{out.name}", "text": clip["text"]})
                print(f"    -> {out.name} ({out.stat().st_size // 1024} KB)")
            else:
                print(f"    no video: {str(res)[:120]}")
        except Exception as e:  # noqa: BLE001
            print(f"    failed: {str(e)[:160]}")

    if made:
        (CLIPS / "founder_say_manifest.json").write_text(json.dumps(made, indent=2), encoding="utf-8")
        print(f"\n✓ {len(made)} lip-synced clips + manifest in {CLIPS}")
    return 0 if made else 1


if __name__ == "__main__":
    raise SystemExit(main())
