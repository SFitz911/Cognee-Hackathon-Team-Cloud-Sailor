"""
Reusable Cognee Cloud client for the live tenant's V1.0 REST API (/api/v1/*).

Stdlib-only, no SDK. Wraps the proven endpoints used by the working Cognee Code
plugin so the hackathon app can just `from cognee_client import CogneeClient`.

  client = CogneeClient.from_env()           # reads COGWIT_API_BASE / COGWIT_API_KEY
  client.remember("some fact", wait=True)     # ingest + cognify (blocks until queryable)
  hits = client.recall("a question")          # -> list[RecallHit]

Env (.env, loaded by callers via python-dotenv): COGWIT_API_BASE, COGWIT_API_KEY.
"""

from __future__ import annotations

import json
import os
import ssl
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from dataclasses import dataclass
from typing import Any, Optional

DEFAULT_DATASET = os.getenv("COGNEE_DATASET", "cloud_sailor_memory")
DEFAULT_COGNIFY_DEADLINE_S = 300.0
DEFAULT_POLL_INTERVAL_S = 3.0
_TEXT_FIELDS = ("text", "answer", "search_result", "content", "description")


class CogneeError(RuntimeError):
    """A reachable-but-failed request, or an unreachable tenant."""


@dataclass(frozen=True)
class RememberResult:
    status: int
    dataset_id: Optional[str]
    cognify_outcome: Optional[str]  # "completed" | "timeout" | "errored" | None (not waited)

    @property
    def queryable(self) -> bool:
        return self.cognify_outcome == "completed"


@dataclass(frozen=True)
class RecallHit:
    source: str
    text: str
    raw: dict[str, Any]


class CogneeClient:
    def __init__(
        self,
        api_base: str,
        api_key: str,
        *,
        dataset: str = DEFAULT_DATASET,
        cognify_deadline_s: float = DEFAULT_COGNIFY_DEADLINE_S,
        poll_interval_s: float = DEFAULT_POLL_INTERVAL_S,
    ) -> None:
        if not api_base or not api_key:
            raise CogneeError("api_base and api_key are required")
        self.api_base = api_base.rstrip("/")
        self.api_key = api_key
        self.dataset = dataset
        self.cognify_deadline_s = cognify_deadline_s
        self.poll_interval_s = poll_interval_s
        self._ssl = ssl.create_default_context()

    @classmethod
    def from_env(cls, **kwargs: Any) -> "CogneeClient":
        # Accept either our COGWIT_* names or the dashboard's COGNEE_* aliases.
        base = os.getenv("COGWIT_API_BASE") or os.getenv("COGNEE_BASE_URL") or ""
        key = os.getenv("COGWIT_API_KEY") or os.getenv("COGNEE_API_KEY") or ""
        kwargs.setdefault("dataset", os.getenv("COGNEE_DATASET", DEFAULT_DATASET))
        return cls(base, key, **kwargs)

    # -- transport -----------------------------------------------------------
    def _request(
        self,
        method: str,
        path: str,
        *,
        data: Optional[bytes] = None,
        content_type: Optional[str] = None,
        timeout: float = 60.0,
    ) -> tuple[int, Any]:
        headers = {"X-Api-Key": self.api_key}
        if content_type:
            headers["Content-Type"] = content_type
        req = urllib.request.Request(self.api_base + path, data=data, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=timeout, context=self._ssl) as resp:
                raw = resp.read().decode("utf-8")
                return resp.status, json.loads(raw or "null")
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8", "replace")[:300]
            raise CogneeError(f"HTTP {e.code} for {method} {path}: {body}") from e
        except urllib.error.URLError as e:
            raise CogneeError(f"Cannot reach {self.api_base}{path}: {e}") from e

    @staticmethod
    def _multipart(fields: dict[str, str], files: list[tuple[str, str, str]]) -> tuple[bytes, str]:
        boundary = f"----cognee{uuid.uuid4().hex}"
        parts: list[bytes] = []
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
            parts.append(content.encode())
            parts.append(b"\r\n")
        parts.append(f"--{boundary}--\r\n".encode())
        return b"".join(parts), boundary

    # -- lifecycle -----------------------------------------------------------
    def remember(
        self,
        text: str,
        *,
        dataset: Optional[str] = None,
        node_set: str = "",
        wait: bool = True,
    ) -> RememberResult:
        """Ingest text and trigger cognify. If wait=True, block until queryable."""
        ds = dataset or self.dataset
        body, boundary = self._multipart(
            {"datasetName": ds, "node_set": node_set, "run_in_background": "true"},
            [("data", f"{node_set or 'content'}.txt", text)],
        )
        status, data = self._request(
            "POST",
            "/api/v1/remember",
            data=body,
            content_type=f"multipart/form-data; boundary={boundary}",
        )
        dataset_id = data.get("dataset_id") if isinstance(data, dict) else None
        outcome = self.wait_for_cognify(dataset_id) if (wait and dataset_id) else None
        return RememberResult(status=status, dataset_id=dataset_id, cognify_outcome=outcome)

    def wait_for_cognify(self, dataset_id: str) -> str:
        """Poll cognify status until terminal or deadline. Returns completed|timeout|errored."""
        qs = urllib.parse.urlencode({"dataset": dataset_id, "pipeline": "cognify_pipeline"})
        deadline = time.monotonic() + self.cognify_deadline_s
        while True:
            _, data = self._request("GET", f"/api/v1/datasets/status?{qs}", timeout=15.0)
            val = ""
            if isinstance(data, dict) and data:
                v = data.get(str(dataset_id))
                if v is None and len(data) == 1:
                    v = next(iter(data.values()))
                if isinstance(v, dict):
                    v = v.get("cognify_pipeline")
                val = str(v or "").upper()
            if val.endswith("COMPLETED"):
                return "completed"
            if val.endswith("ERRORED"):
                return "errored"
            if time.monotonic() >= deadline:
                return "timeout"
            time.sleep(self.poll_interval_s)

    def recall(
        self,
        query: str,
        *,
        top_k: int = 5,
        dataset: Optional[str] = None,
        scope: str = "auto",
        only_context: bool = False,
    ) -> list[RecallHit]:
        """Query memory. Returns a list of RecallHit (possibly empty = authoritative no-match)."""
        ds = dataset or self.dataset
        body = json.dumps(
            {
                "query": query,
                "top_k": top_k,
                "only_context": only_context,
                "scope": scope,
                "datasets": [ds],
            }
        ).encode()
        _, data = self._request(
            "POST", "/api/v1/recall", data=body, content_type="application/json"
        )
        rows = data if isinstance(data, list) else ([] if data is None else [data])
        return [self._to_hit(r) for r in rows]

    @staticmethod
    def _to_hit(row: Any) -> RecallHit:
        if not isinstance(row, dict):
            return RecallHit(source="raw", text=str(row), raw={"value": row})
        text = next((str(row[f]) for f in _TEXT_FIELDS if row.get(f)), json.dumps(row)[:500])
        return RecallHit(source=str(row.get("source", "?")), text=text, raw=row)


if __name__ == "__main__":
    import sys

    from dotenv import load_dotenv

    # Windows consoles default to cp1252 and choke on Unicode (e.g. narrow no-break
    # space) returned by the model. Force UTF-8 so demo output never crashes.
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")
        except (AttributeError, ValueError):
            pass

    load_dotenv()
    client = CogneeClient.from_env()
    print(f"Tenant: {client.api_base}")
    res = client.remember("Cognee Cloud automates knowledge graph creation in the cloud.")
    print(f"remember -> status={res.status} dataset_id={res.dataset_id} queryable={res.queryable}")
    for hit in client.recall("What does Cognee Cloud automate?"):
        print(f"  ({hit.source}) {hit.text}")
