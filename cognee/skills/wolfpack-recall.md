---
name: wolfpack-recall
version: v1.0.0
maintainer: Team Cloud Sailor
status: Active
tags: [memory, investigation, graph, hackathon]
declared_tools: [Bash]
---

# Wolfpack Recall Skill

A procedural playbook for reconstructing a lost night from scattered clues using
Cognee Cloud as the memory graph. Loaded by the agent to run the "Hangover 4:
Berlin" investigation over persistent knowledge-graph memory.

## Prerequisites
- Cognee Cloud account with an API key
- Environment variables set:
  - `COGNEE_BASE_URL` — your tenant API endpoint
  - `COGNEE_API_KEY` — your API key
  - `COGNEE_DATASET` — the case dataset (e.g. `pinky_serbia`)

**If these are not set**, ask the user to export them from the Cognee Cloud
console (Integrations → Connect via MCP / API).

## ALWAYS ping Cognee Cloud first
Before any remember/recall, confirm the tenant is reachable. If the ping fails
(non-200 / network / auth), stop and ask the user to re-export credentials — do
NOT proceed against a broken connection.

```bash
curl -fsS -o /dev/null -w "%{http_code}" "$COGNEE_BASE_URL/api/v1/datasets" \
  -H "X-Api-Key: $COGNEE_API_KEY"
```

## Procedure

1. **Ingest clues** — `remember()` each clue into the case dataset, tagged with a
   `node_set` lens: `verified`, `timeline`, or `all`.
2. **Cognify** — let Cognee build the knowledge graph. Ground entities with the
   case ontology (`cognee/ontology.ttl`) so "the gym / the school / Sporthalle"
   all resolve to `KarlovciGymnasium`.
3. **Recall** — use a broad evidence query; Cognee's `GRAPH_COMPLETION` fuses all
   clues into one grounded context.
4. **Reason** — run the four personas (Planner / Wildcard / Worrier / Optimist)
   over the recalled context; converge on Pinky's location + the locker code.
5. **Validate** — fact-check each new statement against the memory
   (`true | false | unknown`) before adding it to the trail.
6. **Visualize** — open the Cognee knowledge graph (`/api/v1/visualize?dataset_id=…`)
   to show the memory the agent actually built.

## Retrieval modes to demonstrate
`GRAPH_COMPLETION` (main deduction) · `INSIGHTS` (how clues connect) ·
`SUMMARIES` (recap) · temporal (rebuild the timeline).
