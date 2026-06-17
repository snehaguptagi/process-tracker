# Process Tracker — Workflow Analytics Dashboard

An interactive dashboard for tracking work items as they move through a pipeline — by **stage** (Not Started → Intake → Review → Completed), by **type**, and by **progress** — with live KPIs, charts, filters, and a **Claude-powered insights panel** that flags bottlenecks and recommends next actions.

Works for any staged process: support tickets, applications, document processing, order fulfillment, onboarding — anything that moves through steps.

> **Note:** ships with **sample data only** (generic `STD-####` / `BLK-####` records in `src/components/Dashboard.tsx`). Swap in your own.

## Features

- **🧠 AI Pipeline Insights (Claude)** — reads the current (filtered) pipeline and writes a status read, the top bottlenecks, and recommended actions. Bring your own Anthropic key (entered in the UI, stored only in your browser — never committed).
- **KPI cards** — total, completed, in-progress, not-started, average progress
- **Interactive filters** — by record type, stage, and progress band
- **Charts** — stage distribution, target vs. actual, and a progress funnel (Recharts)
- **Records table** with per-item progress
- Fully responsive, shadcn/ui components

## Tech stack

- [Vite](https://vitejs.dev/) + [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- [Recharts](https://recharts.org/) · [lucide-react](https://lucide.dev/)
- [Anthropic API](https://docs.anthropic.com/) for the AI insights panel

## Getting started

```bash
npm install
npm run dev      # dev server
npm run build    # production build
```

Then open the dashboard, drop your Anthropic API key into the **AI Pipeline Insights** panel, and click **Analyze pipeline with AI**.
