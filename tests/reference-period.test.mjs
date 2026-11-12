import assert from "node:assert/strict";
import test from "node:test";
import { referenceLag } from "../lib/reference-period.ts";

test("measures reference periods across month and year boundaries", () => {
  assert.equal(referenceLag("2026-11-12", "2026-10", true), 1);
  assert.equal(referenceLag("2027-01", "2026-11", true), 2);
  assert.equal(referenceLag("2026-11-02", "2026-10-30"), 3);
});
