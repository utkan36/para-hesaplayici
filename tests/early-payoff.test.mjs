import assert from "node:assert/strict";
import test from "node:test";
import { calculateEarlyPayoff } from "../lib/early-payoff.ts";

test("erken kapamanın nominal tasarrufunu hesaplar", () => { const result = calculateEarlyPayoff(12_500, 18, 180_000); assert.equal(result.scheduledRemainingCost, 225_000); assert.equal(result.nominalSavings, 45_000); assert.equal(result.savingsPercent, 20); assert.equal(result.verdict, "saves"); });
test("pahalı kapama teklifini avantajlı göstermez", () => { const result = calculateEarlyPayoff(10_000, 10, 105_000); assert.equal(result.nominalSavings, -5_000); assert.equal(result.verdict, "costs_more"); });
test("geçersiz erken kapama girdilerini reddeder", () => { assert.throws(() => calculateEarlyPayoff(0, 12, 100_000), /sıfırdan büyük/i); assert.throws(() => calculateEarlyPayoff(10_000, 12.5, 100_000), /tam sayı/i); });
