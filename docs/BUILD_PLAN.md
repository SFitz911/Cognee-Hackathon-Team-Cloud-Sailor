# Hangover Berlin — Detailed Build Plan
### "Wolfpack Recall" — Team Cloud Sailor

> Companion to [HANGOVER_BERLIN_OUTLINE.md](HANGOVER_BERLIN_OUTLINE.md). This is the executable build: every phase, step, file, and data model.

---

## 0. Architecture at a glance

```
Browser (web UI + graph viz)
        │  REST / SSE
        ▼
FastAPI backend  (backend/api.py)
        │
        ├── Wolfpack orchestrator (backend/wolfpack.py)
        │       └── 4 personalities (backend/personalities.py)  ← Claude (Opus 4.x)
        │
        ├── Cognee memory (cognee_client.py)  ← Cognee Cloud (vector + graph)
        │       remember() · recall() · (improve/forget)
        │
        └── Media service (backend/media.py)  ← open-source video cameo (later phase)
```

**Reuse:** existing `cognee_client.py` (stdlib REST client: `remember`, `recall`, `wait_for_cognify`) and `.env` (Cognee Cloud `COGWIT_API_BASE` / `COGWIT_API_KEY` already wired). We add a thin layer on top — no rewrite.

---

## 1. Domain model (the case)

**Setting:** Four friends wake up in a trashed Berlin apartment. Their dog **Pinky** is missing. During the night they drunkenly had a numeric code tattooed on Pinky's belly — and that code opens locker 7 at the **Karlovci Gymnasium (Karlovačka gimnazija, founded 1791) in Sremski Karlovci, Serbia**, where "the prize" is locked. The twist: the gym isn't in Berlin at all — the night ended on a FlixBus to Serbia. Finding Pinky is finding the code. They reconstruct the night from clues to recover the dog and open the locker.

**Core entities** (drive the custom Cognee graph schema later):
- `Person` — Planner, Wildcard, Worrier, Optimist + strangers (bartender, "Locker Guy" Markus)
- `Dog` — Pinky (the goal entity; carries the tattooed code)
- `Location` — apartment, bar, tattoo parlor, U-Bahn station, gymnasium
- `Clue` — receipt, photo, voice memo, ticket stub, flyer, tattoo
- `Event` — timeline beats ("03:10: tattoo applied")
- `Code` — the belly-tattoo locker code that leads to the gym

**The 4 personalities** (each a Claude persona reading shared Cognee memory via its own `node_set` lens):

| Persona | Voice | Node-set lens | Job |
|---------|-------|---------------|-----|
| Planner | calm organizer | `verified` + `timeline` | structure the timeline, drive recall |
| Wildcard | chaotic | `all` | throw out wild theories (some = red herrings) |
| Worrier | anxious skeptic | `verified` only | demand evidence, catch contradictions |
| Optimist | confident | `all` | make the intuitive leap to the gym |

---

## 2. Phases & steps

### Phase 1 — Backend skeleton + 4 personalities  ← STARTING NOW
**Goal:** running FastAPI server that ingests clues into Cognee and produces a 4-voice investigation.

1. `backend/personalities.py` — define the 4 personas (name, system prompt, node_set, temperature).
2. `backend/wolfpack.py` — orchestrator: pull Cognee context via `recall()`, run each persona through Claude, return structured turn-by-turn output.
3. `backend/api.py` — FastAPI endpoints:
   - `GET /health` — tenant + key check
   - `POST /clues` — ingest a clue (`remember()` into a node_set)
   - `POST /investigate` — run the wolfpack on a question, return 4 persona responses + the deduction
   - `GET /memory/search` — raw `recall()` passthrough (debug/graph panel)
4. `requirements.txt` — add `fastapi`, `uvicorn`, `anthropic`, `python-multipart`.
5. Smoke test: `uvicorn backend.api:app --reload`, hit `/health`, ingest a clue, investigate.

### Phase 2 — Custom Cognee graph schema + ontology
1. Define Pydantic DataPoint models for the 6 entities.
2. Load a small Hangover ontology (canonicalize gym/school/"Karlovci Gymnasium"/"Karlovačka gimnazija").
3. Switch ingestion to typed extraction; verify graph shape.

### Phase 3 — Retrieval-mode spread
1. Map questions → search types (`GRAPH_COMPLETION`, `INSIGHTS`, `SUMMARIES`, temporal).
2. Surface "mode used" in API responses (judges love this).

### Phase 4 — Multimodal ingestion
1. Receipt/photo upload → Cognee multimodal.
2. Voice memo → Whisper (open-source) → text clue.

### Phase 5 — Frontend (web UI + live graph viz)
1. Evidence intake panel, 4-persona chat, timeline.
2. Live knowledge-graph render (Cytoscape/vis-network) via `@cognee/cognee-ts` or backend proxy.
3. Real-time edge animation as clues connect.

### Phase 6 — Video cameo (open-source "super fake")
1. Founder cameo clips: SadTalker/Wav2Lip + open TTS (consent / stylized avatar).
2. fal.ai fallback. Clearly labelled AI parody.

### Phase 7 — `improve()` / `forget()` mechanics
1. User confirm/reject → `improve()`; contradicted clue → `forget()`.
2. Show the trail sharpening.

### Phase 8 — Open-source variant
1. Dockerized self-hosted Cognee + Neo4j/Kuzu backend.
2. Open-source the agent harness → Best Use of Open Source track.

### Phase 9 — Submission polish
1. README + architecture diagram + BEAM benchmark framing.
2. 2–3 min demo video (Act 1–5 script).
3. Blog post + social posts + Cognee PRs.

---

## 3. File layout (target)

```
Cognee-Hackathon-Team-Cloud-Sailor/
├── cognee_client.py          # existing — Cognee Cloud REST client (reused)
├── app.py                    # existing — CLI (kept for quick demos)
├── backend/
│   ├── __init__.py
│   ├── personalities.py      # Phase 1 — the 4 personas
│   ├── wolfpack.py           # Phase 1 — orchestrator
│   ├── api.py                # Phase 1 — FastAPI app
│   ├── schema.py             # Phase 2 — Pydantic DataPoints + ontology
│   └── media.py              # Phase 6 — video cameo service
├── frontend/                 # Phase 5 — web UI + graph viz
├── data/seed_clues.json      # demo evidence pack
├── requirements.txt
├── HANGOVER_BERLIN_OUTLINE.md
└── BUILD_PLAN.md
```

---

## 4. Environment / secrets

`.env` (already present, do not commit):
- `COGWIT_API_BASE` / `COGWIT_API_KEY` (or `COGNEE_BASE_URL` / `COGNEE_API_KEY`) — Cognee Cloud
- `COGNEE_DATASET` — defaults to `cloud_sailor_memory`
- `ANTHROPIC_API_KEY` — needed for the 4 personalities (Phase 1)

---

## 5. Acceptance per phase
- **Phase 1 done when:** `/investigate` returns 4 distinct persona voices grounded in clues pulled from Cognee, and `/clues` successfully `remember()`s into a node_set.
- Each later phase has its own check in §2.
