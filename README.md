# Process Tracker — Workflow Analytics Dashboard

A full-stack app for tracking work items as they move through a pipeline — by
**stage** (Not Started → Intake → Review → Completed), by **type**, and by
**progress** — with live KPIs, charts, aging/bottleneck detection, and a
**Claude-powered insights panel** that flags bottlenecks and recommends the next moves.

Works for any staged process: support tickets, applications, document processing,
order fulfillment, onboarding — anything that moves through steps.

This is one end-to-end product:

- **Backend** (`backend/`) — FastAPI + SQLite. Stores work items, exposes CRUD,
  computes metrics (KPIs, stage distribution, **aging & bottleneck**, target-vs-actual),
  and serves AI insights. Seeds deterministic demo data on first run, so it works
  with zero setup.
- **Frontend** (repo root) — React + Vite + TypeScript + Tailwind + shadcn/ui +
  Recharts. Live dashboard reading from the backend: **add / move-stage / adjust-progress /
  delete** items, filter the view, and analyze it with AI.

## What it does

- **Add & track items** — create items, move them through stages, nudge progress, delete.
- **KPIs** — total, completed (+ completion rate), in-progress (+ how many are stuck), avg progress.
- **Charts** — progress funnel + stage distribution (Recharts).
- **Aging & bottleneck** — how long items have sat in each stage, which stage is the
  bottleneck, and the oldest open items. (Items past **7 days** in a non-final stage are "stuck".)
- **Target vs actual** — completed items of a type vs its goal (editable via `PUT /api/targets`).
- **🧠 AI Pipeline Insights** — a status read, the top bottlenecks, and recommended actions
  over the *current filtered view*. Runs Claude when `ANTHROPIC_API_KEY` is set server-side,
  otherwise a deterministic heuristic over the same metrics.

## Run it

**Backend** (terminal 1):

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # optional: add ANTHROPIC_API_KEY for real AI insights
uvicorn main:app --reload --port 8000
```

**Frontend** (terminal 2):

```bash
npm install
npm run dev                   # http://localhost:8080
```

Open `http://localhost:8080`. The dashboard loads the seeded demo pipeline; add items,
move them through stages, and hit **Analyze pipeline with AI**. Point it at a different
backend with `VITE_API_BASE` (see `.env.example`).

## API

| Method | Route | Purpose |
|---|---|---|
| `GET`    | `/api/health`       | Claude wired? + item count |
| `GET`    | `/api/config`       | stages, types, targets |
| `PUT`    | `/api/targets`      | update per-type completed-item goals |
| `GET`    | `/api/items`        | list items (filters: `type`, `stage`, `band`) |
| `POST`   | `/api/items`        | create an item |
| `PATCH`  | `/api/items/{id}`   | move stage / set progress |
| `DELETE` | `/api/items/{id}`   | delete an item |
| `GET`    | `/api/metrics`      | KPIs, distribution, aging, bottleneck, target-vs-actual |
| `POST`   | `/api/insights`     | Claude/heuristic read over the current view |
| `POST`   | `/api/seed`         | reset to deterministic demo data |

## Tech stack

- **Backend** — [FastAPI](https://fastapi.tiangolo.com/), SQLite (stdlib `sqlite3`),
  [Anthropic SDK](https://docs.anthropic.com/) for AI insights.
- **Frontend** — [Vite](https://vitejs.dev/) + [React](https://react.dev/) +
  [TypeScript](https://www.typescriptlang.org/), [Tailwind](https://tailwindcss.com/) +
  [shadcn/ui](https://ui.shadcn.com/), [Recharts](https://recharts.org/),
  [TanStack Query](https://tanstack.com/query).
