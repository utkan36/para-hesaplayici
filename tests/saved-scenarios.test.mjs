import assert from "node:assert/strict";
import test from "node:test";
import ts from "typescript";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../lib/saved-scenarios.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const cjsModule = { exports: {} }; vm.runInNewContext(compiled, { module: cjsModule, exports: cjsModule.exports });
const { createScenariosBackup, parseScenariosBackup, parseSavedScenarios, MAX_SAVED_SCENARIOS } = cjsModule.exports;

test("saved scenario parser rejects broken data", () => { assert.equal(parseSavedScenarios("broken").length, 0); assert.equal(parseSavedScenarios("{}").length, 0); });
test("saved scenario parser keeps safe valid fields", () => { const result = parseSavedScenarios(JSON.stringify([{ id: "1", tool: "debt", title: "Plan", createdAt: "2026-09-03T00:00:00.000Z", summary: "Özet", href: "/sonuc", metrics: [{ label: "Taksit", value: "₺10.000" }] }])); assert.equal(result.length, 1); assert.equal(result[0].tool, "debt"); assert.equal(result[0].metrics[0].value, "₺10.000"); });
test("saved scenario parser enforces maximum", () => { const items = Array.from({ length: MAX_SAVED_SCENARIOS + 5 }, (_, index) => ({ id: String(index), tool: "savings", title: "Plan", createdAt: "2026-09-03", metrics: [{ label: "Sonuç", value: "1" }] })); assert.equal(parseSavedScenarios(JSON.stringify(items)).length, MAX_SAVED_SCENARIOS); });
test("scenario backup round trip preserves valid records", () => { const items = parseSavedScenarios(JSON.stringify([{ id: "plan-1", tool: "debt_payoff", title: "Borç planı", createdAt: "2026-09-03", summary: "Özet", href: "/borc-hesaplama", metrics: [{ label: "Süre", value: "8 ay" }] }])); const restored = parseScenariosBackup(createScenariosBackup(items)); assert.equal(restored.length, 1); assert.equal(restored[0].tool, "debt_payoff"); });
test("scenario backup rejects unrelated json", () => { assert.equal(parseScenariosBackup(JSON.stringify({ app: "Başka", version: 1, scenarios: [] })).length, 0); });
test("saved scenario parser sanitizes notes and pin state", () => { const [item] = parseSavedScenarios(JSON.stringify([{ id: "1", tool: "debt", title: "Plan", createdAt: "2026-09-03", note: "n".repeat(700), pinned: true, metrics: [{ label: "Taksit", value: "₺1" }] }])); assert.equal(item.note.length, 500); assert.equal(item.pinned, true); });
