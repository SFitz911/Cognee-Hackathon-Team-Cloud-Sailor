"""
Ingest the Mr. Chow one-liner dataset into Cognee Cloud as its own memory
(dataset: 'mr_chow'), so the character lives in the knowledge graph too.

Run from the repo root:
  python scripts/ingest_chow.py
"""

from __future__ import annotations

import csv
import sys
from pathlib import Path

from dotenv import load_dotenv

_ROOT = Path(__file__).resolve().parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from backend.cognee_client import CogneeClient  # noqa: E402

CSV = _ROOT / "data" / "mr_chow_responses.csv"
DATASET = "mr_chow"


def main() -> int:
    load_dotenv()
    rows = list(csv.DictReader(open(CSV, encoding="utf-8")))
    print(f"Loaded {len(rows)} Mr. Chow lines from {CSV.name}")

    # One document = the whole persona, grouped by category. Cognee builds a
    # single graph of Mr. Chow's voice rather than 1000 tiny cognify runs.
    by_cat: dict[str, list[str]] = {}
    for r in rows:
        by_cat.setdefault(r["category"], []).append(r["response"].strip())
    doc = ["Mr. Chow (from The Hangover) — character voice dataset.\n"]
    for cat, lines in sorted(by_cat.items()):
        doc.append(f"\n## {cat}\n" + "\n".join(f"- {ln}" for ln in lines))
    text = "\n".join(doc)

    client = CogneeClient.from_env(dataset=DATASET)
    print(f"Remembering into dataset '{DATASET}' ({len(text)} chars)… cognify may take a bit.")
    res = client.remember(text, node_set="character", wait=True)
    print(f"remember -> status={res.status} dataset_id={res.dataset_id} "
          f"cognify={res.cognify_outcome} queryable={res.queryable}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
