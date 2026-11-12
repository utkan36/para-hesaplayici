import assert from "node:assert/strict";
import test from "node:test";
import { pathToFileURL } from "node:url";

const moduleUrl = pathToFileURL(new URL("../lib/portfolio.ts", import.meta.url).pathname);

test("buy-and-hold portföy ağırlıklı çarpanı ve dağılımı hesaplar", async () => {
  const { calculateBuyAndHoldPortfolio } = await import(moduleUrl.href);
  const result = calculateBuyAndHoldPortfolio([
    { code: "ALTIN", label: "Gram altın", weightPercent: 60, multiplier: 2 },
    { code: "USD", label: "ABD doları", weightPercent: 40, multiplier: 1.5 },
  ], 100_000, 180_000);

  assert.equal(result.multiplier, 1.8);
  assert.equal(result.targetValue, 180_000);
  assert.equal(result.requiredStartingValue, 100_000);
  assert.equal(result.holdings.length, 2);
  assert.equal(Math.round(result.holdings.reduce((sum, item) => sum + item.targetSharePercent, 0)), 100);
});

test("toplamı yüzde 100 olmayan dağılımı reddeder", async () => {
  const { calculateBuyAndHoldPortfolio } = await import(moduleUrl.href);
  assert.throws(() => calculateBuyAndHoldPortfolio([
    { code: "ALTIN", label: "Gram altın", weightPercent: 80, multiplier: 2 },
  ], 100_000, 200_000), /%100/);
});
