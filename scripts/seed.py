"""
Seed the Cognee memory with the Hangover Berlin clue pack, then optionally
run a demo investigation.

Run from the repo root:
  python scripts/seed.py            # ingest data/seed_clues.json (waits for cognify)
  python scripts/seed.py --ask      # ingest, then run the wolfpack on the demo question
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from dotenv import load_dotenv

# Make the repo root importable so `backend` resolves when run as a script.
_ROOT = Path(__file__).resolve().parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from backend.cognee_client import CogneeClient  # noqa: E402

SEED_PATH = _ROOT / "data" / "seed_clues.json"


def _utf8_console() -> None:
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")
        except (AttributeError, ValueError):
            pass


def main(argv: list[str] | None = None) -> int:
    _utf8_console()
    load_dotenv()
    parser = argparse.ArgumentParser(description="Seed Cognee with the turtle case")
    parser.add_argument("--ask", action="store_true", help="Run the wolfpack after seeding")
    args = parser.parse_args(argv)

    pack = json.loads(SEED_PATH.read_text(encoding="utf-8"))
    clues = pack["clues"]
    client = CogneeClient.from_env()
    print(f"Seeding {len(clues)} clues into '{client.dataset}' on {client.api_base}\n")

    for i, clue in enumerate(clues, 1):
        text, node_set = clue["text"], clue.get("node_set", "all")
        print(f"  [{i}/{len(clues)}] ({node_set}) {text[:60]}...")
        res = client.remember(text, node_set=node_set, wait=True)
        print(f"        -> {res.cognify_outcome} (queryable={res.queryable})")

    print("\nSeeding complete.")

    if args.ask:
        from backend.wolfpack import Wolfpack

        question = pack.get("demo_question", "Where is Pinky the dog, and how do we open the gym locker?")
        print(f"\n=== Wolfpack investigates: {question} ===\n")
        inv = Wolfpack(client).investigate(question)
        print(f"(clues recalled: {inv.clues_used})\n")
        for t in inv.turns:
            body = t.error and f"ERROR: {t.error}" or t.text
            print(f"[{t.name}] {body}\n")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
