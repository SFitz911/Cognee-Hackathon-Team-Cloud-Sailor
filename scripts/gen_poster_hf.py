"""
Generate the 'Hangover 4: Berlin' hero image via a PUBLIC Hugging Face Space
(FLUX.1-schnell, open-source) using gradio_client. No API key required for
public Spaces (subject to the Space's queue).

  python gen_poster_hf.py

Saves to images/poster.png. Falls back across a few known public Spaces.
"""

from __future__ import annotations

import shutil
import sys
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "media" / "images" / "poster.png"

PROMPT = (
    "Theatrical comedy movie poster, cinematic glossy film one-sheet. Four hungover "
    "disheveled friends stumbling through a trashed neon-lit Berlin apartment at dawn, "
    "confetti and bottles everywhere, string lights. A handsome Hungarian Vizsla dog with "
    "a rust-golden coat sits front and center looking smug. Berlin TV Tower through the "
    "window at sunrise. Vibrant magenta and teal neon color grade, dramatic rim lighting, "
    "chaotic party energy, shallow depth of field, high detail, dramatic composition."
)

# (space_id, api_name, how-to-pull-file-from-result)
SPACES = [
    ("black-forest-labs/FLUX.1-schnell", "/infer"),
    ("multimodalart/FLUX.1-merged", "/infer"),
    ("stabilityai/stable-diffusion-3.5-large-turbo", "/infer"),
]


def _extract_path(result):
    """gradio results vary: str path, dict with 'path'/'url', or a tuple/list."""
    def from_one(x):
        if isinstance(x, str):
            return x
        if isinstance(x, dict):
            return x.get("path") or x.get("url") or x.get("image")
        return None
    if isinstance(result, (list, tuple)):
        for item in result:
            p = from_one(item)
            if p:
                return p
    return from_one(result)


def main() -> int:
    from gradio_client import Client

    for space, api in SPACES:
        try:
            print(f"Trying Space: {space} {api} …")
            client = Client(space)
            # FLUX schnell signature: prompt, seed, randomize_seed, width, height, num_inference_steps
            try:
                result = client.predict(
                    PROMPT, 0, True, 768, 1152, 4, api_name=api
                )
            except TypeError:
                result = client.predict(PROMPT, api_name=api)
            path = _extract_path(result)
            if path and Path(path).exists():
                shutil.copyfile(path, OUT)
                print(f"✓ Saved poster -> {OUT} ({OUT.stat().st_size // 1024} KB)")
                return 0
            print(f"  no usable file in result: {str(result)[:160]}")
        except Exception as e:  # noqa: BLE001
            print(f"  {space} failed: {str(e)[:200]}")
    print("All public Spaces failed (queue/full/changed API). Try a HF token or fal.ai key.")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
