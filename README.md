# 🐕 Wolfpack Recall — *Hangover 4: Berlin*

> **"Build AI that doesn't forget."** — Cognee × WeMakeDevs Hackathon · **Team Cloud Sailor**

## ▶️ Try it live (no setup)

### 👉 **https://wolfpack-recall.onrender.com**

**Judges: it's deployed and fully playable in your browser.** Walk the 5-page story
end to end — investigate the case, watch the founder talk (real lip-synced video),
crack the code, scan your face, win the dog show, and explore the **live Cognee
knowledge graph**. There's even a free **"Ask about Cognee"** chatbot on the last page.

*(Face ID uses your webcam and only works over HTTPS — the Render URL qualifies. If a
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
| **5 · Cognee** | The **live, real Cognee knowledge graph** (Cognee's own UI, embedded), toggle vs our storyline map, switch datasets. **"Ask about Cognee"** help chatbot. | Cognee `visualize` graph · datasets · **free Puter.js chat** |

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
| **"Ask about Cognee" chatbot** | **Puter.js** free AI (GPT-4o-mini) | Free, keyless | **User-pays — $0 to us** |

**Why these choices:** we leaned on **free/open** tooling wherever possible (HF Spaces,
edge-tts, DeepFace, Puter) so the app is reproducible and cheap, and reserved paid calls
(fal.ai lip-sync) for the one thing open Spaces couldn't do reliably.

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
- **Free, keyless help chat** — Puter.js runs client-side so any visitor gets AI help at
  zero cost to us, with a static FAQ fallback.

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
