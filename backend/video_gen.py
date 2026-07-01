"""
Generate 'founder talking' videos from Founder.png via the Omni-Video-Factory
image-to-video Space. Used both by scripts/gen_founder_video.py (pre-generation)
and by the /cameo/videos/generate endpoint (background latency-hiding loop).

Not true lip-sync — it's generative talking/gesturing motion. We play the
accented Chow audio over it.
"""

from __future__ import annotations

import shutil
import threading
from pathlib import Path

_ROOT = Path(__file__).resolve().parent.parent
IMG = _ROOT / "media" / "images" / "Founder.png"
CLIPS = _ROOT / "media" / "clips"
SPACE = "FrameAI4687/Omni-Video-Factory"

# Varied talking prompts so the pool has personality.
PROMPTS = [
    "A charismatic bald man with glasses and a mustache talking energetically to the camera, mouth moving as he speaks, expressive hand gestures, moody neon lighting, cinematic.",
    "A confident man mid-sentence, laughing and gesturing, animated facial expressions, talking to camera, nightclub neon background, cinematic close-up.",
    "A man passionately bragging to the camera, pointing finger, big smile, lively head movement, mouth moving, dramatic neon lighting.",
    "A man leaning toward the camera making a bold point, eyebrows raised, talking, hand gesture, cinematic neon-lit room.",
    "A man delivering a punchline with a smirk, talking and nodding, expressive eyes, animated, neon lighting, close-up.",
    "A man giving an over-the-top confident monologue, talking fast, gesturing with both hands, neon nightclub vibe.",
    "A man greeting the camera enthusiastically, waving, talking with a grin, lively, neon lighting, cinematic.",
    "A man reacting with dramatic excitement, talking, wide gestures, animated expression, neon-lit scene.",
]

_lock = threading.Lock()
_generating = False


def _next_path() -> Path:
    CLIPS.mkdir(parents=True, exist_ok=True)
    i = 0
    while (CLIPS / f"founder_talk_{i:02d}.mp4").exists():
        i += 1
    return CLIPS / f"founder_talk_{i:02d}.mp4"


def _extract(result) -> str | None:
    def one(x):
        if isinstance(x, str):
            return x
        if isinstance(x, dict):
            return x.get("video") or x.get("path") or x.get("url")
        return None
    if isinstance(result, (list, tuple)):
        for it in result:
            p = one(it)
            if p and str(p).lower().endswith((".mp4", ".webm", ".mov")):
                return p
    return one(result)


def generate_one(prompt: str | None = None, seconds: int = 5, resolution: int = 384) -> Path | None:
    """Generate a single talking video; returns its path (or None on failure)."""
    if not IMG.exists():
        return None
    import random
    from gradio_client import Client, handle_file

    p = prompt or random.choice(PROMPTS)
    client = Client(SPACE, verbose=False)
    result = client.predict(
        1, seconds, resolution, handle_file(str(IMG)), p, p, "", "", "",
        api_name="/_submit_i2v_manual",
    )
    src = _extract(result)
    if not src or not Path(src).exists():
        return None
    out = _next_path()
    shutil.copyfile(src, out)
    return out


def generate_async() -> bool:
    """Kick off one generation in a background thread (one at a time). Returns
    True if a new job was started, False if one is already running."""
    global _generating
    with _lock:
        if _generating:
            return False
        _generating = True

    def _run():
        global _generating
        try:
            generate_one()
        except Exception:  # noqa: BLE001 - best-effort background job
            pass
        finally:
            with _lock:
                _generating = False

    threading.Thread(target=_run, daemon=True).start()
    return True


def list_videos() -> list[str]:
    """Public URLs of the available founder talking videos."""
    if not CLIPS.is_dir():
        return []
    return sorted(f"/media/clips/{p.name}" for p in CLIPS.glob("founder_talk_*.mp4"))
