# Architecture

Process Tracker is a **client-side single-page app** — no backend, no database. It renders a workflow pipeline from in-memory sample data and layers an optional AI analysis on top.

## Stack
- Vite + React + TypeScript
- Tailwind CSS + shadcn/ui (Radix primitives)
- Recharts (charts)
- Anthropic API, called client-side, for the AI insights panel

## Data flow
1. `src/components/Dashboard.tsx` holds `recordData` — sample work items with `recordType`, `stage`, `progress`, `progressPercent`.
2. Filter state (type / stage / progress) reduces it to `filteredData` (`useMemo`).
3. Derived metrics — totals, stage distribution, target-vs-actual, and a progress funnel — are computed from `filteredData` and fed to Recharts.
4. Those metrics are summarized into a string and passed to `AIInsights`, which calls the Anthropic API and returns a status / bottlenecks / actions read.

## Key decisions
- **No backend.** It's a template — sample data lives inline so it runs with `npm run dev` and zero setup. Swap `recordData` (or add a `fetch`) to wire real data.
- **Bring-your-own-key AI.** The Anthropic key is entered in the UI and stored in `localStorage`, never bundled. A client-side app can't safely hold a secret key (it would ship in the JS bundle), so the user supplies their own at runtime.
- **Generic on purpose.** Stages and types are deliberately neutral so the same dashboard fits tickets, applications, documents, orders — any staged process.

## Structure
```
src/components/Dashboard.tsx    the dashboard: data, filters, KPIs, charts
src/components/AIInsights.tsx   Claude pipeline-analysis panel (BYO key)
src/components/ui/              shadcn/ui primitives
```
