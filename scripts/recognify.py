"""
Trigger a fresh cognify pass on the case dataset (rebuilds the Cognee graph).

Run from the repo root after importing the ontology in the Cognee dashboard
(Explore -> Memory Schema) so the graph reflects the typed schema:

  python scripts/recognify.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

from dotenv import load_dotenv

_ROOT = Path(__file__).resolve().parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from backend.cognee_client import CogneeClient  # noqa: E402


def main() -> int:
    load_dotenv()
    client = CogneeClient.from_env()
    dsid = client.dataset_id()
    if not dsid:
        print(f"Dataset '{client.dataset}' not found on tenant.")
        return 1
    print(f"Re-cognifying '{client.dataset}' ({dsid})…")
    _, data = client._request(
        "POST", "/api/v1/cognify",
        data=json.dumps({"dataset_ids": [dsid]}).encode(),
        content_type="application/json", timeout=300,
    )
    status = data.get(dsid, {}).get("status") if isinstance(data, dict) else data
    print(f"cognify -> {status}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
