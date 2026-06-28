"""Compute pipeline metrics from a set of work items.

Everything here is derived from the items + targets — KPIs, stage distribution,
aging (how long items have sat in their current stage), the bottleneck stage,
and a *meaningful* target-vs-actual (completed items of a type vs its goal).
"""
from __future__ import annotations

from datetime import datetime, timezone

from db import STAGES, get_targets

STUCK_DAYS = 7  # an item sitting this long in a non-final stage is "stuck"


def _days_in_stage(item: dict, now: datetime) -> float:
    try:
        entered = datetime.fromisoformat(item["stage_entered_at"])
    except (ValueError, KeyError):
        return 0.0
    if entered.tzinfo is None:
        entered = entered.replace(tzinfo=timezone.utc)
    return max(0.0, (now - entered).total_seconds() / 86400.0)


def compute(items: list[dict]) -> dict:
    now = datetime.now(timezone.utc)
    total = len(items)
    completed = sum(1 for i in items if i["stage"] == "Completed")
    not_started = sum(1 for i in items if i["stage"] == "Not Started")
    in_progress = sum(
        1 for i in items if i["stage"] not in ("Completed", "Not Started")
    )
    avg_progress = round(sum(i["progress_percent"] for i in items) / total) if total else 0

    by_type: dict[str, int] = {}
    for i in items:
        by_type[i["record_type"]] = by_type.get(i["record_type"], 0) + 1

    stage_distribution = [
        {
            "stage": s,
            "count": sum(1 for i in items if i["stage"] == s),
            "percentage": round(sum(1 for i in items if i["stage"] == s) / total * 100) if total else 0,
        }
        for s in STAGES
    ]

    # Aging per non-final stage + the oldest open items.
    active = [i for i in items if i["stage"] != "Completed"]
    for i in active:
        i["_age"] = _days_in_stage(i, now)
    aging_by_stage = []
    for s in STAGES:
        if s == "Completed":
            continue
        ages = [i["_age"] for i in active if i["stage"] == s]
        aging_by_stage.append({
            "stage": s,
            "count": len(ages),
            "avg_days": round(sum(ages) / len(ages), 1) if ages else 0,
            "max_days": round(max(ages), 1) if ages else 0,
            "stuck": sum(1 for a in ages if a > STUCK_DAYS),
        })
    oldest = sorted(active, key=lambda i: i["_age"], reverse=True)[:5]
    oldest_open = [
        {
            "record_id": i["record_id"],
            "stage": i["stage"],
            "days_in_stage": round(i["_age"], 1),
            "progress_percent": i["progress_percent"],
        }
        for i in oldest if i["_age"] > 0
    ]
    stuck_total = sum(s["stuck"] for s in aging_by_stage)

    # Bottleneck = the open stage with the most stuck items, tie-broken by avg age.
    candidates = [s for s in aging_by_stage if s["count"] > 0]
    bottleneck = None
    if candidates:
        b = max(candidates, key=lambda s: (s["stuck"], s["avg_days"], s["count"]))
        bottleneck = {
            "stage": b["stage"],
            "count": b["count"],
            "stuck": b["stuck"],
            "avg_days": b["avg_days"],
            "reason": (
                f"{b['stuck']} item(s) stuck > {STUCK_DAYS}d, avg {b['avg_days']}d in stage"
                if b["stuck"] else f"{b['count']} open item(s), avg {b['avg_days']}d in stage"
            ),
        }

    targets = get_targets()
    target_vs_actual = []
    for t, target in targets.items():
        actual = sum(1 for i in items if i["record_type"] == t and i["stage"] == "Completed")
        diff = actual - target
        target_vs_actual.append({
            "type": t,
            "target": target,
            "actual": actual,
            "difference": diff,
            "variance": round(diff / target * 100, 1) if target else 0.0,
        })

    return {
        "total": total,
        "completed": completed,
        "in_progress": in_progress,
        "not_started": not_started,
        "avg_progress": avg_progress,
        "completion_rate": round(completed / total * 100) if total else 0,
        "by_type": by_type,
        "stage_distribution": stage_distribution,
        "aging_by_stage": aging_by_stage,
        "oldest_open": oldest_open,
        "stuck_total": stuck_total,
        "bottleneck": bottleneck,
        "target_vs_actual": target_vs_actual,
        "stuck_days_threshold": STUCK_DAYS,
    }
