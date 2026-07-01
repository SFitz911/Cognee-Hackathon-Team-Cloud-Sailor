# Deploy & Ontology guide

## A. Deploy to Render (stable public URL)

The repo ships a Render **Blueprint** (`render.yaml`). One-time setup:

1. Push to GitHub (already done: `SFitz911/Cognee-Hackathon-Team-Cloud-Sailor`).
2. Render Dashboard → **New → Blueprint** → select this repo → **Apply**.
   Render reads `render.yaml` and creates the `wolfpack-recall` web service.
3. In the service's **Environment**, set the four secrets (they're `sync:false`,
   so Render prompts for them):
   - `COGNEE_BASE_URL` — your tenant, e.g. `https://<tenant>.aws.cognee.ai`
   - `COGNEE_API_KEY`
   - `ANTHROPIC_API_KEY`
   - `OPENAI_API_KEY` (optional — poster tooling only)
   `COGNEE_DATASET` (`pinky_serbia`) and `PYTHON_VERSION` are already set.
4. Deploy. Health check hits `/health`; when green, your public URL is
   `https://wolfpack-recall.onrender.com` (or the name Render assigns).

**Build details**
- Build: `pip install -r requirements-render.txt` (lean — no TensorFlow).
- Start: `uvicorn backend.api:app --host 0.0.0.0 --port $PORT`.

**Face ID (Page 3) in the cloud**
The lean deploy omits DeepFace/TensorFlow, so the face gate reports
`available:false` and shows "scanner loading…". Pages 1–2 (landing + investigation
+ Cognee Brain) work fully. To enable Face ID in the cloud, change the build to
`pip install -r requirements.txt` and use an instance with **≥ 2 GB RAM** (TF is
heavy). For demos, running Face ID locally (or via the cloudflared tunnel, which
serves the full local app over HTTPS) is the simplest path.

## B. Quick share without deploying (cloudflared tunnel)

For an ephemeral HTTPS URL that serves the **full** local app (Face ID included):

```bash
cloudflared tunnel --url http://localhost:8000
```

It prints a `https://<random>.trycloudflare.com` URL. Keep the local server
running; the URL changes each restart.

## C. Apply the ontology (Memory Schema)

The Cognee **Cloud REST API has no ontology-upload endpoint** — grounding to an
ontology is a dashboard / SDK action.

**Option 1 — Cognee Cloud dashboard (recommended):**
1. Explore → **Memory Schema**.
2. Import `cognee/ontology.ttl`.
3. Re-run cognify: `python scripts/recognify.py` (rebuilds the graph for
   `pinky_serbia`). The **🧠 Cognee Brain** view then shows the typed graph.

**Option 2 — Cognee SDK (local engine):**
```python
import cognee
await cognee.add(open("data/seed_clues.json").read())
await cognee.cognify(ontology_file_path="cognee/ontology.ttl")
```

Either way, `scripts/recognify.py` triggers a fresh `POST /api/v1/cognify`
(`dataset_ids=[…]`) so the Brain graph reflects the latest memory.
