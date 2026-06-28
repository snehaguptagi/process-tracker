"""SQLite storage for Process Tracker work items.

A work item moves through STAGES; we record when it entered its current stage so
the metrics layer can compute aging / bottlenecks. Connections are opened per
call (SQLite serializes writes), which is plenty for this app.
"""
from __future__ import annotations

import os
import sqlite3
from datetime import datetime, timezone
from typing import Optional

DB_PATH = os.getenv("PT_DB_PATH", os.path.join(os.path.dirname(__file__), "process_tracker.db"))

# The pipeline definition. Kept here so the frontend can read it from /api/config
# instead of hardcoding stages — makes the tracker easy to repurpose.
STAGES = ["Not Started", "Intake", "Review", "Completed"]
TYPES = ["Standard", "Bulk"]
TYPE_PREFIX = {"Standard": "STD", "Bulk": "BLK"}
DEFAULT_TARGETS = {"Standard": 30, "Bulk": 15}  # completed-item goals per type


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db() -> None:
    with get_conn() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS items (
                id               INTEGER PRIMARY KEY AUTOINCREMENT,
                record_id        TEXT UNIQUE NOT NULL,
                record_type      TEXT NOT NULL,
                stage            TEXT NOT NULL,
                progress_percent INTEGER NOT NULL DEFAULT 0,
                created_at       TEXT NOT NULL,
                updated_at       TEXT NOT NULL,
                stage_entered_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            "CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)"
        )


# --- helpers ---------------------------------------------------------------

def progress_label(stage: str, pct: int) -> str:
    if stage == "Completed" or pct >= 100:
        return "Done"
    if pct <= 0:
        return "Not Started"
    return "In Progress"


def progress_band(pct: int) -> str:
    if pct <= 0:
        return "0%"
    if pct <= 25:
        return "1-25%"
    if pct <= 50:
        return "26-50%"
    if pct <= 75:
        return "51-75%"
    return "76-100%"


def _row_to_item(row: sqlite3.Row) -> dict:
    d = dict(row)
    d["progress"] = progress_label(d["stage"], d["progress_percent"])
    d["band"] = progress_band(d["progress_percent"])
    return d


# --- CRUD ------------------------------------------------------------------

def list_items(
    record_type: Optional[str] = None,
    stage: Optional[str] = None,
    band: Optional[str] = None,
) -> list[dict]:
    items = [_row_to_item(r) for r in get_conn().execute(
        "SELECT * FROM items ORDER BY id"
    ).fetchall()]
    if record_type and record_type != "all":
        items = [i for i in items if i["record_type"] == record_type]
    if stage and stage != "all":
        items = [i for i in items if i["stage"] == stage]
    if band and band != "all":
        items = [i for i in items if i["band"] == band]
    return items


def get_item(item_id: int) -> Optional[dict]:
    row = get_conn().execute("SELECT * FROM items WHERE id = ?", (item_id,)).fetchone()
    return _row_to_item(row) if row else None


def _next_record_id(conn: sqlite3.Connection, record_type: str) -> str:
    prefix = TYPE_PREFIX.get(record_type, record_type[:3].upper() or "ITM")
    rows = conn.execute(
        "SELECT record_id FROM items WHERE record_id LIKE ?", (f"{prefix}-%",)
    ).fetchall()
    nums = []
    for r in rows:
        suffix = r["record_id"].split("-", 1)[-1]
        if suffix.isdigit():
            nums.append(int(suffix))
    nxt = (max(nums) + 1) if nums else 1001
    return f"{prefix}-{nxt}"


def create_item(record_type: str, stage: str = "Not Started",
                progress_percent: int = 0, record_id: Optional[str] = None) -> dict:
    ts = now_iso()
    if stage == "Completed":
        progress_percent = 100
    progress_percent = max(0, min(100, progress_percent))
    with get_conn() as conn:
        rid = record_id or _next_record_id(conn, record_type)
        cur = conn.execute(
            """INSERT INTO items
               (record_id, record_type, stage, progress_percent, created_at, updated_at, stage_entered_at)
               VALUES (?,?,?,?,?,?,?)""",
            (rid, record_type, stage, progress_percent, ts, ts, ts),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM items WHERE id = ?", (cur.lastrowid,)).fetchone()
        return _row_to_item(row)


def update_item(item_id: int, stage: Optional[str] = None,
                progress_percent: Optional[int] = None) -> Optional[dict]:
    current = get_item(item_id)
    if not current:
        return None
    new_stage = stage if stage is not None else current["stage"]
    new_pct = current["progress_percent"] if progress_percent is None else progress_percent
    # Keep stage and percent coherent.
    if new_stage == "Completed":
        new_pct = 100
    elif new_stage == "Not Started" and progress_percent is None:
        new_pct = 0
    new_pct = max(0, min(100, new_pct))
    stage_changed = new_stage != current["stage"]
    ts = now_iso()
    with get_conn() as conn:
        conn.execute(
            """UPDATE items SET stage = ?, progress_percent = ?, updated_at = ?,
               stage_entered_at = ? WHERE id = ?""",
            (new_stage, new_pct, ts,
             ts if stage_changed else current["stage_entered_at"], item_id),
        )
    return get_item(item_id)


def delete_item(item_id: int) -> bool:
    with get_conn() as conn:
        cur = conn.execute("DELETE FROM items WHERE id = ?", (item_id,))
        return cur.rowcount > 0


def count_items() -> int:
    return get_conn().execute("SELECT COUNT(*) AS n FROM items").fetchone()["n"]


# --- settings (targets) ----------------------------------------------------

def get_targets() -> dict:
    import json
    row = get_conn().execute("SELECT value FROM settings WHERE key = 'targets'").fetchone()
    if row:
        try:
            return json.loads(row["value"])
        except json.JSONDecodeError:
            pass
    return dict(DEFAULT_TARGETS)


def set_targets(targets: dict) -> dict:
    import json
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO settings (key, value) VALUES ('targets', ?) "
            "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            (json.dumps(targets),),
        )
    return get_targets()
