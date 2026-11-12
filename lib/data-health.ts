const checks = [
  { id: "cpi", name: "TÜFE", maxAge: 45, monthly: true },
  { id: "fx", name: "Döviz", maxAge: 7 },
  { id: "gold", name: "Gram altın", maxAge: 7 },
  { id: "deposit", name: "Mevduat faizi", maxAge: 21 },
] as const;

export type DataHealthRow = {
  id: string;
  name: string;
  status: "current" | "stale" | "unavailable";
  period?: string;
  source?: string;
};

export async function checkDataHealth(targetDate: string, read: (path: string) => Promise<Response>): Promise<DataHealthRow[]> {
  const start = new Date(`${targetDate}T00:00:00Z`);
  start.setUTCDate(start.getUTCDate() - 14);
  const query = new URLSearchParams({ startDate: start.toISOString().slice(0, 10), targetDate });
  return Promise.all(checks.map(async (check): Promise<DataHealthRow> => {
    const row = { id: check.id, name: check.name };
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const sample = await Promise.race([
        (async () => {
          const response = await read(`/api/${check.id}?${query}`);
          if (!response.ok) throw new Error("Source unavailable");
          return await response.json() as { source?: string; target?: { actualDate?: string; actualPeriod?: string } };
        })(),
        new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("Source timeout")), 7000); }),
      ]);
      const monthly = "monthly" in check;
      const period = monthly ? sample.target?.actualPeriod : sample.target?.actualDate;
      if (!period || !(monthly ? /^\d{4}-\d{2}$/ : /^\d{4}-\d{2}-\d{2}$/).test(period)) {
        return { ...row, status: "unavailable" };
      }
      const observed = new Date(`${monthly ? period + "-01" : period}T00:00:00Z`);
      const target = Date.parse(targetDate);
      if (!Number.isFinite(observed.getTime()) || observed.getTime() > target) return { ...row, status: "unavailable" };
      if (monthly) {
        observed.setUTCMonth(observed.getUTCMonth() + 1, 0);
      }
      const age = (target - observed.getTime()) / 86_400_000;
      return { ...row, period, source: sample.source, status: age > check.maxAge ? "stale" : "current" };
    } catch {
      return { ...row, status: "unavailable" };
    } finally {
      clearTimeout(timer);
    }
  }));
}
