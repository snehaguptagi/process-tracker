"""AI insights for the pipeline.

Given the computed metrics, produce a short structured read: an overall status,
the top bottlenecks, and the highest-leverage next actions.

Real mode : Claude (claude-opus-4-8 by default) via the Anthropic SDK when
            ANTHROPIC_API_KEY is set, validated against the Pydantic schema.
Demo mode : a deterministic heuristic over the same metrics, so the panel works
            with no API key.
"""
from __future__ import annotations

import json
import os
from typing import List

from pydantic import BaseModel, Field

MODEL = os.getenv("PT_MODEL", "claude-opus-4-8")


class Insights(BaseModel):
    status: str = Field(description="Two sentences on overall pipeline health, grounded in the numbers.")
    bottlenecks: List[str] = Field(description="The 1-3 stages/types most at risk, each with the figure that proves it.")
    actions: List[str] = Field(description="The 2-3 highest-leverage next moves, specific and concrete.")


SYSTEM = """You are an operations analyst reviewing a work-item pipeline.
Using ONLY the metrics provided (do not invent numbers), produce:
- status: two sentences on overall pipeline health.
- bottlenecks: the 1-3 stages or record types most at risk, each citing the figure that proves it.
- actions: the 2-3 highest-leverage next moves — specific, concrete, and tied to the bottlenecks.
Be concise and decision-ready."""


def analyze_with_claude(metrics: dict) -> Insights:
    import anthropic  # lazy import so demo mode needs no dependency

    client = anthropic.Anthropic()
    response = client.messages.parse(
        model=MODEL,
        max_tokens=1024,
        system=SYSTEM,
        messages=[{"role": "user", "content": "Pipeline metrics (JSON):\n" + json.dumps(metrics, indent=2)}],
        output_format=Insights,
    )
    if response.stop_reason == "refusal" or response.parsed_output is None:
        raise RuntimeError("Model declined or returned no structured output")
    return response.parsed_output


def analyze_heuristic(metrics: dict) -> Insights:
    total = metrics["total"]
    if total == 0:
        return Insights(
            status="The pipeline is empty. Add or import work items to start tracking.",
            bottlenecks=["No items in the current view."],
            actions=["Add items, or clear filters if you've filtered everything out."],
        )

    comp = metrics["completion_rate"]
    health = "healthy" if comp >= 60 else "under pressure" if comp >= 30 else "at risk"
    status = (
        f"{total} items in view, {comp}% completed and {metrics['avg_progress']}% average progress — "
        f"the pipeline looks {health}. {metrics['stuck_total']} item(s) are stuck beyond "
        f"{metrics['stuck_days_threshold']} days in a stage."
    )

    bottlenecks: List[str] = []
    b = metrics.get("bottleneck")
    if b:
        bottlenecks.append(f"{b['stage']}: {b['reason']}.")
    worst_tva = sorted(metrics["target_vs_actual"], key=lambda t: t["variance"])
    if worst_tva and worst_tva[0]["variance"] < 0:
        t = worst_tva[0]
        bottlenecks.append(
            f"{t['type']} output behind goal: {t['actual']}/{t['target']} completed ({t['variance']}%)."
        )
    if metrics["not_started"]:
        bottlenecks.append(f"{metrics['not_started']} item(s) not started yet.")
    if not bottlenecks:
        bottlenecks.append("No material bottlenecks — flow looks balanced.")

    actions: List[str] = []
    if b:
        actions.append(f"Unblock {b['stage']}: review the {b['count']} open item(s) there, oldest first.")
    if metrics["oldest_open"]:
        o = metrics["oldest_open"][0]
        actions.append(f"Escalate {o['record_id']} — {o['days_in_stage']}d in {o['stage']}.")
    if metrics["not_started"]:
        actions.append(f"Pull {metrics['not_started']} not-started item(s) into Intake to keep flow up.")
    actions = actions[:3] or ["Keep current cadence; no urgent action."]

    return Insights(status=status, bottlenecks=bottlenecks[:3], actions=actions)


def analyze(metrics: dict) -> tuple[Insights, str]:
    if os.getenv("ANTHROPIC_API_KEY"):
        try:
            return analyze_with_claude(metrics), "claude"
        except Exception as exc:  # noqa: BLE001 — degrade gracefully on any failure
            print(f"[engine] Claude insights failed ({exc}); using heuristic")
    return analyze_heuristic(metrics), "heuristic"
