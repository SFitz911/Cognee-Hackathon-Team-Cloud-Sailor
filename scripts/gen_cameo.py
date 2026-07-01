"""
Generate a real founder talking-head cameo via open-source Hugging Face Spaces.

Two stages, both on free public Spaces (no key), with graceful fallback:
  1. TTS  — synthesize the founder voice line to a WAV.
  2. Lip-sync/talking-head — drive media/images/Founder.png with that audio.

Saves media/clips/founder_cameo.mp4. If any Space is down/queued, the frontend
cameo card still works (animated portrait + browser speech), so this is a bonus.

  python scripts/gen_cameo.py
"""

from __future__ import annotations

import shutil
import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parent.parent
IMG = _ROOT / "media" / "images" / "Founder.png"
OUT = _ROOT / "media" / "clips" / "founder_cameo.mp4"

LINE = (
    "Hey Wolfpack, founder of Cognee here. You lost the dog, but the memory never "
    "forgets. Feed me the clues and let the graph do the thinking. Now go find Pinky!"
)

TTS_SPACES = ["hexgrad/Kokoro-TTS", "coqui/xtts", "innoai/Edge-TTS-Text-to-Speech"]
TALKINGHEAD_SPACES = ["vinthony/SadTalker", "fffiloni/SadTalker", "KwaiVGI/LivePortrait"]


def _first_file(result):
    def one(x):
        if isinstance(x, str):
            return x
        if isinstance(x, dict):
            return x.get("path") or x.get("video") or x.get("name") or x.get("url")
        return None
    if isinstance(result, (list, tuple)):
        for it in result:
            p = one(it)
            if p:
                return p
    return one(result)


def make_tts(client_cls) -> str | None:
    for space in TTS_SPACES:
        try:
            print(f"TTS via {space} …")
            c = client_cls(space)
            for args in ([LINE], [LINE, "af_heart"], [LINE, "en-US-GuyNeural", 0, 0]):
                try:
                    r = c.predict(*args, api_name="/generate")
                    p = _first_file(r)
                    if p and Path(p).exists():
                        return p
                except Exception:
                    continue
        except Exception as e:  # noqa: BLE001
            print(f"  {space} failed: {str(e)[:120]}")
    return None


def make_video(client_cls, audio_path: str) -> bool:
    for space in TALKINGHEAD_SPACES:
        try:
            print(f"Talking-head via {space} …")
            from gradio_client import handle_file
            c = client_cls(space)
            r = c.predict(handle_file(str(IMG)), handle_file(audio_path), api_name="/test")
            p = _first_file(r)
            if p and Path(p).exists():
                OUT.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(p, OUT)
                print(f"✓ Saved cameo -> {OUT} ({OUT.stat().st_size // 1024} KB)")
                return True
        except Exception as e:  # noqa: BLE001
            print(f"  {space} failed: {str(e)[:160]}")
    return False


def main() -> int:
    if not IMG.exists():
        print(f"Missing founder image: {IMG}")
        return 1
    from gradio_client import Client

    audio = make_tts(Client)
    if not audio:
        print("TTS failed on all Spaces — frontend cameo will use browser speech instead.")
        return 1
    if not make_video(Client, audio):
        print("Talking-head failed on all Spaces — frontend cameo falls back gracefully.")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
