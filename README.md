# 🐕 Wolfpack Recall — *Hangover 4: Berlin*

> **"Build AI that doesn't forget."** — Cognee × WeMakeDevs Hackathon · **Team Cloud Sailor**

## ▶️ Try it live (no setup)

### 👉 **https://wolfpack-recall.onrender.com**

📱 **Works great on your iPhone / Android too — give it a try!** *(The mobile experience
is in **beta**, so a few things may look slightly off on small screens — but the full
5-page story is playable end to end on a phone.)*

**Judges: it's deployed and fully playable in your browser.** Walk the 5-page story
end to end — hit **🕵️ Auto Detective** to solve the case in one click (or investigate
manually), watch the founder talk (real lip-synced video), crack the code, scan your
face, win the dog show, and explore the **live Cognee knowledge graph**. There's a
free, no-login **"Ask AI agent about Cognee"** guide on the last page (with an optional
one-tap free-AI upgrade).

*(Face ID uses your camera and only works over HTTPS — the Render URL qualifies. If a
public HF Space is briefly rate-limited, the app degrades gracefully; nothing blocks.)*

---

## What it is

Four friends wake up in a trashed Berlin apartment with **no memory** of last night.
Their dog **Pinky** is gone — and the code to a locker at the **Karlovci Gymnasium in
Sremski Karlovci, Serbia** is tattooed on her belly. Using **Cognee** as the brain,
four AI personalities reconstruct the night, recover Pinky, crack the code, get inside,
and win the dog show.

It's a **playable metaphor for the hackathon theme**: the hangover *is* lost context,
and **Cognee is the memory that survived**. Every clue, character, and location lives in
a real Cognee knowledge graph — and the app *shows you that graph*.

---

## The 5-page journey

| Page | What happens | Cognee / tech on display |
|------|--------------|--------------------------|
| **1 · Intro** | AI movie poster, brief mission, who's-who, "what happens" | AI image gen (FLUX) |
| **2 · Investigation** | Add clues → they're `remember()`-ed into Cognee. Ask **4 AI personalities** who reason over Cognee's `GRAPH_COMPLETION`. Mark clues ✓/✗ or **🔍 fact-check against memory** (green/red). Pinky walks a storyline route as clues are confirmed. | `remember` · `recall` · `GRAPH_COMPLETION` · fact-check vs memory · node_sets |
| **3 · Access** | Reunion video (Pinky reveals the belly code **8675309**) + **Founder chat (Chow mode)** → enter the code → **facial-recognition scan** (DeepFace). Unlocks on code **and** face. | DeepFace face recognition · accented TTS |
| **4 · Success** | "You're in" → the **dog-show winning video** plays | AI video |
| **5 · Cognee** | The **live, real Cognee knowledge graph** (Cognee's own UI, embedded), toggle vs our storyline map, switch datasets. Free **no-login "Ask AI agent about Cognee"** guide (+ optional one-tap free-AI upgrade). | Cognee `visualize` graph · datasets · built-in guide + **free Puter.js AI** |

---

## 🧠 Cognee — used across its whole surface (the "Best Use of Cognee" story)

Most teams call `add()` + one search. We exercise Cognee deeply:

- **Memory-native API** — `remember()` (ingest + cognify) and `recall()` throughout.
- **`GRAPH_COMPLETION`** — a broad recall fuses *every* clue into one grounded answer;
  the 4 personas reason over it. The graph even **disambiguated** dog-Pinky from an
  unrelated "person Pinky" node, letting all four independently debunk a false lead.
- **Fact-checking against memory** — the **🔍 check** button asks Cognee whether a new
  statement is `true / false / unknown` vs the established graph (green/red on the node).
- **Datasets we created on Cognee Cloud:**
  - **`pinky_serbia`** — the live case memory (the whole investigation graph).
  - **`mr_chow`** — the Mr. Chow character dataset (1,000 lines) ingested as its own graph.
  - (plus earlier `pinky_case`, `cloud_sailor_memory`, `hackathon_demo`).
- **Node_sets** (`verified` / `timeline` / `all`) — per-lens tagging of clues.
- **Ontology / Memory Schema** — `cognee/ontology.ttl` (Dog, Person, Location, Clue,
  Code, Event) to ground entities and unify "the gym / school / Karlovci Gymnasium".
- **Cognee Skill** — `cognee/skills/wolfpack-recall.md`, a procedural playbook in
  Cognee's Skill format.
- **The real graph, embedded** — Page 5 proxies Cognee Cloud's `visualize` endpoint and
  shows **Cognee's actual UI + graph** (dark mode, Schema tab), not a mockup. Switch
  datasets to explore each memory.
- **BEAM benchmark** framing — graph memory beats plain RAG on long-context recall.

See **`docs/COGNEE_SHOWCASE.md`** for the full mapping and pitch walkthrough.

---

## 🤖 Models & AI services used

| Purpose | Model / service | Open? | Cost model |
|---------|-----------------|-------|-----------|
| **Memory / knowledge graph** | **Cognee** (Cloud) | **Open source** | Free dev plan |
| 4 investigation personalities + fact-check | **Claude (Opus 4.x)** via Anthropic API | Proprietary | App key |
| **Movie poster** | **FLUX.1-schnell** via a free **Hugging Face Space** | **Open source** | Free (HF Space) |
| **Founder talking videos** | **Omni-Video-Factory** image-to-video HF Space | Open weights | Free (HF Space) |
| **Real lip-sync** (founder mouths the lines) | **fal.ai `sync-lipsync`** | Hosted | ~cents/clip |
| **Accented "Mr. Chow" voice** | **edge-tts** (Microsoft Neural, `zh-CN-YunxiNeural`) | **Free/open** | Free, keyless |
| **Facial recognition gate** | **DeepFace** (SFace + OpenCV) | **Open source** | Free, local |
| **"Ask AI agent about Cognee"** guide | Built-in guide (free, no login) + optional **Puter.js** free AI (GPT-4o-mini) | Free, keyless | **User-pays — $0 to us** |

**Why these choices:** we leaned on **free/open** tooling wherever possible (HF Spaces,
edge-tts, DeepFace, Puter) so the app is reproducible and cheap, and reserved paid calls
(fal.ai lip-sync) for the one thing open Spaces couldn't do reliably.

---

## 🔐 What actually happens during the face scan (Page 3)

The Access page uses **real facial recognition**, not a gimmick — and it's worth
knowing exactly what it does (and doesn't) do:

1. **Capture** — your browser grabs a single webcam frame locally and sends it to
   our own backend (over HTTPS). It is **never sent to any third-party face API**.
2. **Detect** — the server runs **open-source [DeepFace](https://github.com/serengil/deepface)**
   with an **OpenCV** detector to find a face in the frame. On **enroll** we reject
   the photo if no clear face is found, so you don't get saved with a bad reference.
3. **Embed & match** — the **SFace** neural network turns the face into a numeric
   embedding (a "faceprint") and compares it to the enrolled gallery by distance.
   Under the model's threshold → **access granted**; over it → **denied**.
4. **Storage** — the reference image lives only in the app's local `media/faces/`
   folder (git-ignored PII). Your face is **not** stored in Cognee or any database.

**Why it sometimes takes a second:** the delay is the **open-source DeepFace model
computing locally** — and the **first** scan is slowest because the model weights
load into memory. **It is *not* a Cognee/database lookup** (Cognee stores the *case*
memory — clues, characters, locations — never faces). After the first scan it's quick.

### The slow-first-scan bug — how we found it and fixed it

**Symptom.** During testing the *first* face scan after a fresh deploy took several
seconds, which felt like the app was "calling out" to a slow service.

**Diagnosis.** We traced the request path and confirmed the face gate makes **zero
network calls** — no HuggingFace, no fal.ai, no Cognee, no database. So the time was
pure server-side compute on Render. It broke down into three parts:
1. **Render cold start** — if the instance had spun down while idle, the request first
   waits for the container to wake (this is a hosting-tier behaviour, not our code).
2. **First-scan model load** — even though the SFace weights are **pre-baked into the
   Docker image** at build time, TensorFlow + the model still had to load into RAM the
   *first* time a scan ran after each restart. This was the dominant, fixable cost.
3. **CPU inference** — Render has no GPU, so each match is a couple seconds of CPU work.

**Fix.** On server **startup** we now preload the SFace model in a background thread
(`face_gate.warm_up()` fired from a FastAPI startup event), so the heavy one-time load
happens at boot instead of on the first user's scan. `GET /auth/status` reports a
`warm` flag, and the Access page shows **"warming up the model…"** → **"scanner ready —
fast scans"** so users know the state. We also **pre-download the weights in the
Dockerfile** so nothing is fetched at runtime.

**Remaining caveat.** On a hosting tier that lets the instance sleep when idle, the
very first request after a sleep still pays the container wake-up (Render cold start).
Keeping the instance always-on removes that; the model warm-up above removes the rest.

**Getting a clean match:** look straight at the camera, keep your head level (don't
tilt or turn), **remove glasses/hats**, and use good, even lighting so your face
fills the frame. Glasses, sharp angles, or backlighting are the usual reasons a scan
is denied — the app now tells you this on screen when a face can't be read.

---

## 🛠️ Techniques & engineering

- **Multi-agent reasoning** — four distinct Claude personas (Planner / Wildcard / Worrier /
  Optimist) reason concurrently over one shared Cognee memory, each with a node-set lens.
- **Audio-driven lip-sync** — instead of matching lips to text, we feed the founder video +
  our accented MP3 into fal.ai so his lips match *our* voice (audio baked in).
- **Latency hiding** — a committed **pool** of pre-generated videos plays instantly; no waits.
- **Live knowledge-graph embed** — server-side proxy of Cognee's `visualize` so the API key
  stays hidden and the iframe dodges `X-Frame-Options`; post-processed to open dark + Schema.
- **Web Audio reactive avatar** — the cameo's sound bars react to real audio amplitude.
- **Graceful degradation** — every external dependency (DeepFace, HF Spaces, Puter) falls
  back cleanly so a demo never dead-ends.
- **"Ask AI agent about Cognee"** — a no-login AI agent on Page 5 answers questions
  about Cognee (what it is, remember/recall, GRAPH_COMPLETION, datasets, MCP) and helps
  visitors who are stuck. It runs on a built-in guide by default (free, instant, works
  on any device); a one-tap opt-in loads **Puter.js** free AI (GPT-4o-mini, client-side,
  zero cost to us) for deeper answers, and it gracefully falls back to the guide.

---

## 🏗️ Architecture

```
Browser  (5 narrative pages · vis-network · Puter.js chat)
   │  REST
FastAPI backend  (backend/api.py)
   ├── Wolfpack orchestrator (backend/wolfpack.py) ─ 4 Claude personas + fact-check + guide
   ├── Cognee client (backend/cognee_client.py) ─ Cognee Cloud: remember · recall · visualize
   ├── Face gate (backend/face_gate.py) ─ DeepFace enroll/verify
   └── Cameo video pool (backend/video_gen.py)
Cognee Cloud  = the brain (datasets · ontology · graph · skills)
```

## Project structure

```
backend/    api.py · wolfpack.py · cognee_client.py · personalities.py · face_gate.py · video_gen.py
frontend/   index.html · investigate.html · security.html · success.html · graph.html
            css/styles.css   js/{common,landing,investigate,security,graph,cameo}.js
cognee/     ontology.ttl · skills/wolfpack-recall.md
data/       seed_clues.json · mr_chow_responses.csv
media/      images (poster, Pinky, cast) · clips (talking + lip-synced + story videos) · audio (Chow TTS)
scripts/    seed.py · gen_poster*.py · gen_founder_video.py · gen_lipsync_fal.py · gen_chow_audio.py · ingest_chow.py
docs/       OUTLINE.md · BUILD_PLAN.md · COGNEE_SHOWCASE.md · DEPLOY.md
```

## Run locally

```bash
python -m pip install -r requirements.txt
cp .env.example .env          # add Cognee + Anthropic keys
python scripts/seed.py        # seed the case into Cognee (--ask to demo)
uvicorn backend.api:app --reload   # http://127.0.0.1:8000
```

Deploy: `render.yaml` Blueprint (Docker) — see `docs/DEPLOY.md`.

## Tracks targeted
Best Use of Cognee Cloud · Best Use of Open Source · Best Blogs · Social Buzz.

---

## Tech, in one line
**Cognee Cloud** (memory graph) · **Claude Opus 4.x** (agents) · **DeepFace** (face ID) ·
**FLUX.1-schnell** + **Omni-Video-Factory** (HF Spaces) · **fal.ai sync-lipsync** ·
**edge-tts** · **Puter.js** · **FastAPI** · **vis-network** · **Docker/Render**.

*Team Cloud Sailor · Cognee × WeMakeDevs · 2026*
