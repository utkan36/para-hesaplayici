import assert from "node:assert/strict";
import test from "node:test";
import { checkDataHealth } from "../lib/data-health.ts";

test("distinguishes observed periods from stale and unavailable data", async () => {
  const rows = await checkDataHealth("2026-11-12", async (path) => {
    if (path.startsWith("/api/cpi?")) return Response.json({ target: { actualPeriod: "2026-10" } });
    if (path.startsWith("/api/fx?")) return Response.json({ target: { actualDate: "2026-11-01" } });
    if (path.startsWith("/api/gold?")) return Response.json({ target: { actualDate: "2026-11-11" } });
    return new Response(null, { status: 502 });
  });
  assert.deepEqual(rows.map((row) => row.status), ["current", "stale", "current", "unavailable"]);
  assert.equal(rows[0].period, "2026-10");
});
