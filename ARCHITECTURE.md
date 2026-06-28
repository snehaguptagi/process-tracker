# Architecture

**Founder Zero → Hero** is a full-stack app: a FastAPI backend serving a sourced
knowledge base + the founder's profile, and a React SPA that renders the stage
journey and an AI next-step recommendation.

## Stack
- **Backend** — FastAPI, SQLite (stdlib `sqlite3`), Anthropic SDK
- **Frontend** — Vite + React + TypeScript, Tailwind + shadcn/ui (Radix), TanStack Query

## The two kinds of state
- **Knowledge base (static, sourced)** — `backend/kb.json`: stages, dimensions, the
  per-geography playbook, and company case studies. This is curated content with a
  cited source on every item; the app never invents it.
- **Founder profile (mutable)** — the only thing that changes: current stage,
  geography, and completed milestones. Persisted in SQLite (one row).

## Data flow
1. On load, the SPA fetches `GET /api/journey` (the whole KB) and `GET /api/profile`.
2. `Dashboard.tsx` renders the stage rail, the selected stage's milestones, the
   per-dimension playbook (filtered to India/US/both), and company precedents.
3. Ticking a milestone → `POST /api/profile/progress`; changing stage/geography →
   `PUT /api/profile`. Both return the updated profile (cached via TanStack Query).
4. **Suggest next step** → `POST /api/next-step`. The backend builds a KB slice for
   the founder's stage + geography and asks the recommender for the single best move.

## Key decisions
- **Hybrid grounding.** `backend/engine.py` runs Claude when `ANTHROPIC_API_KEY` is
  set, constrained to use ONLY the provided KB slice — every URL it returns must
  appear verbatim in the context. With no key it falls back to a deterministic
  heuristic over the same KB (first open milestone + most relevant playbook item +
  matching company precedent). Either way: **no fabricated services, links or facts.**
- **Server-side key.** Unlike a client-only template, the Anthropic key lives on the
  backend and is never shipped to the browser.
- **KB as the single source of truth.** Add a stage, a playbook item, or a company by
  editing `kb.json` — no code changes needed; the UI and recommender both read it.

## Structure
```
backend/kb.json            sourced knowledge base (stages, playbook, companies)
backend/db.py              KB loader + founder-profile SQLite store
backend/engine.py          next-step recommender (Claude + heuristic fallback)
backend/main.py            FastAPI app (journey / profile / next-step endpoints)
src/lib/api.ts             typed backend client
src/components/Dashboard.tsx   stage rail, playbook, milestones, precedents
src/components/AIInsights.tsx  next-step panel
src/components/ui/         shadcn/ui primitives
```
