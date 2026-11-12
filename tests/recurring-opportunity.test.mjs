import assert from "node:assert/strict";
import test from "node:test";
import { createRecurringContributionPlan } from "../lib/recurring-opportunity.ts";

test("groups monthly habit spending into yearly historical cohorts", () => {
  const plan = createRecurringContributionPlan({ monthlyAmount: 1000, startDate: "2024-01-01", targetDate: "2025-01-01", annualIncreasePercent: 20 });
  assert.equal(plan.contributionCount, 12);
  assert.equal(plan.totalSpent, 12000);
  assert.deepEqual(plan.cohorts, [{ date: "2024-06-01", amount: 12000, contributionCount: 12 }]);
});

test("applies the yearly increase after every twelve monthly payments", () => {
  const plan = createRecurringContributionPlan({ monthlyAmount: 1000, startDate: "2023-01-01", targetDate: "2025-01-01", annualIncreasePercent: 20 });
  assert.equal(plan.totalSpent, 26400);
  assert.equal(plan.cohorts[1].amount, 14400);
});

test("rejects invalid or unsupported recurring plans", () => {
  assert.throws(() => createRecurringContributionPlan({ monthlyAmount: 0, startDate: "2024-01-01", targetDate: "2025-01-01", annualIncreasePercent: 20 }));
  assert.throws(() => createRecurringContributionPlan({ monthlyAmount: 1000, startDate: "2024-01-01", targetDate: "2024-02-01", annualIncreasePercent: 20 }));
});
