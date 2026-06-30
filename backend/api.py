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

import os
from functools import lru_cache
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
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
def investigate(req: InvestigateIn) -> dict:
    try:
        pack = get_wolfpack()
    except CogneeError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    result = pack.investigate(req.question, top_k=req.top_k)
    return result.to_dict()


@app.post("/validate")
def validate(req: ValidateIn) -> dict:
    """Fact-check a clue against the Cognee case memory -> true | false | unknown."""
    try:
        pack = get_wolfpack()
    except CogneeError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    return pack.validate(req.text)


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
    return {"available": face_gate.is_available(), "enrolled": face_gate.enrolled_names()}


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
