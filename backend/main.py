"""Founder Zero → Hero — FastAPI backend.

A stage-aware playbook for Indian & US tech founders, grounded in real sources
and how top companies did it. The only mutable state is the founder's profile
(stage, geography, completed milestones); everything else is the sourced KB.

Endpoints
  GET  /api/health             mode + whether Claude is wired + stage count
  GET  /api/journey            the full knowledge base (stages, dimensions, playbook, companies)
  GET  /api/profile            current founder profile
  PUT  /api/profile            set stage and/or geography
  POST /api/profile/progress   toggle a milestone done/undone
  POST /api/next-step          recommend the single most suitable next move (Claude or heuristic)

Run:  uvicorn main:app --reload --port 8000   (from the backend/ directory)
"""
from __future__ import annotations

import os

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import db
import engine

load_dotenv()

app = FastAPI(title="Founder Zero → Hero")
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


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "claude": bool(os.getenv("ANTHROPIC_API_KEY")),
        "model": engine.MODEL,
        "stages": len(db.STAGE_IDS),
    }


@app.get("/api/journey")
def journey():
    """The full sourced knowledge base — drives the whole UI."""
    return {
        "meta": db.KB["meta"],
        "dimensions": db.KB["dimensions"],
        "stages": db.KB["stages"],
        "playbook": db.KB["playbook"],
        "companies": db.KB["companies"],
    }


@app.get("/api/profile")
def get_profile():
    return db.get_profile()


class ProfileRequest(BaseModel):
    stage: str | None = None
    geography: str | None = None


@app.put("/api/profile")
def put_profile(req: ProfileRequest):
    if req.stage is not None and req.stage not in db.STAGE_IDS:
        raise HTTPException(400, f"stage must be one of {db.STAGE_IDS}")
    if req.geography is not None and req.geography not in db.GEOGRAPHIES:
        raise HTTPException(400, f"geography must be one of {db.GEOGRAPHIES}")
    return db.update_profile(req.stage, req.geography)


class ProgressRequest(BaseModel):
    item_id: str
    done: bool


@app.post("/api/profile/progress")
def post_progress(req: ProgressRequest):
    return db.set_progress(req.item_id, req.done)


@app.post("/api/next-step")
def next_step():
    profile = db.get_profile()
    step, used = engine.recommend(profile)
    return {"engine": used, "next_step": step.model_dump()}
