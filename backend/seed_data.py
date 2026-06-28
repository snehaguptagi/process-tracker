"""Deterministic demo data so the tracker works with zero setup.

The dataset is reproducible (no randomness) and intentionally tells a story:
Review is the bottleneck — several items have sat there well past the stuck
threshold — so the metrics and AI insights have something real to surface.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from db import TYPE_PREFIX, get_conn, now_iso

PCT_BY_STAGE = {"Not Started": 0, "Intake": 30, "Review": 60, "Completed": 100}

# Repeating stage sequences (overweight Review) + per-stage aging in days.
_STD_SEQ = ["Not Started", "Intake", "Review", "Review", "Completed", "Review", "Intake", "Completed"]
_BLK_SEQ = ["Intake", "Review", "Completed", "Not Started", "Review", "Completed"]


def _age_days(stage: str, k: int) -> int:
    if stage == "Review":          # the bottleneck — many of these are stuck
        return 8 + (k % 4) * 3     # 8, 11, 14, 17
    if stage == "Intake":
        return 2 + (k % 3)         # 2..4
    if stage == "Completed":
        return 1 + (k % 3)
    return 1 + (k % 2)             # Not Started


def _build() -> list[tuple]:
    rows: list[tuple] = []
    for rtype, seq, count in (("Standard", _STD_SEQ, 32), ("Bulk", _BLK_SEQ, 18)):
        prefix = TYPE_PREFIX[rtype]
        for k in range(count):
            stage = seq[k % len(seq)]
            pct = PCT_BY_STAGE[stage]
            age = _age_days(stage, k)
            entered = (datetime.now(timezone.utc) - timedelta(days=age)).isoformat()
            created = (datetime.now(timezone.utc) - timedelta(days=age + (k % 5))).isoformat()
            rows.append((f"{prefix}-{1001 + k}", rtype, stage, pct, created, created, entered))
    return rows


def seed(force: bool = False) -> int:
    """Insert demo data. If force, wipe existing rows first. Returns row count."""
    with get_conn() as conn:
        if force:
            conn.execute("DELETE FROM items")
        existing = conn.execute("SELECT COUNT(*) AS n FROM items").fetchone()["n"]
        if existing and not force:
            return existing
        conn.executemany(
            """INSERT INTO items
               (record_id, record_type, stage, progress_percent, created_at, updated_at, stage_entered_at)
               VALUES (?,?,?,?,?,?,?)""",
            _build(),
        )
        return conn.execute("SELECT COUNT(*) AS n FROM items").fetchone()["n"]
