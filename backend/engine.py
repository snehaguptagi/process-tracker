"""Next-step recommender for Founder Zero → Hero.

Given the founder's profile (stage, geography, completed milestones) and the
relevant slice of the knowledge base, recommend the single most suitable next
move — grounded ONLY in the sourced KB, never invented.

Real mode : Claude (claude-opus-4-8 by default) via the Anthropic SDK when
            ANTHROPIC_API_KEY is set, constrained to cite KB sources.
Demo mode : a deterministic heuristic over the same KB slice, so the panel works
            with no API key.
"""
from __future__ import annotations

import json
import os
from typing import List, Optional

from pydantic import BaseModel, Field

import db

MODEL = os.getenv("FZH_MODEL", os.getenv("PT_MODEL", "claude-opus-4-8"))


class WhereLink(BaseModel):
    label: str = Field(description="Where to do it — a service, portal, or program name.")
    url: str = Field(description="The official URL for that resource, taken verbatim from the provided context.")


class Precedent(BaseModel):
    company: str = Field(description="A company from the provided context that did something relevant.")
    lesson: str = Field(description="The one-line lesson from that company, taken from the context.")
    source: str = Field(description="The source URL for that company, taken verbatim from the context.")


class NextStep(BaseModel):
    step: str = Field(description="The single most suitable next action, in one imperative sentence.")
    why: str = Field(description="Two sentences on why this is the right move now, grounded in the founder's stage and progress.")
    stage: str = Field(description="The stage id this step belongs to.")
    dimension: str = Field(description="The dimension id this step belongs to (incorporation/compliance/hiring/fundraising/incubators), or 'general'.")
    where: List[WhereLink] = Field(default_factory=list, description="1-3 concrete places to do it, each with a URL from the context.")
    precedent: Optional[Precedent] = Field(default=None, description="A relevant company precedent from the context, or null if none fits.")
    sources: List[str] = Field(default_factory=list, description="Every source URL you relied on, taken verbatim from the context.")


SYSTEM = """You are a startup advisor guiding a founder from zero to hero.
You are given the founder's current stage, geography, which milestones they've
completed, and a CURATED CONTEXT of stage-appropriate playbook items (each with a
real 'where' and 'url') and real company case studies.

Recommend the SINGLE most suitable next step. Hard rules:
- Use ONLY the provided context. Never invent a service, URL, fee, deadline, or fact.
- Every URL in 'where', 'precedent.source' and 'sources' MUST appear verbatim in the context.
- Prefer the founder's first not-yet-completed milestone and the playbook item that
  most directly unblocks it.
- If a company precedent in the context illustrates this exact move, cite it; otherwise null.
- Be concrete and decision-ready. One step, not a list."""


def _context(profile: dict) -> dict:
    """Build the KB slice the recommender is allowed to use."""
    stage = db.stage_by_id(profile["stage"]) or {}
    completed = set(profile["completed"])
    milestones = [
        {**m, "done": m["id"] in completed} for m in stage.get("milestones", [])
    ]
    return {
        "stage": {
            "id": stage.get("id"),
            "name": stage.get("name"),
            "tagline": stage.get("tagline"),
            "focus": stage.get("focus"),
        },
        "geography": profile["geography"],
        "milestones": milestones,
        "playbook": db.playbook_for(profile["stage"], profile["geography"]),
        "companies": db.companies_for(profile["stage"]),
    }


def recommend_with_claude(ctx: dict) -> NextStep:
    import anthropic  # lazy import so demo mode needs no dependency

    client = anthropic.Anthropic()
    response = client.messages.parse(
        model=MODEL,
        max_tokens=1024,
        system=SYSTEM,
        messages=[{"role": "user", "content": "Founder context (JSON):\n" + json.dumps(ctx, indent=2)}],
        output_format=NextStep,
    )
    if response.stop_reason == "refusal" or response.parsed_output is None:
        raise RuntimeError("Model declined or returned no structured output")
    return response.parsed_output


def _first_open_milestone(ctx: dict) -> Optional[dict]:
    return next((m for m in ctx["milestones"] if not m["done"]), None)


def recommend_heuristic(ctx: dict) -> NextStep:
    stage = ctx["stage"]
    stage_id = stage["id"]
    open_ms = _first_open_milestone(ctx)

    # Pick the playbook block + item most relevant to the open milestone.
    playbook = ctx["playbook"]
    block = playbook[0] if playbook else None
    item = block["items"][0] if (block and block["items"]) else None

    where: List[WhereLink] = []
    sources: List[str] = []
    if block:
        for it in block["items"][:3]:
            if it.get("url"):
                where.append(WhereLink(label=it.get("where", it.get("action", "")), url=it["url"]))
                sources.append(it["url"])

    precedent = None
    companies = ctx["companies"]
    if companies:
        c = companies[0]
        precedent = Precedent(company=c["name"], lesson=c["lesson"], source=c["source"])
        if c["source"] not in sources:
            sources.append(c["source"])

    if open_ms:
        step = open_ms["text"]
        why = (
            f"You're in the {stage['name']} stage — {stage['tagline']} "
            f"This is your first open milestone here, so it's the highest-leverage move right now."
        )
        dimension = block["dimension"] if block else "general"
    else:
        step = f"You've cleared the {stage['name']} milestones — advance to the next stage."
        why = (
            f"Every milestone for {stage['name']} is done. {stage['focus']} "
            "Move your stage forward to get the next set of moves."
        )
        dimension = "general"

    return NextStep(
        step=step,
        why=why,
        stage=stage_id,
        dimension=dimension,
        where=where,
        precedent=precedent,
        sources=sources,
    )


def recommend(profile: dict) -> tuple[NextStep, str]:
    ctx = _context(profile)
    if os.getenv("ANTHROPIC_API_KEY"):
        try:
            return recommend_with_claude(ctx), "claude"
        except Exception as exc:  # noqa: BLE001 — degrade gracefully on any failure
            print(f"[engine] Claude recommendation failed ({exc}); using heuristic")
    return recommend_heuristic(ctx), "heuristic"
