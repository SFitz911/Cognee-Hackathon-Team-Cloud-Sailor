"""
Wolfpack orchestrator — runs the four personalities over shared Cognee memory.

Flow for one investigation:
  1. recall() relevant clues from Cognee Cloud (the shared graph).
  2. Run each of the 4 personas through Claude, grounded in those clues.
  3. Return a structured, turn-by-turn result for the API / UI.

Persona calls are independent, so they run concurrently. Cognee remains the single
source of truth; the personas only ever reason over what recall() returns.
"""

from __future__ import annotations

import os
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from typing import Optional

from .cognee_client import CogneeClient, CogneeError, RecallHit
from .personalities import WOLFPACK, Persona

# Claude model for the personas. Opus 4.x per project guidance; override via env.
DEFAULT_MODEL = os.getenv("WOLFPACK_MODEL", "claude-opus-4-8")
MAX_TOKENS = 320  # personas speak in short punchy paragraphs


@dataclass(frozen=True)
class PersonaTurn:
    """One persona's contribution to an investigation."""

    key: str
    name: str
    color: str
    text: str
    error: Optional[str] = None


@dataclass(frozen=True)
class Investigation:
    """The full result of asking the wolfpack a question."""

    question: str
    clues_used: int
    context: str
    turns: tuple[PersonaTurn, ...]

    def to_dict(self) -> dict:
        return {
            "question": self.question,
            "clues_used": self.clues_used,
            "turns": [
                {"key": t.key, "name": t.name, "color": t.color, "text": t.text, "error": t.error}
                for t in self.turns
            ],
        }


def _supports_temperature(model: str) -> bool:
    """Opus 4.8 (and newer) deprecate the `temperature` sampling parameter."""
    return not model.startswith("claude-opus-4-8")


def _format_clues(hits: list[RecallHit]) -> str:
    """Render recalled clues as a numbered evidence list for the prompt."""
    if not hits:
        return "(No clues recovered yet — the memory is empty.)"
    return "\n".join(f"{i}. [{h.source}] {h.text}" for i, h in enumerate(hits, 1))


class Wolfpack:
    """Orchestrates the four personas over a Cognee memory client."""

    def __init__(
        self,
        cognee: CogneeClient,
        *,
        model: str = DEFAULT_MODEL,
        anthropic_api_key: Optional[str] = None,
    ) -> None:
        self.cognee = cognee
        self.model = model
        # Lazy import so the module loads even if anthropic isn't installed yet.
        try:
            import anthropic  # noqa: F401
        except ImportError as e:  # pragma: no cover - environment guard
            raise CogneeError(
                "The 'anthropic' package is required for the wolfpack. "
                "Run: pip install anthropic"
            ) from e
        import anthropic

        key = anthropic_api_key or os.getenv("ANTHROPIC_API_KEY")
        if not key:
            raise CogneeError("ANTHROPIC_API_KEY is not set (needed for the personalities).")
        self._client = anthropic.Anthropic(api_key=key)

    # -- single persona ------------------------------------------------------
    def _run_persona(self, persona: Persona, question: str, context: str) -> PersonaTurn:
        user_msg = (
            f"RECOVERED CLUES (shared memory):\n{context}\n\n"
            f"THE GROUP IS TRYING TO ANSWER:\n{question}\n\n"
            f"Respond as {persona.name}."
        )
        kwargs: dict = {
            "model": self.model,
            "max_tokens": MAX_TOKENS,
            "system": persona.system_prompt,
            "messages": [{"role": "user", "content": user_msg}],
        }
        # Opus 4.8 deprecates `temperature`; only send it to models that accept it.
        if _supports_temperature(self.model):
            kwargs["temperature"] = persona.temperature
        try:
            resp = self._client.messages.create(**kwargs)
            text = "".join(block.text for block in resp.content if block.type == "text").strip()
            return PersonaTurn(persona.key, persona.name, persona.color, text)
        except Exception as e:  # noqa: BLE001 - surface any API failure per-persona
            return PersonaTurn(
                persona.key, persona.name, persona.color, "", error=str(e)
            )

    # -- full investigation --------------------------------------------------
    # Broad evidence-gathering query. Cognee's GRAPH_COMPLETION fuses every clue
    # across the knowledge graph, so the personas reason over the full picture
    # rather than a narrow answer to the literal question.
    EVIDENCE_QUERY = (
        "List every clue and piece of evidence we have recovered about the missing dog "
        "Pinky and last night, including locations, people, times, the tattoo, and the gym locker code."
    )

    def investigate(
        self, question: str, *, top_k: int = 10, evidence_query: Optional[str] = None
    ) -> Investigation:
        """Recall the full evidence picture, then run all four personas concurrently.

        If memory is empty (Cognee returns a 'prerequisites not met' 404), the
        personas still respond — they just have no evidence to work with yet.
        """
        try:
            hits = self.cognee.recall(evidence_query or self.EVIDENCE_QUERY, top_k=top_k)
        except CogneeError as e:
            if "prerequisites not met" in str(e) or "HTTP 404" in str(e):
                hits = []
            else:
                raise
        context = _format_clues(hits)

        with ThreadPoolExecutor(max_workers=len(WOLFPACK)) as pool:
            turns = tuple(
                pool.map(lambda p: self._run_persona(p, question, context), WOLFPACK)
            )

        return Investigation(
            question=question,
            clues_used=len(hits),
            context=context,
            turns=turns,
        )

    # -- single-clue validation against the memory graph ---------------------
    def validate(self, statement: str, *, top_k: int = 10) -> dict:
        """Judge a statement against the established case memory.

        Returns {"verdict": "true"|"false"|"unknown", "reason": str}. "true" =
        supported/consistent with the Cognee memory; "false" = contradicted.
        """
        try:
            hits = self.cognee.recall(self.EVIDENCE_QUERY, top_k=top_k)
        except CogneeError as e:
            if "prerequisites not met" in str(e) or "HTTP 404" in str(e):
                hits = []
            else:
                raise
        context = _format_clues(hits)

        system = (
            "You are the case fact-checker for a missing-dog investigation. Using ONLY the "
            "established case memory, judge whether a new statement is TRUE (supported by or "
            "consistent with the memory), FALSE (contradicted by the memory), or UNKNOWN "
            "(no evidence either way). Reply with exactly one word — TRUE, FALSE, or UNKNOWN — "
            "then a dash and one short sentence of justification grounded in the clues."
        )
        user = f"CASE MEMORY:\n{context}\n\nSTATEMENT TO CHECK:\n{statement}"
        kwargs: dict = {
            "model": self.model,
            "max_tokens": 120,
            "system": system,
            "messages": [{"role": "user", "content": user}],
        }
        if _supports_temperature(self.model):
            kwargs["temperature"] = 0.0
        resp = self._client.messages.create(**kwargs)
        text = "".join(b.text for b in resp.content if b.type == "text").strip()

        head = text.lstrip().split(None, 1)[0].upper().strip(".:,-—–") if text else ""
        verdict = head.lower() if head in {"TRUE", "FALSE", "UNKNOWN"} else "unknown"
        # Strip a leading "TRUE/FALSE/UNKNOWN" word and any dash/colon separator.
        reason = text.strip()
        for token in ("TRUE", "FALSE", "UNKNOWN"):
            if reason.upper().startswith(token):
                reason = reason[len(token):]
                break
        reason = reason.lstrip(" .:—–-\t")
        return {"verdict": verdict, "reason": reason or "No justification returned."}
