export const SAVED_SCENARIOS_KEY = "para-hesaplayici:saved-scenarios:v1";
export const MAX_SAVED_SCENARIOS = 50;

export type ScenarioTool = "debt" | "debt_payoff" | "refinance" | "early_payoff" | "deposit" | "salary" | "savings" | "purchase";
export type ScenarioMetric = { label: string; value: string };
export type SavedScenario = {
  id: string;
  tool: ScenarioTool;
  title: string;
  createdAt: string;
  summary: string;
  metrics: ScenarioMetric[];
  href: string;
  note?: string;
  pinned?: boolean;
};

const tools = new Set<ScenarioTool>(["debt", "debt_payoff", "refinance", "early_payoff", "deposit", "salary", "savings", "purchase"]);
const text = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";

export function parseSavedScenarios(raw: string | null): SavedScenario[] {
  if (!raw) return [];
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data.flatMap((item): SavedScenario[] => {
      if (!item || typeof item !== "object") return [];
      const value = item as Record<string, unknown>;
      const tool = value.tool;
      const rawMetrics = Array.isArray(value.metrics) ? value.metrics : [];
      const metrics = rawMetrics.flatMap((metric): ScenarioMetric[] => {
        if (!metric || typeof metric !== "object") return [];
        const entry = metric as Record<string, unknown>;
        const label = text(entry.label, 60); const metricValue = text(entry.value, 80);
        return label && metricValue ? [{ label, value: metricValue }] : [];
      }).slice(0, 8);
      const id = text(value.id, 80); const title = text(value.title, 80); const createdAt = text(value.createdAt, 40);
      if (!id || typeof tool !== "string" || !tools.has(tool as ScenarioTool) || !title || !createdAt || !metrics.length) return [];
      const rawHref = typeof value.href === "string" ? value.href.trim() : "";
      const isReport = rawHref.startsWith("/karar-raporu#v1=");
      const href = isReport ? (rawHref.slice("/karar-raporu".length).length <= 12_000 ? rawHref : "") : text(rawHref, 500);
      return [{ id, tool: tool as ScenarioTool, title, createdAt, summary: text(value.summary, 180), metrics, href, note: text(value.note, 500), pinned: value.pinned === true }];
    }).slice(0, MAX_SAVED_SCENARIOS);
  } catch { return []; }
}

export function readSavedScenarios() {
  if (typeof window === "undefined") return [];
  return parseSavedScenarios(window.localStorage.getItem(SAVED_SCENARIOS_KEY));
}

function write(items: SavedScenario[]) {
  window.localStorage.setItem(SAVED_SCENARIOS_KEY, JSON.stringify(items.slice(0, MAX_SAVED_SCENARIOS)));
  window.dispatchEvent(new Event("saved-scenarios-changed"));
}

export function createScenariosBackup(items: SavedScenario[]) {
  return JSON.stringify({ app: "Para Hesaplayıcı", version: 1, exportedAt: new Date().toISOString(), scenarios: items }, null, 2);
}

export function parseScenariosBackup(raw: string) {
  try {
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== "object") return [];
    const value = data as Record<string, unknown>;
    if (value.app !== "Para Hesaplayıcı" || value.version !== 1 || !Array.isArray(value.scenarios)) return [];
    return parseSavedScenarios(JSON.stringify(value.scenarios));
  } catch { return []; }
}

export function importScenariosBackup(raw: string) {
  const imported = parseScenariosBackup(raw);
  if (!imported.length) return 0;
  const current = readSavedScenarios();
  const existingIds = new Set(current.map((item) => item.id));
  const unique = imported.filter((item) => !existingIds.has(item.id));
  write([...unique, ...current]);
  return unique.length;
}

export function saveScenario(input: Omit<SavedScenario, "id" | "createdAt">) {
  const item: SavedScenario = { ...input, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, createdAt: new Date().toISOString() };
  write([item, ...readSavedScenarios()]);
  return item;
}

export function deleteSavedScenario(id: string) { write(readSavedScenarios().filter((item) => item.id !== id)); }
export function renameSavedScenario(id: string, title: string) { const safe = title.trim().slice(0, 80); if (safe) write(readSavedScenarios().map((item) => item.id === id ? { ...item, title: safe } : item)); }
export function updateSavedScenario(id: string, changes: Pick<SavedScenario, "note" | "pinned">) {
  write(readSavedScenarios().map((item) => item.id === id ? { ...item, note: text(changes.note, 500), pinned: changes.pinned === true } : item));
}
