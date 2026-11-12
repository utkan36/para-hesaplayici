import assert from "node:assert/strict";
import test from "node:test";
import { decisionReportPath, readDecisionReport } from "../lib/decision-report.ts";

const report = {
  tool: "purchase", title: "Büyük harcama", basis: "Bugünkü TL",
  scenarios: [{ title: "Satın al", amount: 5000, detail: "İkinci el" }, { title: "Parayı ayır", amount: 6000, detail: "Birikim" }],
  difference: 1000, expenseMonths: 0.5, summary: "Parayı ayırmak daha yüksek değer bırakıyor.",
  source: "Kullanıcı girdisi", assumptions: "Peşin alım", nextStep: "Varsayımları değiştir.",
};

test("restores Turkish report content from the fragment without query parameters", () => {
  const url = new URL(decisionReportPath(report), "https://example.com");
  assert.equal(url.search, "");
  assert.deepEqual(readDecisionReport(url.hash), report);
});

test("rejects broken or incomplete report fragments", () => {
  assert.equal(readDecisionReport("#v1=%zz"), null);
  assert.equal(readDecisionReport(new URL(decisionReportPath({ ...report, scenarios: [] }), "https://example.com").hash), null);
});

test("accepts salary purchasing-power reports", () => {
  const salary = { ...report, tool: "salary", title: "Maaş alım gücü" };
  assert.deepEqual(readDecisionReport(new URL(decisionReportPath(salary), "https://example.com").hash), salary);
});

test("keeps the full report URL when a purchase report is backed up", async () => {
  const { createScenariosBackup, parseScenariosBackup } = await import("../lib/saved-scenarios.ts");
  const href = decisionReportPath({ ...report, assumptions: "Türkçe varsayım ".repeat(20) });
  assert.ok(href.length > 500);
  const backup = createScenariosBackup([{
    id: "purchase-1", createdAt: "2026-11-12T00:00:00Z", tool: "purchase",
    title: "Karar raporu", summary: report.summary,
    metrics: [{ label: "Fark", value: "1.000 TL" }], href,
  }]);
  assert.equal(parseScenariosBackup(backup)[0].href, href);
  assert.equal(readDecisionReport(new URL(href, "https://example.com").hash).tool, "purchase");
});
