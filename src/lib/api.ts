// Client for the Process Tracker backend.
const BASE = (import.meta.env.VITE_API_BASE as string) || "http://localhost:8000";

export interface Item {
  id: number;
  record_id: string;
  record_type: string;
  stage: string;
  progress_percent: number;
  progress: string; // derived label: Not Started / In Progress / Done
  band: string;
  created_at: string;
  updated_at: string;
  stage_entered_at: string;
}

export interface Config {
  stages: string[];
  types: string[];
  targets: Record<string, number>;
}

export interface Health {
  status: string;
  claude: boolean;
  model: string;
  count: number;
}

export interface StageDist { stage: string; count: number; percentage: number; }
export interface AgingStage { stage: string; count: number; avg_days: number; max_days: number; stuck: number; }
export interface OldestItem { record_id: string; stage: string; days_in_stage: number; progress_percent: number; }
export interface TargetActual { type: string; target: number; actual: number; difference: number; variance: number; }
export interface Bottleneck { stage: string; count: number; stuck: number; avg_days: number; reason: string; }

export interface Metrics {
  total: number;
  completed: number;
  in_progress: number;
  not_started: number;
  avg_progress: number;
  completion_rate: number;
  by_type: Record<string, number>;
  stage_distribution: StageDist[];
  aging_by_stage: AgingStage[];
  oldest_open: OldestItem[];
  stuck_total: number;
  bottleneck: Bottleneck | null;
  target_vs_actual: TargetActual[];
  stuck_days_threshold: number;
}

export interface Insights {
  status: string;
  bottlenecks: string[];
  actions: string[];
}

export interface Filters {
  type?: string;
  stage?: string;
  band?: string;
}

function qs(f: Filters): string {
  const p = new URLSearchParams();
  if (f.type && f.type !== "all") p.set("type", f.type);
  if (f.stage && f.stage !== "all") p.set("stage", f.stage);
  if (f.band && f.band !== "all") p.set("band", f.band);
  const s = p.toString();
  return s ? `?${s}` : "";
}

async function j<T>(r: Response): Promise<T> {
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
}

export const getHealth = () => fetch(`${BASE}/api/health`).then(j<Health>);
export const getConfig = () => fetch(`${BASE}/api/config`).then(j<Config>);
export const getItems = (f: Filters = {}) =>
  fetch(`${BASE}/api/items${qs(f)}`).then(j<{ items: Item[] }>).then((d) => d.items);
export const getMetrics = (f: Filters = {}) =>
  fetch(`${BASE}/api/metrics${qs(f)}`).then(j<Metrics>);

export const createItem = (body: { record_type: string; stage?: string; progress_percent?: number }) =>
  fetch(`${BASE}/api/items`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then(j<Item>);

export const updateItem = (id: number, body: { stage?: string; progress_percent?: number }) =>
  fetch(`${BASE}/api/items/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then(j<Item>);

export const deleteItem = (id: number) =>
  fetch(`${BASE}/api/items/${id}`, { method: "DELETE" }).then((r) => {
    if (!r.ok) throw new Error(`${r.status}`);
  });

export const getInsights = (f: Filters = {}) =>
  fetch(`${BASE}/api/insights`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(f),
  }).then(j<{ engine: string; insights: Insights }>);

export const reseed = () =>
  fetch(`${BASE}/api/seed`, { method: "POST" }).then(j<{ status: string; count: number }>);
