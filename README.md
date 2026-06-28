# Founder Zero → Hero — Stage-aware startup playbook

A guidance tool that tells a founder **what to do next** based on the stage their
startup is at — and **where** to do it. At every stage it lays out the moves
across five dimensions — **incorporate/register, comply, hire, raise, and apply to
accelerators** — for **India and the US**, then recommends the single most
suitable next step, grounded in **real, cited sources** and **how 13 of the
world's top companies actually did it** (Stripe, Airbnb, Dropbox, Figma, Notion,
Postman, Canva, Brex, CRED, Razorpay, Zerodha, Flipkart, Zoho).

Seven stages, zero → hero:

**Idea → Validate → Incorporate → MVP → Traction → Raise → Scale**

This is one end-to-end product:

- **Backend** (`backend/`) — FastAPI + SQLite. Serves the sourced knowledge base
  (stages, per-geography playbook, company case studies), stores the founder's
  profile (current stage, geography, completed milestones), and recommends the
  next step. Works with zero setup.
- **Frontend** (repo root) — React + Vite + TypeScript + Tailwind + shadcn/ui.
  A stage rail you walk through, per-dimension playbook cards with real "where"
  links, company precedents, milestone checkboxes, and an AI next-step panel.

## What it does

- **Stage rail** — see all seven stages, your progress in each, and where you are now.
- **Per-stage playbook** — for the stage you're on, the concrete moves across
  incorporation, compliance, hiring, fundraising and incubators — filtered to
  **India**, **US**, or **both** — each with the official place to do it and a note.
- **How top companies did it** — real case studies attached to each stage, with the
  move they made, the lesson, and a source link.
- **Milestones** — tick off what you've done; your progress drives the recommendation.
- **🧠 Next step** — recommends the single highest-leverage move for your stage,
  geography and progress, with real links and a matching company precedent. Runs
  Claude when `ANTHROPIC_API_KEY` is set server-side, otherwise a deterministic
  heuristic over the same knowledge base. **Never invents** a service, URL or fact —
  every link is cited from the sourced KB.

> Guidance, not legal/tax/financial advice. Fees, deadlines and program terms
> change — always confirm on the linked official page before acting.

## Run it

**Backend** (terminal 1):

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # optional: add ANTHROPIC_API_KEY for AI next-step
uvicorn main:app --reload --port 8000
```

**Frontend** (terminal 2):

```bash
npm install
npm run dev                   # http://localhost:8080
```

Open `http://localhost:8080`. Pick your geography, click through the stages, tick
off milestones, and hit **Suggest my next step**. Point it at a different backend
with `VITE_API_BASE` (see `.env.example`).

## API

| Method | Route | Purpose |
|---|---|---|
| `GET`  | `/api/health`           | Claude wired? + stage count |
| `GET`  | `/api/journey`          | the full knowledge base (stages, dimensions, playbook, companies) |
| `GET`  | `/api/profile`          | current founder profile |
| `PUT`  | `/api/profile`          | set stage and/or geography |
| `POST` | `/api/profile/progress` | toggle a milestone done/undone |
| `POST` | `/api/next-step`        | recommend the single most suitable next move |

## Where the knowledge comes from

All guidance lives in `backend/kb.json` — a curated, sourced framework. Examples:
India incorporation via **MCA SPICe+** / Razorpay Rize, **DPIIT** recognition,
**GST**, **iSAFE/CCPS**, **SISFS** grants, ROC **AOC-4/MGT-7**, RBI **FC-GPR**;
US **Delaware C-corp** via Stripe Atlas/Clerky/Firstbase, IRS **EIN**, the
**83(b)** election (Form 15620), **Carta** vesting, Delaware franchise tax;
hiring via Wellfound / YC Work at a Startup / Instahyre / Cutshort, ESOPs and EOR
(Deel/Remote/Rippling); fundraising via **SAFE** / YC docs, AngelList, LetsVenture;
accelerators **YC, Techstars, 500 Global, Antler, Surge, T-Hub, NSRCEL, SINE**.
Every item links to its official source; the recommender is constrained to use
only what's in the KB.

## Tech stack

- **Backend** — [FastAPI](https://fastapi.tiangolo.com/), SQLite (stdlib `sqlite3`),
  [Anthropic SDK](https://docs.anthropic.com/) for the next-step recommendation.
- **Frontend** — [Vite](https://vitejs.dev/) + [React](https://react.dev/) +
  [TypeScript](https://www.typescriptlang.org/), [Tailwind](https://tailwindcss.com/) +
  [shadcn/ui](https://ui.shadcn.com/), [TanStack Query](https://tanstack.com/query).
