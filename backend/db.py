"""Knowledge base loader + founder-profile storage for Founder Zero→Hero.

The KB (stages, playbook, company case studies) is static, sourced content in
kb.json. The founder's profile (current stage, geography, completed milestones)
is the only mutable state, persisted in SQLite.
"""
from __future__ import annotations

import json
import os
import sqlite3

HERE = os.path.dirname(__file__)
DB_PATH = os.getenv("FZH_DB_PATH", os.path.join(HERE, "founder.db"))
KB_PATH = os.path.join(HERE, "kb.json")

with open(KB_PATH, encoding="utf-8") as fh:
    KB: dict = json.load(fh)

STAGE_IDS = [s["id"] for s in KB["stages"]]
GEOGRAPHIES = ["india", "us", "both"]


def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with get_conn() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS profile (
                id        INTEGER PRIMARY KEY CHECK (id = 1),
                stage     TEXT NOT NULL,
                geography TEXT NOT NULL,
                completed TEXT NOT NULL DEFAULT '[]'
            )
            """
        )
        conn.execute(
            "INSERT OR IGNORE INTO profile (id, stage, geography, completed) VALUES (1, ?, ?, '[]')",
            (STAGE_IDS[0], "both"),
        )
        conn.commit()


def get_profile() -> dict:
    row = get_conn().execute("SELECT * FROM profile WHERE id = 1").fetchone()
    return {
        "stage": row["stage"],
        "geography": row["geography"],
        "completed": json.loads(row["completed"]),
    }


def update_profile(stage: str | None = None, geography: str | None = None) -> dict:
    cur = get_profile()
    new_stage = stage if stage in STAGE_IDS else cur["stage"]
    new_geo = geography if geography in GEOGRAPHIES else cur["geography"]
    with get_conn() as conn:
        conn.execute("UPDATE profile SET stage = ?, geography = ? WHERE id = 1", (new_stage, new_geo))
        conn.commit()
    return get_profile()


def set_progress(item_id: str, done: bool) -> dict:
    cur = get_profile()
    completed = set(cur["completed"])
    if done:
        completed.add(item_id)
    else:
        completed.discard(item_id)
    with get_conn() as conn:
        conn.execute("UPDATE profile SET completed = ? WHERE id = 1", (json.dumps(sorted(completed)),))
        conn.commit()
    return get_profile()


# --- KB helpers ------------------------------------------------------------

def stage_by_id(stage_id: str) -> dict | None:
    return next((s for s in KB["stages"] if s["id"] == stage_id), None)


def playbook_for(stage_id: str, geography: str) -> list[dict]:
    """Flatten a stage's playbook into a per-dimension list filtered by geography."""
    blocks = KB["playbook"].get(stage_id, {})
    dim_labels = {d["id"]: d["label"] for d in KB["dimensions"]}
    out = []
    for dim_id, block in blocks.items():
        items: list[dict] = list(block.get("global", []))
        if geography in ("india", "both"):
            items += block.get("india", [])
        if geography in ("us", "both"):
            items += block.get("us", [])
        out.append({
            "dimension": dim_id,
            "label": dim_labels.get(dim_id, dim_id),
            "summary": block.get("summary", ""),
            "items": items,
        })
    return out


def companies_for(stage_id: str) -> list[dict]:
    return [c for c in KB["companies"] if c.get("stage") == stage_id]
