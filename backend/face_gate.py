"""
Face-recognition security gate (Page 3) — powered by DeepFace.

Only enrolled "operatives" (the Wolfpack) can unlock the memory database. We keep
a small gallery of authorized faces on disk; a webcam scan is matched against it.

Design notes:
- DeepFace + OpenCV are imported lazily so the API still boots while the (heavy)
  install finishes, or on machines without them.
- Webcam frames arrive as data URLs; we decode to a BGR numpy array (the most
  reliable DeepFace input) rather than juggling base64 prefixes.
- SFace + opencv detector keeps it fast enough for a live demo.
"""

from __future__ import annotations

import base64
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

_ROOT = Path(__file__).resolve().parent.parent
GALLERY = _ROOT / "media" / "faces"          # authorized faces live here
MODEL_NAME = "SFace"                          # light + fast
DETECTOR = "opencv"                           # no extra system deps


class FaceGateError(RuntimeError):
    """Recoverable face-gate failure (no face, bad image, deps missing)."""


@dataclass(frozen=True)
class VerifyResult:
    granted: bool
    identity: Optional[str]
    distance: Optional[float]
    threshold: Optional[float]
    reason: str


def is_available() -> bool:
    try:
        import cv2  # noqa: F401
        import deepface  # noqa: F401
        return True
    except Exception:  # noqa: BLE001
        return False


def enrolled_names() -> list[str]:
    if not GALLERY.is_dir():
        return []
    return sorted(p.stem for p in GALLERY.glob("*.jpg"))


def _decode_dataurl(data_url: str):
    """data URL / base64 -> BGR numpy image (raises FaceGateError on bad input)."""
    import cv2
    import numpy as np

    if not data_url:
        raise FaceGateError("No image provided.")
    b64 = data_url.split(",", 1)[1] if data_url.startswith("data:") else data_url
    try:
        raw = base64.b64decode(b64)
        arr = np.frombuffer(raw, dtype=np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    except Exception as e:  # noqa: BLE001
        raise FaceGateError(f"Could not decode image: {e}") from e
    if img is None:
        raise FaceGateError("Decoded image was empty.")
    return img


def _clear_cache() -> None:
    """DeepFace.find caches representations in the gallery; drop it after enroll."""
    if GALLERY.is_dir():
        for pkl in GALLERY.glob("*.pkl"):
            pkl.unlink(missing_ok=True)


def enroll(name: str, data_url: str) -> str:
    """Save a webcam frame as an authorized face. Returns the stored file name."""
    import cv2

    if not is_available():
        raise FaceGateError("DeepFace/OpenCV not installed yet.")
    safe = "".join(c for c in name.strip() if c.isalnum() or c in ("-", "_")) or "operative"
    img = _decode_dataurl(data_url)
    GALLERY.mkdir(parents=True, exist_ok=True)
    out = GALLERY / f"{safe}.jpg"
    if not cv2.imwrite(str(out), img):
        raise FaceGateError("Failed to write face image.")
    _clear_cache()
    return out.name


def verify(data_url: str) -> VerifyResult:
    """Match a webcam frame against the authorized gallery via DeepFace.find."""
    if not is_available():
        raise FaceGateError("DeepFace/OpenCV not installed yet.")
    if not enrolled_names():
        return VerifyResult(False, None, None, None, "No operatives enrolled yet.")

    from deepface import DeepFace

    img = _decode_dataurl(data_url)
    try:
        results = DeepFace.find(
            img_path=img,
            db_path=str(GALLERY),
            model_name=MODEL_NAME,
            detector_backend=DETECTOR,
            enforce_detection=True,
            silent=True,
        )
    except ValueError as e:
        # DeepFace raises ValueError when it can't detect a face.
        return VerifyResult(False, None, None, None, "No face detected — look at the camera.")

    # results is a list of DataFrames (one per detected face); take the best row.
    best = None
    for df in results:
        if df is not None and len(df) > 0:
            row = df.iloc[0]
            dist = float(row.get("distance", 1.0))
            if best is None or dist < best[1]:
                best = (str(row.get("identity", "")), dist, float(row.get("threshold", 0.0)))
    if best is None:
        return VerifyResult(False, None, None, None, "No match in the gallery.")

    identity_path, distance, threshold = best
    name = Path(identity_path).stem
    granted = distance <= threshold if threshold else distance < 0.6
    return VerifyResult(
        granted=granted,
        identity=name if granted else None,
        distance=round(distance, 4),
        threshold=round(threshold, 4) if threshold else None,
        reason="Access granted." if granted else "Face not recognized.",
    )
