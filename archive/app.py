"""
Where's My Context? — a personal context-memory CLI on Cognee Cloud.

The hangover problem: you did the work, but the *context* — why a decision was
made, what a config value means, where you left off — evaporates. This app lets
you stash context as you go and ask for it back in plain language later.

Usage:
  python app.py remember "We chose tenant 304d0baa because 390d0baa was dead."
  python app.py recall   "Why did we pick this tenant?"
  python app.py remember "Deploy runs Fri 5pm" --topic ops
  python app.py recall   "When do we deploy?" --topic ops
  python app.py status   [--topic ops]
  python app.py shell                       # interactive remember/recall loop

Datasets ("topics") keep memory scoped so cognify stays fast. Default topic is
COGNEE_DATASET in .env, else "cloud_sailor_memory".
"""

from __future__ import annotations

import argparse
import sys

from dotenv import load_dotenv

from cognee_client import CogneeClient, CogneeError


def _utf8_console() -> None:
    """Windows consoles default to cp1252 and crash on model Unicode output."""
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")
        except (AttributeError, ValueError):
            pass


def _client(topic: str | None) -> CogneeClient:
    kwargs = {"dataset": topic} if topic else {}
    return CogneeClient.from_env(**kwargs)


def cmd_remember(args: argparse.Namespace) -> int:
    client = _client(args.topic)
    text = args.text.strip()
    if not text:
        print("Nothing to remember (empty text).")
        return 1
    print(f"Remembering into '{client.dataset}'…  (cognify can take a bit)")
    res = client.remember(text, wait=not args.no_wait)
    if args.no_wait:
        print(f"✓ Accepted (HTTP {res.status}). Cognifying in the background.")
    elif res.queryable:
        print(f"✓ Stored and queryable (cognify {res.cognify_outcome}).")
    else:
        print(f"✓ Accepted (HTTP {res.status}), but cognify={res.cognify_outcome} "
              f"— it's still processing server-side and will be queryable shortly.")
    return 0


def cmd_recall(args: argparse.Namespace) -> int:
    client = _client(args.topic)
    hits = client.recall(args.query, top_k=args.top_k)
    if not hits:
        print("No matching context found (the topic may be empty or still cognifying).")
        return 0
    print(f"Found {len(hits)} result(s) in '{client.dataset}':\n")
    for i, h in enumerate(hits, 1):
        print(f"  {i}. [{h.source}] {h.text}")
    return 0


def cmd_status(args: argparse.Namespace) -> int:
    client = _client(args.topic)
    try:
        st, _ = client._request("GET", "/health", timeout=15)
        print(f"Tenant:   {client.api_base}")
        print(f"Health:   HTTP {st}")
        sa, _ = client._request("GET", "/api/v1/datasets", timeout=15)
        print(f"Auth:     HTTP {sa} ({'OK' if sa == 200 else 'check key'})")
        print(f"Topic:    {client.dataset}")
    except CogneeError as e:
        print(f"Status:   ❌ {e}")
        return 1
    return 0


def cmd_shell(args: argparse.Namespace) -> int:
    client = _client(args.topic)
    print(f"Where's My Context? — interactive ({client.dataset}). "
          "Commands: r <text> = remember, ? <query> = recall, q = quit.")
    while True:
        try:
            line = input("> ").strip()
        except (EOFError, KeyboardInterrupt):
            print()
            return 0
        if not line:
            continue
        if line in ("q", "quit", "exit"):
            return 0
        if line.startswith("r "):
            res = client.remember(line[2:].strip(), wait=True)
            print(f"  ✓ {'queryable' if res.queryable else res.cognify_outcome}")
        elif line.startswith("? "):
            hits = client.recall(line[2:].strip())
            if not hits:
                print("  (no results)")
            for h in hits:
                print(f"  [{h.source}] {h.text}")
        else:
            print("  Use: r <text> | ? <query> | q")


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="app.py", description="Where's My Context? — Cognee memory CLI")
    # Shared --topic available on every subcommand, before OR after it.
    topic = argparse.ArgumentParser(add_help=False)
    topic.add_argument("--topic", help="Dataset/topic to scope memory (default from .env)")
    p.add_argument("--topic", help=argparse.SUPPRESS)  # also accept before the subcommand
    sub = p.add_subparsers(dest="command", required=True)

    r = sub.add_parser("remember", parents=[topic], help="Store a piece of context")
    r.add_argument("text", help="The context to remember")
    r.add_argument("--no-wait", action="store_true", help="Don't block on cognify")
    r.set_defaults(func=cmd_remember)

    q = sub.add_parser("recall", parents=[topic], help="Ask for context back")
    q.add_argument("query", help="A plain-language question")
    q.add_argument("--top-k", type=int, default=5, help="Max results (default 5)")
    q.set_defaults(func=cmd_recall)

    s = sub.add_parser("status", parents=[topic], help="Check tenant health and auth")
    s.set_defaults(func=cmd_status)

    sh = sub.add_parser("shell", parents=[topic], help="Interactive remember/recall loop")
    sh.set_defaults(func=cmd_shell)
    return p


def main(argv: list[str] | None = None) -> int:
    _utf8_console()
    load_dotenv(dotenv_path=".env")
    args = build_parser().parse_args(argv)
    try:
        return args.func(args)
    except CogneeError as e:
        print(f"❌ Cognee error: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
