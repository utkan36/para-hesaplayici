import test from "node:test";
import assert from "node:assert/strict";
import { latestProfile, readProfiles, summarizeProfile } from "../lib/financial-profile.ts";

test("uses the latest saved month and ignores malformed records", () => {
  const profile = { income: 30000, expenses: 20000, debt: 5000, reserve: 50000 };
  const profiles = readProfiles(JSON.stringify({ "2026-10": profile, "2026-11": { ...profile, debt: -1 }, "2026-12": profile }));
  assert.deepEqual(Object.keys(profiles), ["2026-10", "2026-12"]);
  assert.deepEqual(latestProfile(profiles, "2026-11"), profile);
  const summary = summarizeProfile(profile);
  assert.equal(summary.remaining, 5000);
  assert.equal(summary.reserveMonths, 2);
  assert.equal(summarizeProfile({ income: 0, expenses: 0, debt: 0, reserve: 0 }).debtRatio, null);
});

test("calculates reserve goal from expenses and debt, with no target for zero outflow", async () => {
  const { readReserveGoal, reserveGoalProgress } = await import("../lib/financial-profile.ts");
  const profile = { income: 40000, expenses: 20000, debt: 5000, reserve: 50000 };
  assert.equal(readReserveGoal("4"), 4);
  assert.equal(readReserveGoal("61"), null);
  assert.deepEqual(reserveGoalProgress(profile, 4), { target: 100000, remaining: 50000, ratio: 0.5 });
  assert.equal(reserveGoalProgress({ ...profile, expenses: 0, debt: 0 }, 4), null);
});
