export type ReportScenario = { title: string; amount: number; detail: string };
export type DecisionReport = {
  tool: "refinance" | "purchase" | "salary";
  title: string;
  basis: string;
  scenarios: [ReportScenario, ReportScenario];
  difference: number;
  expenseMonths?: number;
  summary: string;
  source: string;
  assumptions: string;
  nextStep: string;
};

export function readDecisionReport(fragment: string): DecisionReport | null {
  if (!fragment.startsWith("#v1=") || fragment.length > 12_000) return null;

  const isText = (value: unknown) => typeof value === "string" && value.trim().length > 0 && value.length <= 500;
  const isAmount = (value: unknown) => typeof value === "number" && Number.isFinite(value) && value >= 0;
  try {
    const data = JSON.parse(decodeURIComponent(fragment.slice(4))) as DecisionReport;
    if (!data || !["refinance", "purchase", "salary"].includes(data.tool)
      || ![data.title, data.basis, data.summary, data.source, data.assumptions, data.nextStep].every(isText)
      || !Array.isArray(data.scenarios) || data.scenarios.length !== 2
      || !data.scenarios.every((row) => row && isText(row.title) && isText(row.detail) && isAmount(row.amount))
      || !isAmount(data.difference)
      || (data.expenseMonths !== undefined && !isAmount(data.expenseMonths))) return null;
    return data;
  } catch {
    return null;
  }
}

export function decisionReportPath(report: DecisionReport) {
  return `/karar-raporu#v1=${encodeURIComponent(JSON.stringify(report))}`;
}
