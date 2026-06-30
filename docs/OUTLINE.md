# Hangover Berlin — Hackathon Outline
### "Where's My Context? (Where's My Dog?)"

**Team:** Cloud Sailor
**Hackathon:** The Hangover Part AI — Cognee × WeMakeDevs (June 29 – July 5, 2026)
**Tagline:** *Four guys. One missing dog. A gym code tattooed on her belly. Zero memory. One AI that never forgets.*

---

## 1. Why This Wins (Thematic Alignment)

The official hackathon theme is **"The Hangover Part AI: Where's My Context?"** — build *AI that doesn't forget* using Cognee's hybrid graph-vector memory layer. Our concept is a 1:1 metaphor:

- **The hangover = lost context.** The guys woke up in Berlin with no memory of last night.
- **The missing dog Pinky = the lost goal/entity** that must be recovered — and she literally carries the key: a gym-locker code tattooed on her belly.
- **Cognee = the one thing that remembered.** Our agent reconstructs the night from scattered "evidence" (texts, photos, receipts, a tattoo-parlor receipt, locations) stored in a knowledge graph, and reasons its way to Pinky — and the locker code — at the **gymnasium**.

The judges' theme is memory; our entire UX *is* memory reconstruction. That's the hook.

---

## 2. The Product

**"Wolfpack Recall"** — an AI detective app where **four distinct AI personalities** (the wolfpack) argue, recall, and reconstruct a lost night to find the missing dog Pinky (and the gym-locker code tattooed on her belly). It uses Cognee to:
1. **`remember()`** every scrap of evidence (messages, receipts, photos, GPS pings, witness quotes) into a knowledge graph + vector store on Cognee Cloud.
2. **`recall()`** connected entities and timelines to answer "where is Pinky, and what's the code?"
3. **`improve()`** the graph as new clues are added — the trail sharpens in real time.
4. **`forget()`** red herrings / contradicted facts (the "false leads" mechanic).

The user plays the role of the hungover wolfpack, feeding in clues; the four personalities narrate the reconstruction, disagree, and progressively triangulate Pinky's location to the gymnasium — where her belly tattoo opens the locker.

### 2a. The Four Personalities (multi-agent wolfpack)

Each is a separate Claude-driven persona with its own voice, reading from the **shared** Cognee memory graph (showcasing one memory layer, four consumers):

| Persona | Archetype | Role in the reasoning |
|---------|-----------|----------------------|
| **The Planner** | level-headed organizer | structures the timeline, drives `recall()` queries |
| **The Wildcard** | chaotic instigator | proposes wild theories (some are the red herrings → `forget()`) |
| **The Worrier** | anxious skeptic | demands evidence, cross-checks the graph, catches contradictions |
| **The Optimist** | confident dreamer | makes the intuitive leap that cracks the case (gymnasium) |

The interplay is the UX *and* the comedy — and it's a strong "Creativity & Innovation" + "User Experience" play for judges.

### 2b. AI-Generated Video Cards (the "founder cameo")

Open-source AI video generation produces short **"video cards"** that punctuate the demo — styled as messages from the **Cognee founder** narrating/cheering the investigation (a face-swap / "super fake" cameo done with **open-source models**, clearly framed as a playful homage, not impersonation). This is our primary **Best Use of Open Source** hook.

- Pipeline: open-source talking-head / face-swap (e.g. SadTalker / Wav2Lip / face-fusion-class tools) + open-source TTS for the voice.
- Optional managed fallback via fal.ai (Veo/Kling/Seedance) if open-source quality/time is tight — but open-source is the headline.
- **Consent/ethics note:** get explicit OK from the founder (or use a stylized avatar) and label the clips as AI-generated parody. Keeps us safe and on-brand for a memory hackathon.

---

## 3. Target Tracks

| Track | Plan |
|-------|------|
| **Best Use of Cognee Cloud** (iPhone 17 / cash) | Primary submission — run on Cognee Cloud Developer plan, lean on hosted graph-vector memory. |
| **Best Use of Open Source** (MacBook Neo / cash) | Stretch: ship a self-hosted Cognee variant + open-source the agent harness so we qualify for both. |
| **Best Blogs** (Keychron) | Write the build journey: "Teaching an AI to survive a hangover." |
| **Social Buzz** (top 10 posts) | Meme the dog hunt + the belly-tattoo code across the build week. |
| **Open Source PRs** ($100 each, max 5/person) | Real fixes/docs PRs into the Cognee repo during the week. |

> Judging criteria to optimize for: Potential Impact, Creativity & Innovation, Technical Excellence, **Best Use of Cognee**, User Experience, Presentation Quality.

---

## 4. Narrative Arc (Demo Script)

**Act 1 — The Wake-Up (Confusion).**
Cold open: the four wake up in a trashed Berlin apartment. Their dog "Pinky" is gone — and someone mutters that "the code" was put *on the dog* last night. Empty graph = empty memory. *"We don't remember anything."*

**Act 2 — Feeding the Memory (Ingestion).**
Players dump evidence into the app. Each item is `remember()`-ed and appears as nodes/edges in the Cognee graph: a bar receipt, a blurry photo, a stranger's number, a FlixBus ticket to Serbia, a dog-show flyer.

**Act 3 — The Recall (Reasoning).**
The agent `recall()`s across the graph, builds the timeline, and surfaces connections: receipt → bar → tattoo-parlor receipt ("code on the dog's belly") → dog-show flyer → Markus's "locker 7, code's on the dog" text → the gymnasium.

**Act 4 — False Leads (`forget()`).**
A contradicting clue (Pinky "spotted at the zoo") gets refuted by graph evidence and `forget()`-ten. Bonus: the graph distinguishes the *dog* Pinky from an unrelated "Pinky" node, so the false lead collapses. Shows the memory layer self-correcting.

**Act 5 — The Reveal.**
Agent concludes: **"Pinky is at the dog show in the gymnasium — and the locker code is tattooed on her belly."** Cut to the dog; flip her over; punch in the code; locker 7 opens. Wolfpack reunited. Memory restored.

---

## 5. Technical Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Frontend (web UI)                                        │
│  - Evidence intake (text / photo / receipt upload)        │
│  - Live knowledge-graph visualization                     │
│  - Detective chat + timeline reconstruction               │
└───────────────┬─────────────────────────────────────────┘
                │ REST
┌───────────────▼─────────────────────────────────────────┐
│  Agent Layer (Python)                                     │
│  - Claude (Opus 4.x) reasoning / narration                │
│  - Orchestrates the 4 Cognee ops                          │
│    remember() · recall() · improve() · forget()           │
└───────────────┬─────────────────────────────────────────┘
                │
┌───────────────▼─────────────────────────────────────────┐
│  Cognee Memory Layer (hybrid graph + vector)              │
│  - Cloud Developer plan (primary)                         │
│  - Self-hosted fallback (open-source track)               │
└──────────────────────────────────────────────────────────┘
```

**Existing repo assets to build on:** `cognee_client.py`, `app.py`, `cloud_v1_quickstart.py`, `.env` (Cognee Cloud base/service URLs + API keys already wired in prior session).

**Stack choices**
- **Memory:** Cognee Cloud (`COGNEE_BASE_URL` tenant already provisioned).
- **Reasoning:** Claude API (Opus 4.x) for narration + entity extraction.
- **Backend:** Python (FastAPI) — extend current `app.py`.
- **Frontend:** lightweight web UI + graph viz (e.g. vis-network / Cytoscape).
- **Open-source angle:** Dockerized self-hosted Cognee + published agent harness.

---

## 6. Cognee Mapping (the "Best Use" story)

| Hangover beat | Cognee operation | What it demonstrates |
|---------------|------------------|----------------------|
| Collecting clues | `remember()` | Multi-modal ingestion into one graph |
| Connecting the night | `recall()` | Hybrid graph + vector retrieval, entity linking |
| Trail sharpens | `improve()` | Memory refinement over time |
| Debunking red herrings | `forget()` | Contradiction handling / controlled forgetting |

Every plot beat is a deliberate showcase of one core API — this is what scores "Best Use of Cognee."

---

## 7. Build Plan (June 29 – July 5)

| Day | Milestone |
|-----|-----------|
| **Day 1 (Sat 6/29)** | Lock scope, confirm Cognee Cloud connectivity, seed the demo dataset (the "evidence pack"). |
| **Day 2** | Ingestion pipeline: `remember()` for text/photo/receipt → graph nodes. |
| **Day 3** | Reasoning agent: `recall()` + Claude narration → timeline reconstruction. |
| **Day 4** | `improve()` / `forget()` mechanics + graph visualization in UI. |
| **Day 5** | Polish UX, scripted demo flow, edge-case handling. |
| **Day 6** | Record demo video, write README, write the blog post, schedule social posts. |
| **Day 7 (Sat 7/5)** | Final QA, submit. Land any open-source PRs. |

---

## 8. Deliverables (for max points)

- [ ] Working app on Cognee Cloud (Best Use of Cognee Cloud)
- [ ] Self-hosted/open-source variant (Best Use of Open Source)
- [ ] Polished README with architecture diagram + setup
- [ ] 2–3 min demo video following the Act 1–5 script
- [ ] Blog post: the build journey (Best Blogs track)
- [ ] 8–10 themed social posts across the week (Social Buzz)
- [ ] 1–5 real PRs into the Cognee repo (Open Source PR track, $100 each)

---

## 9. Stretch Ideas

- **Voice mode:** narrate clues like the guys are talking to the agent ("Bro, I found a receipt...").
- **"Doug-meter":** countdown urgency UI (riffing on the films' missing-friend trope).
- **Shareable case file:** export the reconstructed graph as a shareable "what happened last night" report — natural social-buzz fuel.
- **Multiplayer:** all four "wolfpack" members feed clues into the same shared memory graph.

---

## 11. Full Cognee Surface — Integrate EVERYTHING (the win strategy)

The judging rubric explicitly rewards **"Best Use of Cognee."** Most teams will use only `add()` + one search call. We win by deliberately exercising Cognee's *entire* product surface, with each capability justified by a story beat. Below is the full menu and how we map it.

### 11a. Memory-native API (the 4 ops)
`remember()` · `recall()` · `improve()` · `forget()` — already our Act structure. Plus the lower-level pipeline: **`cognee.add()` → `cognee.cognify()` → `cognee.search()` → `cognee.prune()`** for fine control during ingestion.

### 11b. All retrieval modes (14 of them) — use a *spread*, not just one
Cognee ships ~14 search types. We deliberately route different questions to different modes and **show the mode used** in the UI (huge "Best Use" signal):

| Search type | Where we use it |
|-------------|-----------------|
| `GRAPH_COMPLETION` | Main detective answer: "Where is Pinky and what's the code?" (chain-of-thought graph traversal) |
| `RAG_COMPLETION` | Quick fact lookups from raw clue text |
| `INSIGHTS` | "Show how the bar, the tattoo, and the gym connect" — relationship surfacing |
| `CHUNKS` | Raw evidence retrieval for the evidence panel |
| `SUMMARIES` | "Recap last night in 3 lines" per personality |
| Multi-hop / graph traversal | The actual deduction path to the gymnasium |
| Temporal / timeline | Reconstruct the night in order |

### 11c. Custom graph schema (Pydantic DataPoints) — *this is the differentiator*
Instead of letting Cognee auto-extract generically, we define a **domain ontology** with custom data models:
`Person` (wolfpack + strangers), `Dog` (Pinky), `Location` (bar, tattoo parlor, U-Bahn, apartment, gymnasium), `Clue/Evidence`, `Event`, `Code` (the belly-tattoo locker code). This produces a clean, demo-ready graph and shows mastery of Cognee's typed-graph API.

### 11d. Ontology grounding
Load a small custom **Hangover ontology** (OWL/RDF) so Cognee does ontology-based entity validation + BFS expansion — canonicalizing "the gym" / "the school" / "Karlovci Gymnasium" / "Karlovačka gimnazija" to one node. Directly shows off Cognee's signature ontology feature (and disambiguates the school-vs-sports-hall "gymnasium" pun).

### 11e. node_sets / data categories — per-personality memory views
Tag memories into node_sets so each of the 4 personalities can `recall()` a **filtered view** of the shared graph (e.g. the Worrier only trusts verified evidence). One graph, four lenses — strong creativity + technical signal.

### 11f. Multimodal ingestion
Feed **receipt photos, a blurry party photo, and a voice memo** through Cognee's multimodal pipeline — not just text. Visually impressive in the demo and a genuine capability flex.

### 11g. `improve()` with feedback loop
When the user confirms/rejects a deduction, feed it back via `improve()` so the trail measurably sharpens — demonstrates the "self-improving memory" headline.

### 11h. Integrations to layer in
- **MCP server** (stdio/SSE/HTTP) — expose the Pinky-case memory as an MCP tool; mention Claude Code can query it live. (The Cognee Claude Code plugin is already installed in this environment.)
- **LangGraph / OpenAI Agents SDK** — orchestrate the 4 personalities as a multi-agent graph over shared Cognee memory.
- **TypeScript client `@cognee/cognee-ts`** — call Cognee directly from the web frontend for the live graph viz.
- **n8n** — an automation that ingests "new clue" webhooks into memory (shows ecosystem breadth; optional).

### 11i. Backends to showcase
- **Cognee Cloud** (managed, pgvector) = primary memory + vector DB → **Best Use of Cognee Cloud**.
- **Self-hosted Docker + Kuzu/Neo4j** graph backend for the open-source variant → **Best Use of Open Source**, and Neo4j/Kuzu gives us a gorgeous graph to render.

### 11j. Proof points to cite in README/demo
Reference Cognee's **BEAM benchmark** (0.79 @ 100K tokens vs 0.735 baseline) to frame *why* graph memory beats plain RAG — ties our fun demo to real technical substance for the judges.

---

## 12. Other Winning Integrations (beyond Cognee)

- **Open-source video cameo pipeline** (SadTalker/Wav2Lip + open TTS) → anchors the Open Source track.
- **Voice in/out:** Whisper (open-source) for voice-memo clues → fits multimodal + accessibility.
- **Real-time graph animation** as clues connect (the "aha" moment on screen).
- **Shareable "What Happened Last Night" case-file export** (PDF/web) → built-in Social Buzz fuel.
- **Blog + social cadence** baked into the build week → Best Blogs + Social Buzz tracks.
- **1–5 real PRs** into the Cognee repo (docs/examples for the Pinky use case) → Open Source PR track ($100 each).

> **Scorecard coverage:** Impact (real graph-memory thesis), Creativity (4 personas + dog hunt + tattooed-code twist), Technical Excellence (custom schema + ontology + 14 modes + multimodal), Best Use of Cognee (full surface), UX (web + graph viz + video), Presentation (scripted Act 1–5 demo). We aim to hit **all six** criteria explicitly.

---

## 13. Open Questions / Decisions

1. **Cloud vs. open-source primary** — submit to both tracks or focus one? (Recommend: Cloud primary, OS as a packaged bonus.)
2. **Frontend depth** — full web UI vs. CLI + graph screenshots for the demo?
3. **Evidence realism** — hand-author the demo dataset vs. let judges add live clues?
