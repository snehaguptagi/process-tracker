// Client for the Founder Zero → Hero backend.
const BASE = (import.meta.env.VITE_API_BASE as string) || "http://localhost:8000";

export type Geography = "india" | "us" | "both";

export interface Health {
  status: string;
  claude: boolean;
  model: string;
  stages: number;
}

export interface Milestone {
  id: string;
  text: string;
}

export interface Stage {
  id: string;
  name: string;
  order: number;
  tagline: string;
  focus: string;
  milestones: Milestone[];
}

export interface Dimension {
  id: string;
  label: string;
  icon: string;
}

export interface PlaybookItem {
  action: string;
  where: string;
  url: string;
  note?: string;
}

export interface PlaybookBlock {
  summary?: string;
  global?: PlaybookItem[];
  india?: PlaybookItem[];
  us?: PlaybookItem[];
}

export interface Company {
  name: string;
  does: string;
  stage: string;
  move: string;
  lesson: string;
  source: string;
}

export interface Meta {
  title: string;
  subtitle: string;
  disclaimer: string;
  geographies: string[];
}

export interface Journey {
  meta: Meta;
  dimensions: Dimension[];
  stages: Stage[];
  // playbook[stageId][dimensionId] = PlaybookBlock
  playbook: Record<string, Record<string, PlaybookBlock>>;
  companies: Company[];
}

export interface Profile {
  stage: string;
  geography: Geography;
  completed: string[];
}

export interface WhereLink {
  label: string;
  url: string;
}

export interface Precedent {
  company: string;
  lesson: string;
  source: string;
}

export interface NextStep {
  step: string;
  why: string;
  stage: string;
  dimension: string;
  where: WhereLink[];
  precedent: Precedent | null;
  sources: string[];
}

async function j<T>(r: Response): Promise<T> {
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
}

export const getHealth = () => fetch(`${BASE}/api/health`).then(j<Health>);
export const getJourney = () => fetch(`${BASE}/api/journey`).then(j<Journey>);
export const getProfile = () => fetch(`${BASE}/api/profile`).then(j<Profile>);

export const updateProfile = (body: { stage?: string; geography?: Geography }) =>
  fetch(`${BASE}/api/profile`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then(j<Profile>);

export const setProgress = (item_id: string, done: boolean) =>
  fetch(`${BASE}/api/profile/progress`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ item_id, done }),
  }).then(j<Profile>);

export const getNextStep = () =>
  fetch(`${BASE}/api/next-step`, { method: "POST" }).then(
    j<{ engine: string; next_step: NextStep }>,
  );

// Flatten a stage's playbook block into a geography-filtered item list.
export function itemsFor(block: PlaybookBlock, geo: Geography): PlaybookItem[] {
  const items: PlaybookItem[] = [...(block.global ?? [])];
  if (geo === "india" || geo === "both") items.push(...(block.india ?? []));
  if (geo === "us" || geo === "both") items.push(...(block.us ?? []));
  return items;
}
