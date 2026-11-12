import test from "node:test";
import assert from "node:assert/strict";
import { calculateDebtPayoff } from "../lib/debt-payoff.ts";

const debts = [
  { id: "card", name: "Kart", balance: 45_000, monthlyRatePercent: 4.25, minimumPayment: 9_000 },
  { id: "loan", name: "Kredi", balance: 120_000, monthlyRatePercent: 3.49, minimumPayment: 12_500 },
];

test("faiz çığı aynı bütçede kartopundan daha fazla faiz üretmez", () => {
  const avalanche = calculateDebtPayoff(debts, 5_000, "avalanche", new Date("2026-09-01T12:00:00Z"));
  const snowball = calculateDebtPayoff(debts, 5_000, "snowball", new Date("2026-09-01T12:00:00Z"));
  assert.ok(avalanche.totalInterest <= snowball.totalInterest);
  assert.ok(avalanche.months > 0);
  assert.equal(avalanche.schedule.length, avalanche.months);
});

test("ek ödeme borçsuzluk süresini ve faizi azaltır", () => {
  const baseline = calculateDebtPayoff(debts, 0, "avalanche");
  const accelerated = calculateDebtPayoff(debts, 5_000, "avalanche");
  assert.ok(accelerated.months < baseline.months);
  assert.ok(accelerated.totalInterest < baseline.totalInterest);
});

test("faizsiz tek borcu doğru ödeme süresinde kapatır", () => {
  const result = calculateDebtPayoff([{ id: "one", name: "Borç", balance: 12_000, monthlyRatePercent: 0, minimumPayment: 1_000 }], 0, "snowball");
  assert.equal(result.months, 12);
  assert.equal(result.totalInterest, 0);
  assert.equal(result.totalPaid, 12_000);
});

test("geçersiz veya kapanmayan planları reddeder", () => {
  assert.throws(() => calculateDebtPayoff([], 0, "avalanche"), /1–12/);
  assert.throws(() => calculateDebtPayoff([{ id: "one", name: "Kart", balance: 100_000, monthlyRatePercent: 10, minimumPayment: 100 }], 0, "avalanche"), /50 yılda kapanmıyor/);
});

test("records actual payments and handles the 600th payment without skipping calendar months", () => {
  const start = new Date(2026, 0, 31, 12);
  const result = calculateDebtPayoff([{ id: "1", name: "Borç", balance: 600, monthlyRatePercent: 0, minimumPayment: 1 }], 0, "avalanche", start);
  assert.equal(result.months, 600);
  assert.equal(result.schedule.reduce((sum, row) => sum + row.payment, 0), result.totalPaid);
  assert.equal(result.schedule.at(-1).remainingBalance, 0);
  const oneMonth = calculateDebtPayoff([{ id: "1", name: "Borç", balance: 5, monthlyRatePercent: 0, minimumPayment: 10 }], 0, "avalanche", start);
  assert.equal(oneMonth.debtFreeDate.getMonth(), 1);
  assert.equal(oneMonth.schedule[0].payment, 5);
});
