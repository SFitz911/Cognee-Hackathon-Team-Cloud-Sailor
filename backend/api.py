"""
FastAPI backend for Wolfpack Recall — Hangover Berlin / Team Cloud Sailor.

Endpoints:
  GET  /health              tenant + key sanity check
  POST /clues               ingest a clue into Cognee (remember + cognify)
  POST /investigate         run the 4-personality wolfpack on a question
  GET  /memory/search       raw recall() passthrough (debug / graph panel)

Run:
  pip install -r requirements.txt
  uvicorn backend.api:app --reload
"""

from __future__ import annotations

import csv
import os
import random
from functools import lru_cache
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from .cognee_client import CogneeClient, CogneeError
from .personalities import NODESET_ALL, WOLFPACK
from .wolfpack import Wolfpack

load_dotenv()

app = FastAPI(title="Wolfpack Recall", version="0.1.0")

# Frontend (Phase 5) runs on a different origin in dev; allow it.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def _no_cache_code(request, call_next):
    """Serve code (HTML/JS/CSS) fresh so browsers never run stale UI.

    Media (mp4/mp3/png) stays cacheable — those are large and immutable.
    """
    response = await call_next(request)
    path = request.url.path.lower()
    if path.endswith((".html", ".js", ".css")) or path == "/":
        response.headers["Cache-Control"] = "no-cache, must-revalidate"
    return response


# -- per-IP rate limiting for the paid (Claude-backed) endpoints -------------
# Protects the owner's Anthropic account: strangers can't hammer the AI. In-memory
# sliding window — fine for a single-instance deploy.
import threading as _threading
import time as _time

_RATE_MAX = int(os.getenv("WOLFPACK_RATE_MAX", "6"))
_RATE_WINDOW = int(os.getenv("WOLFPACK_RATE_WINDOW", "600"))  # seconds
_rate_hits: dict[str, list[float]] = {}
_rate_lock = _threading.Lock()


def _client_ip(request: Request) -> str:
    # Render sits behind a proxy; trust X-Forwarded-For's first hop.
    fwd = request.headers.get("x-forwarded-for", "")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def rate_limit(request: Request) -> None:
    """Raise HTTP 429 if this IP exceeded the AI call budget for the window."""
    if _RATE_MAX <= 0:
        return
    ip = _client_ip(request)
    now = _time.time()
    with _rate_lock:
        hits = [t for t in _rate_hits.get(ip, []) if now - t < _RATE_WINDOW]
        if len(hits) >= _RATE_MAX:
            retry = int(_RATE_WINDOW - (now - hits[0])) + 1
            raise HTTPException(
                status_code=429,
                detail=(
                    f"Whoa — that's a lot of AI requests. Please wait ~{retry}s and try "
                    "again. (The live demo rate-limits AI calls to keep it free for everyone.)"
                ),
                headers={"Retry-After": str(retry)},
            )
        hits.append(now)
        _rate_hits[ip] = hits


@app.on_event("startup")
def _warm_face_model() -> None:
    """Preload the DeepFace model in a background thread so the first face scan
    isn't slowed by loading the model into RAM. Non-blocking; boot stays fast."""
    import threading

    from . import face_gate

    threading.Thread(target=face_gate.warm_up, daemon=True).start()


# -- lazy singletons ---------------------------------------------------------
@lru_cache(maxsize=1)
def get_cognee() -> CogneeClient:
    return CogneeClient.from_env()


@lru_cache(maxsize=1)
def get_wolfpack() -> Wolfpack:
    """Built lazily so /health and /clues work even without an Anthropic key."""
    return Wolfpack(get_cognee())


# -- request/response models -------------------------------------------------
class ClueIn(BaseModel):
    text: str = Field(..., min_length=1, description="The clue / piece of evidence")
    node_set: str = Field(NODESET_ALL, description="Memory lens: all | verified | timeline")
    wait: bool = Field(True, description="Block until the clue is queryable (cognify done)")


class InvestigateIn(BaseModel):
    question: str = Field(..., min_length=1, description="What the wolfpack should figure out")
    top_k: int = Field(8, ge=1, le=20)


class ValidateIn(BaseModel):
    text: str = Field(..., min_length=1, description="A clue/statement to fact-check against memory")


class AskIn(BaseModel):
    question: str = Field(..., min_length=1, description="A question about Cognee or how to use the app")


class FaceEnrollIn(BaseModel):
    name: str = Field("operative", description="Operative name to store the face under")
    image: str = Field(..., min_length=1, description="Webcam frame as a data URL / base64")


class FaceVerifyIn(BaseModel):
    image: str = Field(..., min_length=1, description="Webcam frame as a data URL / base64")


# -- endpoints ---------------------------------------------------------------
@app.get("/health")
def health() -> dict:
    client = get_cognee()
    out: dict = {"tenant": client.api_base, "dataset": client.dataset}
    try:
        status, _ = client._request("GET", "/api/v1/datasets", timeout=15)
        out["cognee"] = "ok" if status == 200 else f"http {status}"
    except CogneeError as e:
        out["cognee"] = f"error: {e}"
    out["anthropic_key"] = bool(os.getenv("ANTHROPIC_API_KEY"))
    out["personas"] = [p.key for p in WOLFPACK]
    return out


@app.post("/clues")
def add_clue(clue: ClueIn) -> dict:
    client = get_cognee()
    try:
        res = client.remember(clue.text, node_set=clue.node_set, wait=clue.wait)
    except CogneeError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e
    return {
        "status": res.status,
        "dataset_id": res.dataset_id,
        "queryable": res.queryable,
        "cognify": res.cognify_outcome,
        "node_set": clue.node_set,
    }


@app.post("/investigate")
def investigate(req: InvestigateIn, _: None = Depends(rate_limit)) -> dict:
    try:
        pack = get_wolfpack()
    except CogneeError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    result = pack.investigate(req.question, top_k=req.top_k)
    return result.to_dict()


@app.post("/validate")
def validate(req: ValidateIn, _: None = Depends(rate_limit)) -> dict:
    """Fact-check a clue against the Cognee case memory -> true | false | unknown."""
    try:
        pack = get_wolfpack()
    except CogneeError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    return pack.validate(req.text)


# -- Mr. Chow cameo lines -----------------------------------------------------
_CHOW_KINDS = {
    "intro": {"Greeting", "Confidence", "Brag", "Party"},
    "solved": {"Party", "Confidence", "Exit", "Brag"},
}


@lru_cache(maxsize=1)
def _chow_rows() -> list[dict]:
    p = Path(__file__).resolve().parent.parent / "data" / "mr_chow_responses.csv"
    if not p.exists():
        return []
    with open(p, encoding="utf-8") as f:
        return list(csv.DictReader(f))


@app.get("/cameo/lines")
def cameo_lines(kind: str = "any", n: int = 1, max_len: int = 72) -> dict:
    """Random short Mr. Chow one-liners for the founder cameo (from the dataset)."""
    rows = _chow_rows()
    cats = _CHOW_KINDS.get(kind)
    pool = [
        r["response"].strip() for r in rows
        if (cats is None or r["category"] in cats) and len(r["response"]) <= max_len
    ]
    if not pool:  # fall back to any short line
        pool = [r["response"].strip() for r in rows if len(r["response"]) <= max_len]
    random.shuffle(pool)
    n = max(1, min(n, 5))
    return {"kind": kind, "lines": pool[:n]}


@app.post("/cognee/ask")
def cognee_ask(req: AskIn, _: None = Depends(rate_limit)) -> dict:
    """Cognee help assistant — explains Cognee and helps users who are stuck."""
    try:
        pack = get_wolfpack()
    except CogneeError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    return {"answer": pack.ask_guide(req.question)}


@app.get("/cameo/videos")
def cameo_videos() -> dict:
    """List available founder talking videos (the cameo picks one at random)."""
    from . import video_gen
    return {"videos": video_gen.list_videos()}


@app.post("/cameo/videos/generate")
def cameo_videos_generate() -> dict:
    """Disabled: on-demand video generation is turned off (uses a committed,
    static pool only). Kept as a no-op so any stray call is harmless."""
    from . import video_gen
    return {"started": False, "disabled": True, "count": len(video_gen.list_videos())}


@app.get("/cognee/datasets")
def cognee_datasets() -> dict:
    """List the datasets (memory graphs) on the tenant, for the graph explorer."""
    client = get_cognee()
    try:
        _, rows = client._request("GET", "/api/v1/datasets", timeout=15)
    except CogneeError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e
    import re
    uuid_re = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-", re.I)
    items = [
        {"name": d.get("name"), "id": d.get("id") or d.get("dataset_id")}
        for d in (rows or [])
        if isinstance(d, dict) and d.get("name") and not uuid_re.match(str(d.get("name")))
    ]
    return {"default": client.dataset, "datasets": items}


@app.get("/cognee/graph", response_class=HTMLResponse)
def cognee_graph(dataset: Optional[str] = None) -> HTMLResponse:
    """Proxy Cognee Cloud's live knowledge-graph visualization for a dataset.

    Served from our origin so the API key stays server-side and the page can be
    embedded in an iframe without hitting Cognee's X-Frame-Options.
    """
    client = get_cognee()
    try:
        html = client.visualize_html(dataset)
    except CogneeError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e
    return HTMLResponse(content=_dark_schema(html))


def _dark_schema(html: str) -> str:
    """Force the embedded Cognee viz to open in dark theme on the Schema tab."""
    html = html.replace('<html lang="en" class="light">', '<html lang="en" class="dark">')
    inject = (
        "<script>"
        "try{localStorage.setItem('cognee-viz-theme','dark');}catch(e){}"
        "(function(){var picked=false;"
        "function dark(){try{var h=document.documentElement;h.classList.remove('light');h.classList.add('dark');}catch(e){}}"
        "function schema(){if(picked)return;try{var s=document.querySelector('.tab-btn[data-view=\"schema\"]');"
        "if(s){s.click();picked=true;}}catch(e){}}"
        "dark();var t=setInterval(function(){dark();schema();if(picked)clearInterval(t);},250);"
        "setTimeout(function(){clearInterval(t);},4000);})();"
        "</script>"
    )
    return html.replace("</head>", inject + "</head>", 1)


@app.get("/memory/search")
def memory_search(q: str, top_k: int = 5) -> dict:
    client = get_cognee()
    try:
        hits = client.recall(q, top_k=top_k)
    except CogneeError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e
    return {
        "query": q,
        "count": len(hits),
        "hits": [{"source": h.source, "text": h.text} for h in hits],
    }


# -- face-gate security (Page 3) ---------------------------------------------
@app.get("/auth/status")
def auth_status() -> dict:
    from . import face_gate
    return {
        "available": face_gate.is_available(),
        "enrolled": face_gate.enrolled_names(),
        "warm": face_gate.is_warm(),
    }


@app.post("/auth/enroll")
def auth_enroll(req: FaceEnrollIn) -> dict:
    from . import face_gate
    try:
        saved = face_gate.enroll(req.name, req.image)
    except face_gate.FaceGateError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    return {"enrolled": saved, "operatives": face_gate.enrolled_names()}


@app.post("/auth/verify")
def auth_verify(req: FaceVerifyIn) -> dict:
    from . import face_gate
    try:
        r = face_gate.verify(req.image)
    except face_gate.FaceGateError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    return {
        "granted": r.granted,
        "identity": r.identity,
        "distance": r.distance,
        "threshold": r.threshold,
        "reason": r.reason,
    }


# -- static assets + frontend ------------------------------------------------
# Mount order matters: specific prefixes first, the catch-all "/" mount last.
_ROOT = Path(__file__).resolve().parent.parent
_FRONTEND = _ROOT / "frontend"
_MEDIA = _ROOT / "media"
_IMAGES = _MEDIA / "images"

if _IMAGES.is_dir():
    app.mount("/images", StaticFiles(directory=str(_IMAGES)), name="images")
if _MEDIA.is_dir():
    app.mount("/media", StaticFiles(directory=str(_MEDIA)), name="media")
if _FRONTEND.is_dir():
    # html=True serves index.html at "/" and resolves /investigate.html, /css/*, /js/*.
    app.mount("/", StaticFiles(directory=str(_FRONTEND), html=True), name="frontend")
