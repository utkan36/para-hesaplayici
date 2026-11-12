import assert from "node:assert/strict";
import test from "node:test";
import { comparePurchaseDecision } from "../lib/purchase-decision.ts";

test("compares both end values using the same inflation factor", () => {
  const result = comparePurchaseDecision({
    price: 10_000, residualValue: 6_000, months: 12, annualNetReturn: 50, annualInflation: 20,
  });
  assert.equal(result.purchaseRealValue, 5_000);
  assert.equal(result.savingsRealValue, 12_500);
  assert.equal(result.difference, 7_500);
});

test("allows zero residual value and losses, and rejects invalid terms", () => {
  const input = { price: 10_000, residualValue: 0, months: 6, annualNetReturn: -36, annualInflation: 0 };
  assert.equal(comparePurchaseDecision(input).savingsRealValue, 8_000);
  assert.throws(() => comparePurchaseDecision({ ...input, months: 0 }));
  assert.throws(() => comparePurchaseDecision({ ...input, annualInflation: -100 }));
});

test("a lower alternative net return can reverse the choice at the same inflation and term", () => {
  const input = { price: 10_000, residualValue: 11_000, months: 12, annualNetReturn: 20, annualInflation: 25 };
  const primary = comparePurchaseDecision(input);
  const stress = comparePurchaseDecision({ ...input, annualNetReturn: 5 });
  assert.equal(stress.purchaseRealValue, primary.purchaseRealValue);
  assert.equal(primary.difference, 800);
  assert.equal(stress.difference, -400);
});
