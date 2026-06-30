# 🐕 Wolfpack Recall — *Hangover 4: Berlin*

> **"Build AI that doesn't forget."** — Cognee × WeMakeDevs Hackathon
> **Team Cloud Sailor**

Four friends wake up in a trashed Berlin apartment with no memory of last night. Their
dog **Pinky** is gone — and the only copy of a locker code is **tattooed on her belly**.
The locker is at the **Karlovci Gymnasium in Sremski Karlovci, Serbia** (they're not even
in the right country). To find Pinky, they must reconstruct the night.

**Wolfpack Recall** is an AI detective app where **four distinct AI personalities** argue
and reason over a shared **Cognee** knowledge graph to piece the night back together. It's
a playable metaphor for the hackathon theme: the hangover *is* lost context, and Cognee is
the memory that survived.

---

## How it works

```
Browser (landing + investigation pages, live discovery-map graph)
   │  REST
FastAPI backend  (backend/api.py)
   ├── Wolfpack orchestrator (backend/wolfpack.py) ─ 4 personas via Claude (Opus 4.x)
   └── Cognee memory client  (backend/cognee_client.py) ─ Cognee Cloud (vector + graph)
        remember() · recall() · cognify
```

- **Cognee Cloud** stores every clue as a hybrid vector + knowledge-graph memory.
- A broad `recall()` returns a **GRAPH_COMPLETION** that fuses all clues; the four personas
  reason over it, disagree, and converge on the answer (debunking the Berlin Zoo red herring).
- The frontend graph is a **discovery map**: connections start dim and light up with a
  pulsing green glow as each clue lands — drawing the path to the gym while showing what's
  still unknown.

## Project structure

```
.
├── backend/              # FastAPI app + Cognee client + the 4 personalities
│   ├── api.py            #   REST endpoints + static serving
│   ├── wolfpack.py       #   orchestrator (recall -> 4 personas -> result)
│   ├── personalities.py  #   Planner · Wildcard · Worrier · Optimist
│   └── cognee_client.py  #   stdlib Cognee Cloud REST client
├── frontend/             # multi-page web UI (gated flow: landing → face gate → investigation)
│   ├── index.html        #   Page 1 — landing / movie poster
│   ├── security.html     #   Page 3 — facial-recognition gate (DeepFace)
│   ├── investigate.html  #   Page 2 — the investigation (requires access)
│   ├── css/styles.css
│   └── js/               #   common.js · landing.js · security.js · investigate.js
├── media/                # resources (served at /media and /images)
│   ├── images/           #   stills: poster, Pinky, cast headshots
│   ├── clips/            #   movie clips (the films we produce)
│   ├── posters/          #   poster variants
│   └── audio/            #   voice memos / TTS
├── data/seed_clues.json  # the case clue pack
├── scripts/              # seed.py · gen_poster.py · gen_poster_hf.py
├── docs/                 # OUTLINE.md · BUILD_PLAN.md
└── archive/              # earlier prototypes (kept for reference)
```

## Quick start

```bash
# 1. Install
python -m pip install -r requirements.txt

# 2. Configure
cp .env.example .env        # then fill in Cognee + Anthropic keys

# 3. Seed the case into Cognee (waits for cognify)
python scripts/seed.py            # add --ask to print a demo investigation

# 4. Run the app
uvicorn backend.api:app --reload
# open http://127.0.0.1:8000
```

## Scripts

| Script | What it does |
|--------|--------------|
| `scripts/seed.py` | Loads `data/seed_clues.json` into Cognee (`--ask` runs the wolfpack) |
| `scripts/gen_poster_hf.py` | Generates the movie poster via a **free public Hugging Face Space** (FLUX.1-schnell) |
| `scripts/gen_poster.py` | Poster via OpenAI images (needs `OPENAI_API_KEY` with credit) |

## Tech

Cognee Cloud · FastAPI · Claude (Opus 4.x) · vis-network · FLUX.1-schnell (Hugging Face)
