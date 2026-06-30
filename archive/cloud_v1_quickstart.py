"""
Cognee Cloud quickstart against the live tenant's V1.0 REST API (/api/v1/*).

Why this exists: the bundled `cogwit_sdk` targets the older `/api/add` JSON
surface, which this tenant has deprecated (it 409s regardless of field casing).
The tenant runs the current V1.0 lifecycle API — remember / datasets-status /
recall — which this script calls directly with the stdlib only.

Contract mirrored from the working Cognee Code plugin:
  POST /api/v1/remember            multipart: datasetName, node_set, run_in_background + `data` file
  GET  /api/v1/datasets/status     ?dataset=<id>&pipeline=cognify_pipeline  -> {<id>: "...COMPLETED"}
  POST /api/v1/recall              json: query, top_k, only_context, scope, datasets -> list

Env (.env, loaded before use): COGWIT_API_BASE, COGWIT_API_KEY.
"""

import json
import os
import ssl
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid

from dotenv import load_dotenv

load_dotenv()

API_BASE = os.getenv("COGWIT_API_BASE", "").rstrip("/")
API_KEY = os.getenv("COGWIT_API_KEY", "")
DATASET = "hackathon_demo"
COGNIFY_DEADLINE_S = 180.0
POLL_INTERVAL_S = 3.0

_SSL_CTX = ssl.create_default_context()


def _headers(extra=None):
    h = {"X-Api-Key": API_KEY}
    if extra:
        h.update(extra)
    return h


def _multipart(fields, files):
    boundary = f"----cogneeQuickstart{uuid.uuid4().hex}"
    parts = []
    for name, value in fields.items():
        parts.append(f"--{boundary}\r\n".encode())
        parts.append(f'Content-Disposition: form-data; name="{name}"\r\n\r\n'.encode())
        parts.append(str(value).encode())
        parts.append(b"\r\n")
    for name, filename, content in files:
        parts.append(f"--{boundary}\r\n".encode())
        parts.append(
            f'Content-Disposition: form-data; name="{name}"; filename="{filename}"\r\n'
            "Content-Type: text/plain; charset=utf-8\r\n\r\n".encode()
        )
        parts.append(content.encode() if isinstance(content, str) else content)
        parts.append(b"\r\n")
    parts.append(f"--{boundary}--\r\n".encode())
    return b"".join(parts), boundary


def _request(method, path, *, data=None, headers=None, timeout=60.0):
    req = urllib.request.Request(
        API_BASE + path, data=data, headers=_headers(headers), method=method
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout, context=_SSL_CTX) as resp:
            raw = resp.read().decode("utf-8")
            return resp.status, json.loads(raw or "null")
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", "replace")
        raise SystemExit(f"HTTP {e.code} for {method} {path}: {body[:300]}")
    except urllib.error.URLError as e:
        raise SystemExit(f"Cannot reach {API_BASE}{path}: {e}")


def remember(text):
    body, boundary = _multipart(
        {"datasetName": DATASET, "node_set": "", "run_in_background": "true"},
        [("data", "content.txt", text)],
    )
    status, data = _request(
        "POST",
        "/api/v1/remember",
        data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
    )
    dataset_id = (data or {}).get("dataset_id") if isinstance(data, dict) else None
    print(f"Remember status: {status} | dataset_id: {dataset_id}")
    return dataset_id


def wait_for_cognify(dataset_id):
    if not dataset_id:
        print("No dataset_id returned; skipping status poll.")
        return
    qs = urllib.parse.urlencode({"dataset": dataset_id, "pipeline": "cognify_pipeline"})
    deadline = time.monotonic() + COGNIFY_DEADLINE_S
    while True:
        status, data = _request("GET", f"/api/v1/datasets/status?{qs}", timeout=15.0)
        val = ""
        if isinstance(data, dict) and data:
            v = data.get(str(dataset_id))
            if v is None and len(data) == 1:
                v = next(iter(data.values()))
            if isinstance(v, dict):
                v = v.get("cognify_pipeline")
            val = str(v or "").upper()
        print(f"  cognify status: {val or '(pending)'}")
        if val.endswith("COMPLETED"):
            return "completed"
        if val.endswith("ERRORED"):
            raise SystemExit(f"Cognify ERRORED for dataset {dataset_id}")
        if time.monotonic() >= deadline:
            print("  cognify still running at deadline; recall may be partial.")
            return "timeout"
        time.sleep(POLL_INTERVAL_S)


def recall(query):
    body = json.dumps(
        {"query": query, "top_k": 5, "only_context": False, "scope": "auto", "datasets": [DATASET]}
    ).encode()
    status, data = _request(
        "POST", "/api/v1/recall", data=body, headers={"Content-Type": "application/json"}
    )
    print(f"Recall status: {status}")
    results = data if isinstance(data, list) else [data]
    for i, r in enumerate(results, 1):
        if isinstance(r, dict):
            text = r.get("text") or r.get("answer") or r.get("search_result") or r.get("content") or r
            print(f"  [{i}] ({r.get('source', '?')}) {text}")
        else:
            print(f"  [{i}] {r}")


def main():
    if not API_BASE or not API_KEY:
        raise SystemExit("COGWIT_API_BASE / COGWIT_API_KEY must be set in .env")
    print(f"Tenant: {API_BASE}")
    dataset_id = remember("Cognee Cloud automates knowledge graph creation in the cloud.")
    wait_for_cognify(dataset_id)
    recall("What does Cognee Cloud automate?")


if __name__ == "__main__":
    main()
