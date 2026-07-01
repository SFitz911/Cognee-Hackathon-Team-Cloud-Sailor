"""
Audio-driven lip-sync: turn Founder.png + our Chow MP3s into videos where his
lips actually match our accented voice (the video already contains our audio).

Tries audio-driven talking-head Spaces in order. These free Spaces cycle up and
down — run this whenever one is healthy. Output: media/clips/founder_say_XX.mp4
(these are played UNMUTED by the cameo, since the accented audio is baked in).

  python scripts/gen_lipsync.py           # first 6 clips
  python scripts/gen_lipsync.py 12        # first N clips

If all Spaces are down, use a hosted lip-sync API (e.g. fal.ai sync-lipsync)
instead — ask and we'll wire it with a key.
"""

from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parent.parent
IMG = _ROOT / "media" / "images" / "Founder.png"
AUDIO = _ROOT / "media" / "audio"
CLIPS = _ROOT / "media" / "clips"

# (space, api_name, arg-order builder). Each returns positional args for predict.
SPACES = [
    ("BadToBest/EchoMimic", "/generate_video", lambda hf, img, aud: (hf(img), hf(aud))),
    ("fffiloni/SadTalker", "/test", lambda hf, img, aud: (hf(img), hf(aud), "crop", True, False)),
    ("Rudrabha/Wav2Lip", "/predict", lambda hf, img, aud: (hf(img), hf(aud))),
]


def _pick(x):
    if isinstance(x, dict):
        return x.get("video") or x.get("path") or x.get("url")
    return x


def _first_video(result):
    if isinstance(result, (list, tuple)):
        for it in result:
            p = _pick(it)
            if p and str(p).lower().endswith((".mp4", ".webm", ".mov")):
                return p
        for it in result:
            if _pick(it):
                return _pick(it)
    return _pick(result)


def main() -> int:
    from gradio_client import Client, handle_file

    n = int(sys.argv[1]) if len(sys.argv) > 1 else 6
    manifest = json.loads((AUDIO / "chow_manifest.json").read_text(encoding="utf-8"))
    picks = manifest[:n]
    CLIPS.mkdir(parents=True, exist_ok=True)

    # Find a healthy Space once.
    client = None
    chosen = None
    for space, api, builder in SPACES:
        try:
            client = Client(space, verbose=False)
            chosen = (space, api, builder)
            print(f"Using {space} {api}")
            break
        except Exception as e:  # noqa: BLE001
            print(f"  {space} unavailable: {str(e)[:80]}")
    if not chosen:
        print("No audio-driven lip-sync Space is up right now. Try later, or use a hosted API (fal.ai).")
        return 1

    space, api, builder = chosen
    made = []
    for i, clip in enumerate(picks):
        audio_path = _ROOT / clip["file"].lstrip("/")
        out = CLIPS / f"founder_say_{i:02d}.mp4"
        try:
            args = builder(handle_file, str(IMG), str(audio_path))
            result = client.predict(*args, api_name=api)
            src = _first_video(result)
            if src and Path(src).exists():
                shutil.copyfile(src, out)
                made.append({"file": f"/media/clips/{out.name}", "text": clip["text"]})
                print(f"  [{i+1}/{len(picks)}] -> {out.name}")
            else:
                print(f"  [{i+1}] no video: {str(result)[:80]}")
        except Exception as e:  # noqa: BLE001
            print(f"  [{i+1}] failed: {str(e)[:120]}")

    if made:
        (CLIPS / "founder_say_manifest.json").write_text(json.dumps(made, indent=2), encoding="utf-8")
        print(f"\n✓ {len(made)} lip-synced clips + manifest in {CLIPS}")
    return 0 if made else 1


if __name__ == "__main__":
    raise SystemExit(main())
