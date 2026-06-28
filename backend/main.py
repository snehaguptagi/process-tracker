"""Process Tracker — FastAPI backend.

Endpoints
  GET    /api/health                mode + whether Claude is wired + item count
  GET    /api/config                stages, types, targets (so the UI isn't hardcoded)
  PUT    /api/targets               update per-type completed-item goals
  GET    /api/items                 list items (filters: type, stage, band)
  POST   /api/items                 create an item
  PATCH  /api/items/{id}            move stage / set progress
  DELETE /api/items/{id}            delete an item
  GET    /api/metrics               KPIs, stage distribution, aging, bottleneck, target-vs-actual
  POST   /api/insights              Claude (or heuristic) read over the current view
  POST   /api/seed                  reset to deterministic demo data

Run:  uvicorn main:app --reload --port 8000   (from the backend/ directory)
"""
from __future__ import annotations

import os

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

import db
import engine
import metrics as metrics_mod
from seed_data import seed

load_dotenv()

app = FastAPI(title="Process Tracker")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # dev only; lock down in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _startup() -> None:
    db.init_db()
    seed(force=False)  # seed demo data only if the table is empty


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "claude": bool(os.getenv("ANTHROPIC_API_KEY")),
        "model": engine.MODEL,
        "count": db.count_items(),
    }


@app.get("/api/config")
def config():
    return {"stages": db.STAGES, "types": db.TYPES, "targets": db.get_targets()}


class TargetsRequest(BaseModel):
    targets: dict[str, int]


@app.put("/api/targets")
def put_targets(req: TargetsRequest):
    return {"targets": db.set_targets(req.targets)}


@app.get("/api/items")
def list_items(type: str | None = None, stage: str | None = None, band: str | None = None):
    return {"items": db.list_items(type, stage, band)}


class CreateItem(BaseModel):
    record_type: str
    stage: str = "Not Started"
    progress_percent: int = Field(0, ge=0, le=100)
    record_id: str | None = None


@app.post("/api/items", status_code=201)
def create_item(req: CreateItem):
    if req.stage not in db.STAGES:
        raise HTTPException(400, f"stage must be one of {db.STAGES}")
    try:
        return db.create_item(req.record_type, req.stage, req.progress_percent, req.record_id)
    except Exception as exc:  # e.g. duplicate record_id
        raise HTTPException(400, str(exc))


class UpdateItem(BaseModel):
    stage: str | None = None
    progress_percent: int | None = Field(None, ge=0, le=100)


@app.patch("/api/items/{item_id}")
def patch_item(item_id: int, req: UpdateItem):
    if req.stage is not None and req.stage not in db.STAGES:
        raise HTTPException(400, f"stage must be one of {db.STAGES}")
    item = db.update_item(item_id, req.stage, req.progress_percent)
    if not item:
        raise HTTPException(404, "item not found")
    return item


@app.delete("/api/items/{item_id}", status_code=204)
def remove_item(item_id: int):
    if not db.delete_item(item_id):
        raise HTTPException(404, "item not found")
    return None


@app.get("/api/metrics")
def get_metrics(type: str | None = None, stage: str | None = None, band: str | None = None):
    return metrics_mod.compute(db.list_items(type, stage, band))


class InsightsRequest(BaseModel):
    type: str | None = None
    stage: str | None = None
    band: str | None = None


@app.post("/api/insights")
def post_insights(req: InsightsRequest):
    m = metrics_mod.compute(db.list_items(req.type, req.stage, req.band))
    result, used = engine.analyze(m)
    return {"engine": used, "insights": result.model_dump()}


@app.post("/api/seed")
def reset_seed():
    n = seed(force=True)
    return {"status": "ok", "count": n}
