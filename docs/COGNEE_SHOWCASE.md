# Showcasing Cognee — how this project uses the platform

Cognee Cloud is the **brain** of Wolfpack Recall, not just a key-value store. This
doc maps every Cognee surface we exercise, how to reproduce it, and the live pitch
walkthrough.

## Architecture (who does what)

```
Web app (FastAPI + frontend + DeepFace)   ← presentation layer (host on Render, or the cloudflared tunnel)
        │  remember · recall · validate · visualize
        ▼
Cognee Cloud                              ← the brain
  Datasets · node_sets · Memory Schema (ontology) · Brain/Mindmap graph · Search · Skills · MCP
```

The app is intentionally *thin*: it feeds clues in and reads the graph back out.
The intelligence — entity extraction, grounding, graph building, retrieval — is
Cognee's.

## 1. Real knowledge graph, embedded in the app
Page 2 has a **🧠 Cognee Brain** tab that renders Cognee's *actual* graph for the
case dataset (proxied via `GET /cognee/graph` →
`GET /api/v1/visualize?dataset_id=<id>`). It is not a mockup — it's the memory
Cognee built from our clues, shown next to our narrative storyline map.

## 2. Memory Schema / ontology
`cognee/ontology.ttl` defines the case domain: `Dog`, `Person`, `Location`, `Clue`,
`Code`, `Event`, plus canonical individuals (e.g. `KarlovciGymnasium` unifies "the
gym / the school / Sporthalle"). Apply it:

- **SDK / local:** `cognee.cognify(ontology_file_path="cognee/ontology.ttl")`
- **Cognee Cloud:** Explore → **Memory Schema** → import the ontology.

Grounding to the ontology is what dedupes cross-clue references and produces a
clean, typed graph.

## 3. Datasets + node_sets
- **Dataset** `pinky_serbia` isolates this case (each case = its own memory).
- **node_sets** tag clues by trust/lens: `verified`, `timeline`, `all` — so each
  persona can recall a filtered view of the same graph.

## 4. Retrieval modes
- `GRAPH_COMPLETION` — the main deduction (fuses every clue). Used by
  `/investigate` and `/validate`.
- Also demo `INSIGHTS`, `SUMMARIES`, and temporal recall from the dashboard Search.

## 5. Skills
`cognee/skills/wolfpack-recall.md` is a procedural playbook in Cognee's Skill
format (like the bundled `claude-code-memory`). Add it via Explore → **Skills** →
*Add skill* so the investigation workflow lives in Cognee.

## 6. MCP / Agent integration
Cognee Cloud → **Integrations** exposes the same memory to agents over MCP. To
query this case memory live from Claude Code (or Cursor / VS Code / Codex):

1. Integrations → **Connect via MCP** → copy the MCP endpoint + API key.
2. Export the credentials the console shows:
   ```bash
   export COGNEE_BASE_URL="https://<tenant>.aws.cognee.ai"
   export COGNEE_API_KEY="<your-key>"
   ```
3. Point your MCP client at the Cognee MCP server; you can now `recall` the Pinky
   case from inside your editor — same brain, different client. Great "one memory,
   many agents" demo.

## Live pitch walkthrough (5 min)

1. **Landing** — "Hangover 4: Berlin" poster (AI-generated via HF FLUX).
2. **Face ID (Page 3)** — DeepFace gate: enroll → scan → access granted.
3. **Investigation (Page 2)**
   - Load the clue pack → clues appear as nodes under Pinky.
   - Mark clues ✓/✗ or **🔍 check** → Cognee fact-checks against memory (green/red);
     Pinky walks the gray storyline route toward the gym.
   - Ask the Wolfpack → 4 personas reason over Cognee's `GRAPH_COMPLETION`, and
     independently debunk the Berlin Zoo red herring (graph disambiguation).
   - Flip to **🧠 Cognee Brain** → "this is the real graph Cognee built."
4. **Cognee Cloud dashboard** — open **Brain / Mindmap / Search / Memory Schema**
   to prove the memory is live and typed.
5. **The thesis** — the hangover *is* lost context; Cognee is the memory that
   survived. Cite the BEAM benchmark (0.79 @ 100K vs 0.735) for why graph memory
   beats plain RAG.
