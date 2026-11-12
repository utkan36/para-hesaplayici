import assert from "node:assert/strict";
import test from "node:test";
import { calculateBitcoinTryClose } from "../lib/bitcoin-price.ts";
import { compareContributionTiming, compareContributionTimingTotals } from "../lib/contribution-timing.ts";
import { calculateCostAdjustedGoal, calculateCostAndInflationOutcome, calculateCostRetentionFactor, calculateInvestmentCosts, calculatePurchasingPowerThreshold } from "../lib/investment-costs.ts";
import { analyzeInvestmentTimingSensitivity, compareInvestmentDelay } from "../lib/investment-delay.ts";
import { calculateHistoryRisk } from "../lib/history-risk.ts";
import { calculateHistoricalGoal } from "../lib/historical-goal.ts";
import { calculateLivingCoverage, compareLivingAlternatives, livingAlternativesCsvRows, readLivingCoverage } from "../lib/living-coverage.ts";
import { createPeriodProfile } from "../lib/period-profile.ts";
import { createResultLenses, parseResultLens, resultLensCsvRows } from "../lib/result-lens.ts";
import { describeRiskLimits, evaluateRiskLimits } from "../lib/risk-limits.ts";
import { parseFuelPriceValue } from "../lib/fuel-price.ts";
import {
  calculateContributionPlanWeights,
  calculateNominalGoalFromPurchasingPower,
  calculateRequiredMonthlyContribution,
} from "../lib/savings-goal.ts";
import { calculateSavingsStressScenarios } from "../lib/savings-stress.ts";
import { calculateDebt } from "../lib/debt.ts";
import { calculateSalaryPurchasingPower } from "../lib/salary-purchasing-power.ts";
import { calculateSavingsPlan } from "../lib/savings-plan.ts";
import { calculateDepositReturn } from "../lib/deposit-return.ts";
import { calculatePersonalInflation } from "../lib/personal-inflation.ts";
import { describeSharedResult } from "../app/share-metadata.ts";

test("creates safe result-specific social preview copy", () => {
  const debt = describeSharedResult(new URLSearchParams({ tool: "debt", principal: "100000", months: "12", rate: "3.5", monthlyPayment: "10348", totalPayment: "124180" }));
  assert.match(debt.title, /100\.000/);
  assert.match(debt.result, /10\.348/);
  const opportunity = describeSharedResult(new URLSearchParams({ tool: "opportunity", purchase: "<Telefon>", opportunityAmount: "15000", winner: "Gram altın", resultValue: "42000" }));
  assert.doesNotMatch(opportunity.title, /[<>]/);
  assert.match(opportunity.title, /Gram altın/);
});

test("calculates equal debt installments and zero-interest plans", () => {
  const result = calculateDebt(100_000, 3.5, 12);
  assert.ok(Math.abs(result.monthlyPayment - 10348.394926) < 0.001);
  assert.ok(Math.abs(result.totalPayment - 124180.739116) < 0.001);
  assert.ok(Math.abs(result.totalInterest - 24180.739116) < 0.001);
  assert.equal(calculateDebt(12_000, 0, 12).monthlyPayment, 1_000);
  assert.throws(() => calculateDebt(0, 3, 12), /sıfırdan büyük/i);
  assert.throws(() => calculateDebt(10_000, 3, 0), /1–600/i);
});

test("calculates salary purchasing-power gain and loss", () => {
  const lost = calculateSalaryPurchasingPower(10_000, 18_000, 100, 200);
  assert.equal(lost.requiredSalary, 20_000);
  assert.equal(lost.monthlyDifference, -2_000);
  assert.equal(lost.annualDifference, -24_000);
  assert.equal(lost.inflationPercent, 100);
  assert.equal(lost.nominalRaisePercent, 80);
  assert.ok(Math.abs(lost.realChangePercent + 10) < 0.000001);
  assert.equal(lost.currentSalaryInOldMoney, 9_000);
  assert.equal(lost.outcome, "lost");
  assert.equal(calculateSalaryPurchasingPower(10_000, 22_000, 100, 200).outcome, "gained");
  assert.equal(calculateSalaryPurchasingPower(10_000, 20_000, 100, 200).outcome, "preserved");
  assert.throws(() => calculateSalaryPurchasingPower(0, 20_000, 100, 200), /sıfırdan büyük/i);
  assert.throws(() => calculateSalaryPurchasingPower(10_000, 20_000, 200, 100), /karşılaştırılamadı/i);
});

test("calculates a regular savings plan with real value and target gap", () => {
  const flat = calculateSavingsPlan({ initialAmount: 12_000, monthlyContribution: 1_000, annualContributionIncreasePercent: 0, years: 1, annualReturnPercent: 0, annualInflationPercent: 0, targetAmount: 25_000 });
  assert.equal(flat.futureValue, 24_000);
  assert.equal(flat.realFutureValue, 24_000);
  assert.equal(flat.totalContributed, 24_000);
  assert.equal(flat.investmentGain, 0);
  assert.equal(flat.targetGap, -1_000);
  assert.equal(flat.targetProgressPercent, 96);
  const growing = calculateSavingsPlan({ initialAmount: 0, monthlyContribution: 1_000, annualContributionIncreasePercent: 10, years: 2, annualReturnPercent: 0, annualInflationPercent: 0 });
  assert.ok(Math.abs(growing.futureValue - 25_200) < 0.000001);
  assert.equal(growing.finalMonthlyContribution, 1_100);
  assert.throws(() => calculateSavingsPlan({ initialAmount: 0, monthlyContribution: 0, annualContributionIncreasePercent: 0, years: 1, annualReturnPercent: 0, annualInflationPercent: 0 }), /sıfırdan büyük/i);
});

test("calculates gross, net and inflation-adjusted deposit returns", () => {
  const result = calculateDepositReturn({ principal: 100_000, annualInterestPercent: 36.5, termDays: 100, withholdingPercent: 10, annualInflationPercent: 0 });
  assert.equal(result.grossInterest, 10_000);
  assert.equal(result.withholdingTax, 1_000);
  assert.equal(result.netInterest, 9_000);
  assert.equal(result.maturityAmount, 109_000);
  assert.equal(result.realMaturityAmount, 109_000);
  assert.equal(result.realGain, 9_000);
  assert.equal(result.netReturnPercent, 9);
  assert.throws(() => calculateDepositReturn({ principal: 0, annualInterestPercent: 40, termDays: 32, withholdingPercent: 10, annualInflationPercent: 30 }), /sıfırdan büyük/i);
  assert.throws(() => calculateDepositReturn({ principal: 100_000, annualInterestPercent: 40, termDays: 0, withholdingPercent: 10, annualInflationPercent: 30 }), /1–3\.650/i);
});

test("calculates a personal spending basket and salary threshold", () => {
  const result = calculatePersonalInflation([{ name: "Kira", oldAmount: 10_000, currentAmount: 20_000 }, { name: "Market", oldAmount: 5_000, currentAmount: 7_500 }], 30_000, 50_000);
  assert.equal(result.oldTotal, 15_000);
  assert.equal(result.currentTotal, 27_500);
  assert.equal(result.monthlyIncrease, 12_500);
  assert.equal(result.annualIncrease, 150_000);
  assert.ok(Math.abs(result.personalInflationPercent - 83.333333) < 0.00001);
  assert.equal(result.largestIncreaseItem, "Kira");
  assert.equal(result.largestIncreaseAmount, 10_000);
  assert.equal(result.requiredSalary, 55_000);
  assert.equal(result.salaryGap, -5_000);
  assert.throws(() => calculatePersonalInflation([{ name: "Kira", oldAmount: 0, currentAmount: 1_000 }]), /sıfırdan büyük/i);
});

async function loadWorker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  return (await import(workerUrl.href)).default;
}

const env = {
  ASSETS: {
    fetch: async () => new Response("Not found", { status: 404 }),
  },
};

const ctx = {
  waitUntil() {},
  passThroughOnException() {},
};

test("parses EPDK fuel prices without turning decimals into thousands", () => {
  assert.equal(parseFuelPriceValue("7.432"), 7.432);
  assert.equal(parseFuelPriceValue("7,432"), 7.432);
  assert.equal(parseFuelPriceValue("51.37 TL"), 51.37);
  assert.throws(() => parseFuelPriceValue("51367"), /makul aralığın dışında/i);
});

test("converts Yahoo BTC-USD closes to Turkish lira with the TCMB rate", () => {
  assert.equal(calculateBitcoinTryClose(50_000, 30), 1_500_000);
  assert.throws(() => calculateBitcoinTryClose(50_000, 0), /hesaplanamadı/i);
});

test("calculates the monthly contribution required for a savings goal", () => {
  assert.equal(calculateRequiredMonthlyContribution(500_000, 100_000, 40), 10_000);
  assert.equal(calculateRequiredMonthlyContribution(80_000, 100_000, 40), 0);
  assert.throws(() => calculateRequiredMonthlyContribution(500_000, 100_000, 0), /hesaplanamadı/i);
});

test("converts a purchasing-power goal to its target-date nominal amount", () => {
  assert.equal(calculateNominalGoalFromPurchasingPower(500_000, 2.5), 1_250_000);
  assert.throws(() => calculateNominalGoalFromPurchasingPower(500_000, 0), /hesaplanamadı/i);
});

test("weights monthly contributions with a yearly increase", () => {
  const multipliers = Array.from({ length: 24 }, () => 1);
  const result = calculateContributionPlanWeights(multipliers, 10);
  assert.ok(Math.abs(result.contributionFactorSum - 25.2) < 1e-10);
  assert.ok(Math.abs(result.weightedMultiplierSum - 25.2) < 1e-10);
  assert.equal(result.finalContributionFactor, 1.1);
  assert.throws(() => calculateContributionPlanWeights(multipliers, 101), /hesaplanamadı/i);
});

test("calculates a conservative missed-contribution stress test", () => {
  assert.deepEqual(calculateSavingsStressScenarios(100, 0, [3, 2, 1], 1_000, [1, 2]), [
    {
      missedCount: 1,
      missedCash: 100,
      targetLoss: 300,
      stressedTargetValue: 700,
      catchUpMonthly: 100,
    },
    {
      missedCount: 2,
      missedCash: 200,
      targetLoss: 500,
      stressedTargetValue: 500,
      catchUpMonthly: 500,
    },
  ]);
  assert.throws(() => calculateSavingsStressScenarios(100, 0, [], 1_000), /hesaplanamadı/i);
});

test("compares recurring contributions with investing the same pool upfront", () => {
  assert.deepEqual(compareContributionTiming(1_000, 3, 2, 4), {
    recurringTargetValue: 4_000,
    upfrontTargetValue: 6_000,
    difference: -2_000,
    winner: "upfront",
  });
  assert.equal(compareContributionTiming(1_000, 3, 1, 4).winner, "recurring");
  assert.equal(compareContributionTiming(0, 3, 1, 3).winner, "equal");
  assert.throws(() => compareContributionTiming(1_000, 0, 1, 3), /karşılaştırılamadı/i);
  assert.equal(compareContributionTimingTotals(4_000, 3_000, 2).winner, "upfront");
});

test("deducts entry, exit and annual costs from the historical result", () => {
  const result = calculateInvestmentCosts(100_000, 50_000, 1, 10, 10, 10);
  assert.ok(Math.abs(result.netTargetValue - 72_900) < 0.0001);
  assert.ok(Math.abs(result.costImpact - 27_100) < 0.0001);
  assert.ok(Math.abs(result.retainedPercent - 72.9) < 0.0001);
  assert.ok(Math.abs(result.netChangePercent - 45.8) < 0.0001);
  assert.throws(() => calculateInvestmentCosts(100_000, 50_000, 1, -1, 0, 0), /hesaplanamadı/i);
  assert.ok(Math.abs(calculateCostRetentionFactor(1, 10, 10, 10) - 0.729) < 0.0001);
});

test("raises the required starting capital so a historical goal survives costs", () => {
  const result = calculateCostAdjustedGoal(100_000, 200_000, 1, 10, 10, 10);
  assert.ok(Math.abs(result.retentionFactor - 0.729) < 0.0001);
  assert.ok(Math.abs(result.requiredStartingValue - 137_174.211248) < 0.0001);
  assert.ok(Math.abs(result.additionalStartingValue - 37_174.211248) < 0.0001);
  assert.ok(Math.abs(result.requiredGrossTargetValue * result.retentionFactor - 200_000) < 0.0001);
  assert.equal(result.netTargetValue, 200_000);
});

test("shows the result left after both investment costs and inflation", () => {
  const result = calculateCostAndInflationOutcome(200_000, 100_000, 1.25, 1, 10, 10, 10);
  assert.ok(Math.abs(result.netTargetValue - 145_800) < 0.0001);
  assert.ok(Math.abs(result.realTargetValue - 116_640) < 0.0001);
  assert.ok(Math.abs(result.costImpact - 54_200) < 0.0001);
  assert.ok(Math.abs(result.inflationImpact - 29_160) < 0.0001);
  assert.ok(Math.abs(result.totalDrag - 83_360) < 0.0001);
  assert.ok(Math.abs(result.realNetChangePercent - 16.64) < 0.0001);
  assert.throws(
    () => calculateCostAndInflationOutcome(200_000, 100_000, 0, 1, 0, 0, 0),
    /hesaplanamadı/i,
  );
});

test("solves the annual return needed to preserve purchasing power after costs", () => {
  const result = calculatePurchasingPowerThreshold(2, 1.25, 1, 10, 10, 10);
  assert.ok(Math.abs(result.actualAnnualReturnPercent - 100) < 0.0001);
  assert.ok(Math.abs(result.requiredAnnualReturnPercent - 71.467764) < 0.0001);
  assert.ok(Math.abs(result.marginPercentagePoints - 28.532236) < 0.0001);
  assert.ok(Math.abs(result.requiredGrossMultiplier - 1.71467764) < 0.0001);
  assert.ok(Math.abs(result.realNetMultiplier - 1.1664) < 0.0001);
  assert.equal(result.outcome, "above");
  assert.equal(calculatePurchasingPowerThreshold(1.25, 1.25, 1, 0, 0, 0).outcome, "equal");
  assert.throws(
    () => calculatePurchasingPowerThreshold(2, 1.25, 0, 0, 0, 0),
    /hesaplanamadı/i,
  );
});

test("identifies the historical cost or benefit of delaying an investment", () => {
  const delayed = compareInvestmentDelay(120_000, 100_000);
  assert.equal(delayed.difference, -20_000);
  assert.ok(Math.abs(delayed.impactPercent - 100 / 6) < 0.0001);
  assert.equal(delayed.outcome, "cost");
  assert.equal(compareInvestmentDelay(100_000, 120_000).outcome, "benefit");
  assert.equal(compareInvestmentDelay(100_000, 100_000).outcome, "equal");
  assert.throws(() => compareInvestmentDelay(100_000, -1), /hesaplanamadı/i);
});

test("rates how sensitive a result is to nearby starting dates", () => {
  const result = analyzeInvestmentTimingSensitivity(100_000, 88_000, 104_000);
  assert.equal(result.spread, 16_000);
  assert.equal(result.spreadPercent, 16);
  assert.equal(result.sensitivityLevel, "high");
  assert.equal(result.bestPosition, "earlier");
  assert.equal(result.worstPosition, "delayed");
  assert.equal(result.sampleCount, 3);
  assert.equal(analyzeInvestmentTimingSensitivity(100_000, 96_000).sensitivityLevel, "low");
  assert.equal(analyzeInvestmentTimingSensitivity(100_000, 90_000).sensitivityLevel, "medium");
  assert.throws(() => analyzeInvestmentTimingSensitivity(100_000, 0), /hesaplanamadı/i);
});

test("summarizes purchasing power, drawdown and timing without an arbitrary score", () => {
  assert.deepEqual(createPeriodProfile({
    realNetChangePercent: 18,
    maxDrawdownPercent: 8,
    timingSensitivityLevel: "low",
    timingSpreadPercent: 4,
    thresholdOutcome: "above",
  }), {
    purchasingPowerSignal: "gained",
    drawdownLevel: "low",
    tone: "positive",
    verdict: "Örneklemde sınırlı dalgalanma",
  });
  assert.equal(createPeriodProfile({
    realNetChangePercent: 18,
    maxDrawdownPercent: 32,
    timingSensitivityLevel: "medium",
    timingSpreadPercent: 8,
    thresholdOutcome: "above",
  }).verdict, "Kazandırdı ama yolculuk sert");
  assert.equal(createPeriodProfile({
    realNetChangePercent: -5,
    maxDrawdownPercent: 12,
    timingSensitivityLevel: "low",
    timingSpreadPercent: 3,
    thresholdOutcome: "below",
  }).tone, "negative");
  assert.throws(() => createPeriodProfile({
    realNetChangePercent: 1,
    maxDrawdownPercent: -1,
    timingSensitivityLevel: "low",
    timingSpreadPercent: 1,
    thresholdOutcome: "above",
  }), /oluşturulamadı/i);
});

test("measures peak-to-trough risk and recovery on the historical path", () => {
  const risk = calculateHistoryRisk([
    { date: "2024-01-01", value: 100 },
    { date: "2024-01-02", value: 120 },
    { date: "2024-01-03", value: 90 },
    { date: "2024-01-05", value: 120 },
    { date: "2024-01-06", value: 110 },
  ]);

  assert.equal(risk.maxDrawdownPercent, 25);
  assert.equal(risk.peakDate, "2024-01-02");
  assert.equal(risk.peakValue, 120);
  assert.equal(risk.troughDate, "2024-01-03");
  assert.equal(risk.troughValue, 90);
  assert.equal(risk.lossAmount, 30);
  assert.ok(Math.abs(risk.requiredRecoveryPercent - 33.333333) < 0.0001);
  assert.equal(risk.declineDays, 1);
  assert.equal(risk.recoveryDate, "2024-01-05");
  assert.equal(risk.recoveryDays, 2);
  assert.equal(risk.underwaterDays, 3);
  assert.equal(risk.worstIntervalPercent, -25);
  assert.equal(risk.positiveIntervalCount, 2);
  assert.equal(risk.positiveIntervalPercent, 50);
  assert.throws(() => calculateHistoryRisk([{ date: "2024-01-01", value: 100 }]), /en az iki/i);
});

test("keeps measuring time below the peak when the drawdown has not recovered", () => {
  const risk = calculateHistoryRisk([
    { date: "2024-01-01", value: 100 },
    { date: "2024-01-11", value: 80 },
    { date: "2024-01-31", value: 90 },
  ]);

  assert.equal(risk.recoveryDate, null);
  assert.equal(risk.recoveryDays, null);
  assert.equal(risk.underwaterDays, 30);
  assert.equal(risk.declineDays, 10);
  assert.equal(risk.requiredRecoveryPercent, 25);
});

test("compares the historical journey with transparent personal limits", () => {
  assert.deepEqual(evaluateRiskLimits({
    hasOpenDrawdown: false,
    maxDrawdownPercent: 24,
    underwaterDays: 540,
    lossLimitPercent: 20,
    durationLimitDays: 365,
  }), {
    lossExceeded: true,
    durationExceeded: true,
    durationPending: false,
    lossGapPercentagePoints: 4,
    durationGapDays: 175,
    outcome: "both-exceeded",
  });
  assert.equal(evaluateRiskLimits({
    hasOpenDrawdown: false,
    maxDrawdownPercent: 10,
    underwaterDays: 180,
    lossLimitPercent: 20,
    durationLimitDays: 365,
  }).outcome, "within");
  assert.equal(evaluateRiskLimits({
    hasOpenDrawdown: false,
    maxDrawdownPercent: 30,
    underwaterDays: 180,
    lossLimitPercent: 20,
    durationLimitDays: 365,
  }).outcome, "loss-exceeded");
  assert.throws(() => evaluateRiskLimits({
    hasOpenDrawdown: false,
    maxDrawdownPercent: 10,
    underwaterDays: 30,
    lossLimitPercent: 0,
    durationLimitDays: 365,
  }), /hesaplanamadı/i);
});

test("separates the deepest loss from a shallower but longer drawdown", () => {
  const risk = calculateHistoryRisk([
    { date: "2024-01-01", value: 100 },
    { date: "2024-01-02", value: 50 },
    { date: "2024-01-03", value: 100 },
    { date: "2024-01-04", value: 99 },
    { date: "2024-02-04", value: 99 },
    { date: "2024-03-03", value: 100 },
  ]);
  assert.equal(risk.maxDrawdownPercent, 50);
  assert.equal(risk.underwaterDays, 2);
  assert.equal(risk.longestUnderwaterDays, 60);
  assert.equal(risk.longestUnderwaterStartDate, "2024-01-03");
  assert.equal(risk.longestUnderwaterEndDate, "2024-03-03");
  assert.equal(risk.longestUnderwaterRecovered, true);
  assert.equal(risk.hasOpenDrawdown, false);
  assert.equal(risk.sampleCount, 6);
  assert.equal(risk.maxSampleGapDays, 31);
  assert.equal(evaluateRiskLimits({
    maxDrawdownPercent: risk.maxDrawdownPercent,
    underwaterDays: risk.longestUnderwaterDays,
    hasOpenDrawdown: risk.hasOpenDrawdown,
    lossLimitPercent: 60,
    durationLimitDays: 30,
  }).outcome, "duration-exceeded");
});

test("keeps an unfinished longest episode open at the final observation", () => {
  const risk = calculateHistoryRisk([
    { date: "2024-01-01", value: 100 },
    { date: "2024-01-02", value: 50 },
    { date: "2024-01-03", value: 100 },
    { date: "2024-01-04", value: 99 },
    { date: "2024-02-04", value: 99 },
  ]);
  assert.equal(risk.recoveryDate, "2024-01-03");
  assert.equal(risk.longestUnderwaterDays, 32);
  assert.equal(risk.longestUnderwaterRecovered, false);
  assert.equal(risk.hasOpenDrawdown, true);
  assert.equal(risk.longestUnderwaterEndDate, "2024-02-04");
});

test("resets an episode at the latest equal peak instead of counting a flat plateau", () => {
  const risk = calculateHistoryRisk([
    { date: "2024-01-01", value: 100 },
    { date: "2024-01-10", value: 100 },
    { date: "2024-01-11", value: 80 },
    { date: "2024-01-12", value: 100 },
  ]);
  assert.equal(risk.peakDate, "2024-01-10");
  assert.equal(risk.underwaterDays, 2);
  assert.equal(risk.longestUnderwaterDays, 2);
  assert.equal(risk.declineDays, 1);
});

test("does not invent a drawdown for rising or flat observations", () => {
  const risk = calculateHistoryRisk([
    { date: "2024-01-01", value: 100 },
    { date: "2024-01-10", value: 100 },
    { date: "2024-01-15", value: 120 },
  ]);
  assert.equal(risk.longestUnderwaterDays, 0);
  assert.equal(risk.longestUnderwaterStartDate, null);
  assert.equal(risk.longestUnderwaterEndDate, null);
  assert.equal(risk.hasOpenDrawdown, false);
  assert.equal(risk.maxSampleGapDays, 9);
});

test("rejects duplicate or invalid calendar dates and leaves input order intact", () => {
  assert.throws(() => calculateHistoryRisk([
    { date: "2024-02-29", value: 100 },
    { date: "2024-02-30", value: 90 },
  ]), /tarih geçersiz/i);
  assert.throws(() => calculateHistoryRisk([
    { date: "2024-01-01", value: 100 },
    { date: "2024-01-01", value: 90 },
  ]), /benzersiz/i);
  const points = [{ date: "2024-01-02", value: 90 }, { date: "2024-01-01", value: 100 }];
  assert.equal(calculateHistoryRisk(points).longestUnderwaterDays, 1);
  assert.equal(points[0].date, "2024-01-02");
});

test("marks unfinished recovery as pending rather than approving the time limit", () => {
  const result = evaluateRiskLimits({
    maxDrawdownPercent: 10,
    underwaterDays: 30,
    hasOpenDrawdown: true,
    lossLimitPercent: 20,
    durationLimitDays: 365,
  });
  assert.equal(result.outcome, "pending");
  assert.equal(result.durationPending, true);
  assert.equal(describeRiskLimits(result).headline, "Bekleme sonucu açık");
  assert.equal(describeRiskLimits(result).duration, "Toparlanma tamamlanmadı");
  const breached = evaluateRiskLimits({
    maxDrawdownPercent: 30,
    underwaterDays: 400,
    hasOpenDrawdown: true,
    lossLimitPercent: 20,
    durationLimitDays: 365,
  });
  assert.equal(breached.outcome, "both-exceeded");
  assert.equal(breached.durationPending, false);
});

test("keeps the time verdict open even when an older recovered episode was longer", () => {
  const risk = calculateHistoryRisk([
    { date: "2024-01-01", value: 100 },
    { date: "2024-01-02", value: 90 },
    { date: "2024-03-01", value: 100 },
    { date: "2024-03-02", value: 95 },
  ]);
  assert.equal(risk.longestUnderwaterRecovered, true);
  assert.equal(risk.hasOpenDrawdown, true);
  const result = evaluateRiskLimits({
    maxDrawdownPercent: risk.maxDrawdownPercent,
    underwaterDays: risk.longestUnderwaterDays,
    hasOpenDrawdown: risk.hasOpenDrawdown,
    lossLimitPercent: 20,
    durationLimitDays: 365,
  });
  assert.equal(result.outcome, "pending");
});

test("treats exact risk limits as non-breaches without hiding observation limits", () => {
  const result = evaluateRiskLimits({
    maxDrawdownPercent: 20 + 1e-12,
    underwaterDays: 365,
    hasOpenDrawdown: false,
    lossLimitPercent: 20,
    durationLimitDays: 365,
  });
  assert.equal(result.outcome, "within");
  assert.match(describeRiskLimits(result).loss, /Örneklemde/);
  assert.match(describeRiskLimits(result).duration, /Örneklemde/);
  assert.throws(() => evaluateRiskLimits({
    maxDrawdownPercent: 110,
    underwaterDays: 1,
    hasOpenDrawdown: false,
    lossLimitPercent: 20,
    durationLimitDays: 365,
  }), /hesaplanamadı/i);
});

test("works backwards from a historical target to the required starting amount", () => {
  assert.deepEqual(calculateHistoricalGoal(500_000, 2.5, 25), {
    requiredStartingTryValue: 200_000,
    requiredStartingCurrencyValue: 8_000,
  });
  assert.throws(() => calculateHistoricalGoal(500_000, 0, 25), /sıfırdan büyük/i);
});

test("living coverage reveals nominal growth with reduced expense coverage", () => {
  const result = calculateLivingCoverage({
    startingValue: 100_000, netTargetValue: 200_000,
    startMonthlyExpense: 10_000, targetMonthlyExpense: 25_000,
  });
  assert.equal(result.startMonths, 10);
  assert.equal(result.targetMonths, 8);
  assert.equal(result.monthDifference, -2);
  assert.equal(result.nominalNetChangePercent, 100);
  assert.equal(result.expenseChangePercent, 150);
  assert.ok(Math.abs(result.coverageChangePercent + 20) < 1e-10);
  assert.equal(result.requiredTargetValue, 250_000);
  assert.equal(result.surplus, -50_000);
  assert.equal(result.outcome, "lost");
});

test("living coverage distinguishes gains, preservation, and lower expenses", () => {
  const input = { startingValue: 100_000, netTargetValue: 300_000, startMonthlyExpense: 10_000, targetMonthlyExpense: 20_000 };
  const gain = calculateLivingCoverage(input);
  assert.equal(gain.targetMonths, 15);
  assert.equal(gain.monthDifference, 5);
  assert.equal(gain.outcome, "gained");
  assert.equal(gain.surplus, 100_000);
  const preserved = calculateLivingCoverage({ ...input, netTargetValue: 200_000 });
  assert.equal(preserved.outcome, "unchanged");
  assert.equal(preserved.surplus, 0);
  const lowerExpense = calculateLivingCoverage({ ...input, netTargetValue: 90_000, targetMonthlyExpense: 5_000 });
  assert.equal(lowerExpense.targetMonths, 18);
  assert.equal(lowerExpense.outcome, "gained");
  assert.ok(lowerExpense.nominalNetChangePercent < 0);
  assert.equal(lowerExpense.expenseChangePercent, -50);
});

test("living coverage accepts a total loss without inventing remaining months", () => {
  const result = calculateLivingCoverage({
    startingValue: 100_000, netTargetValue: 0,
    startMonthlyExpense: 10_000, targetMonthlyExpense: 20_000,
  });
  assert.equal(result.targetMonths, 0);
  assert.equal(result.monthDifference, -10);
  assert.equal(result.coverageChangePercent, -100);
  assert.equal(result.outcome, "lost");
});

test("living coverage applies the existing net investment result exactly once", () => {
  const costs = calculateInvestmentCosts(200_000, 100_000, 2, 1, 2, 3);
  const result = calculateLivingCoverage({
    startingValue: 100_000, netTargetValue: costs.netTargetValue,
    startMonthlyExpense: 10_000, targetMonthlyExpense: 20_000,
  });
  const expectedNet = 200_000 * 0.99 * 0.97 ** 2 * 0.98;
  assert.ok(Math.abs(result.targetMonths - expectedNet / 20_000) < 1e-10);
  assert.equal(result.startMonths, 10);
  assert.ok(Math.abs(result.surplus - (expectedNet - 200_000)) < 1e-8);
});

test("living coverage rejects invalid amounts and overflowing arithmetic", () => {
  const input = { startingValue: 100_000, netTargetValue: 200_000, startMonthlyExpense: 10_000, targetMonthlyExpense: 20_000 };
  for (const key of Object.keys(input)) {
    for (const invalid of [-1, NaN, Infinity, -Infinity]) {
      assert.throws(() => calculateLivingCoverage({ ...input, [key]: invalid }), /hesaplanamadı/i);
    }
    if (key !== "netTargetValue") {
      assert.throws(() => calculateLivingCoverage({ ...input, [key]: 0 }), /hesaplanamadı/i);
    }
  }
  assert.throws(() => calculateLivingCoverage({ ...input, startingValue: Number.MAX_VALUE, startMonthlyExpense: Number.MIN_VALUE }), /aralığını/i);
});

test("living coverage waits for both inputs instead of treating blank as zero", () => {
  const input = { startingValue: 100_000, netTargetValue: 200_000, startExpenseInput: "", targetExpenseInput: "" };
  assert.equal(readLivingCoverage(input).status, "empty");
  assert.equal(readLivingCoverage({ ...input, startExpenseInput: "  " }).status, "empty");
  assert.equal(readLivingCoverage({ ...input, startExpenseInput: "10000" }).status, "incomplete");
  assert.equal(readLivingCoverage({ ...input, targetExpenseInput: "20000" }).status, "incomplete");
  const ready = readLivingCoverage({ ...input, startExpenseInput: " 10000 ", targetExpenseInput: "20000" });
  assert.equal(ready.status, "ready");
  assert.equal(ready.result.outcome, "unchanged");
});

test("living coverage handles malformed and unrepresentable input without crashing", () => {
  const input = { startingValue: 100_000, netTargetValue: 200_000, startExpenseInput: "10000", targetExpenseInput: "20000" };
  for (const invalid of ["0", "-10", "NaN", "Infinity", "abc", "1e999"]) {
    assert.equal(readLivingCoverage({ ...input, startExpenseInput: invalid }).status, "error");
    assert.equal(readLivingCoverage({ ...input, targetExpenseInput: invalid }).status, "error");
  }
  assert.equal(readLivingCoverage({ ...input, startExpenseInput: "1e-320" }).status, "error");
  const fractional = readLivingCoverage({ ...input, startExpenseInput: "10000.50", targetExpenseInput: "20001" });
  assert.equal(fractional.status, "ready");
  assert.equal(fractional.result.outcome, "unchanged");
});

test("compares alternatives and cash against the same expense and selected investment", () => {
  const input = {
    startingValue: 100_000, startMonthlyExpense: 10_000, targetMonthlyExpense: 25_000,
    selected: { code: "USD", label: "Dolar", netTargetValue: 200_000 },
    alternatives: [{ code: "ALTIN", label: "Altın", netTargetValue: 300_000 }],
  };
  const before = structuredClone(input);
  const comparison = compareLivingAlternatives(input);
  assert.deepEqual(input, before);
  assert.deepEqual(comparison.rows.map((row) => [row.code, row.targetMonths, row.differenceFromSelected]), [
    ["ALTIN", 12, 4], ["USD", 8, 0], ["CASH", 4, -4],
  ]);
  assert.equal(comparison.startMonths, 10);
  assert.equal(comparison.scaleMaxMonths, 12);
  assert.equal(comparison.rows[0].monthDifference, 2);
  assert.equal(comparison.rows[1].isSelected, true);
  assert.equal(comparison.rows[2].isCash, true);
  assert.equal(comparison.rows[2].netTargetValue, 100_000);
});

test("keeps cash free of investment costs and uses net alternative results once", () => {
  const retention = calculateCostRetentionFactor(2, 1, 2, 3);
  const net = calculateInvestmentCosts(200_000, 100_000, 2, 1, 2, 3).netTargetValue;
  const comparison = compareLivingAlternatives({
    startingValue: 100_000, startMonthlyExpense: 10_000, targetMonthlyExpense: 20_000,
    selected: { code: "USD", label: "Dolar", netTargetValue: net },
    alternatives: [{ code: "EUR", label: "Euro", netTargetValue: 300_000 * retention }],
  });
  assert.equal(comparison.rows.find((row) => row.code === "USD").targetMonths, net / 20_000);
  assert.equal(comparison.rows.find((row) => row.code === "EUR").targetMonths, 300_000 * retention / 20_000);
  assert.equal(comparison.rows.find((row) => row.isCash).targetMonths, 5);
});

test("reports unavailable alternatives without turning them into zero balances", () => {
  const comparison = compareLivingAlternatives({
    startingValue: 100_000, startMonthlyExpense: 10_000, targetMonthlyExpense: 20_000,
    selected: { code: "USD", label: "Dolar", netTargetValue: 200_000 },
    alternatives: [
      { code: "BTC", label: "Bitcoin", netTargetValue: null },
      { code: "EUR", label: "Euro", netTargetValue: NaN },
      { code: "ALTIN", label: "Altın", netTargetValue: Infinity },
      { code: "BIST", label: "BIST", netTargetValue: -10 },
      { code: "ZERO", label: "Sıfır sonuç", netTargetValue: 0 },
    ],
  });
  assert.deepEqual(comparison.unavailableLabels, ["Bitcoin", "Euro", "Altın", "BIST"]);
  assert.equal(comparison.rows.length, 3);
  assert.equal(comparison.rows.at(-1).targetMonths, 0);
  assert.equal(comparison.rows.at(-1).outcome, "lost");
});

test("preserves the selected calculation and prevents duplicate or overridden cash rows", () => {
  const comparison = compareLivingAlternatives({
    startingValue: 100_000, startMonthlyExpense: 10_000, targetMonthlyExpense: 20_000,
    selected: { code: "USD", label: "Dolar", netTargetValue: 200_000 },
    alternatives: [
      { code: "USD", label: "Eski dolar", netTargetValue: 500_000 },
      { code: "CASH", label: "Yanlış nakit", netTargetValue: 500_000 },
      { code: "EUR", label: "Euro", netTargetValue: 200_000 },
      { code: "EUR", label: "Tekrar euro", netTargetValue: 200_000 },
    ],
  });
  assert.deepEqual(comparison.rows.map((row) => row.code), ["USD", "EUR", "CASH"]);
  assert.equal(comparison.rows[0].netTargetValue, 200_000);
  assert.equal(comparison.rows[2].netTargetValue, 100_000);
});

test("keeps the starting threshold in the scale even when every alternative loses coverage", () => {
  const comparison = compareLivingAlternatives({
    startingValue: 100_000, startMonthlyExpense: 10_000, targetMonthlyExpense: 50_000,
    selected: { code: "USD", label: "Dolar", netTargetValue: 200_000 }, alternatives: [],
  });
  assert.equal(comparison.startMonths, 10);
  assert.equal(comparison.scaleMaxMonths, 10);
  assert.equal(comparison.rows[0].targetMonths / comparison.scaleMaxMonths * 100, 40);
  for (const row of comparison.rows) assert.equal(row.outcome, "lost");
});

test("keeps chart ratios finite for very large valid amounts and rejects invalid common inputs", () => {
  const input = {
    startingValue: 1, startMonthlyExpense: 1, targetMonthlyExpense: 1,
    selected: { code: "USD", label: "Dolar", netTargetValue: 1e300 }, alternatives: [],
  };
  const comparison = compareLivingAlternatives(input);
  for (const row of comparison.rows) {
    const width = row.targetMonths / comparison.scaleMaxMonths * 100;
    assert.ok(Number.isFinite(width) && width >= 0 && width <= 100);
  }
  assert.throws(() => compareLivingAlternatives({ ...input, targetMonthlyExpense: 0 }), /hesaplanamadı/);
  assert.throws(() => compareLivingAlternatives({ ...input, selected: { ...input.selected, netTargetValue: NaN } }), /hesaplanamadı/);
  assert.throws(() => compareLivingAlternatives({ ...input, selected: { ...input.selected, code: "CASH" } }), /seçimi/);
});

test("exports the same alternative values, cost assumptions and missing-data notice", () => {
  const comparison = compareLivingAlternatives({
    startingValue: 100_000, startMonthlyExpense: 10_000, targetMonthlyExpense: 25_000,
    selected: { code: "USD", label: "Dolar", netTargetValue: 200_000 },
    alternatives: [{ code: "BTC", label: "Bitcoin", netTargetValue: null }],
  });
  const csv = livingAlternativesCsvRows(comparison);
  assert.deepEqual(csv.find((row) => row[0] === "Dolar"), ["Dolar", "Seçilen yatırım · ortak maliyet", 200_000, 8, -2, 0]);
  assert.deepEqual(csv.find((row) => row[0] === "Nakit TL"), ["Nakit TL", "Faizsiz ve masrafsız nakit", 100_000, 4, -6, -4]);
  assert.match(csv.find((row) => row[0] === "Yöntem")[1], /ortak yüzdeler bir kez/);
  assert.equal(csv.at(-1)[1], "Bitcoin");
});

test("result lenses distinguish gross, net and real money with matching percentages", () => {
  const lenses = createResultLenses({ startingValue: 100_000, grossTargetValue: 200_000, netTargetValue: 180_000, cpiMultiplier: 3, cpiLoading: false });
  assert.equal(lenses.gross.value, 200_000);
  assert.equal(lenses.gross.changePercent, 100);
  assert.equal(lenses.gross.priceBasis, "target");
  assert.equal(lenses.net.value, 180_000);
  assert.equal(lenses.net.changePercent, 80);
  assert.equal(lenses.real.value, 60_000);
  assert.equal(lenses.real.changePercent, -40);
  assert.equal(lenses.real.priceBasis, "start");
  assert.equal(lenses.gross.direction, "gain");
  assert.equal(lenses.real.direction, "loss");
});

test("result lenses reuse the cost-adjusted amount without applying costs twice", () => {
  const input = [200_000, 100_000, 2, 1, 2, 3];
  const costs = calculateInvestmentCosts(...input);
  const reference = calculateCostAndInflationOutcome(input[0], input[1], 2.5, ...input.slice(2));
  const lenses = createResultLenses({ startingValue: input[1], grossTargetValue: input[0], netTargetValue: costs.netTargetValue, cpiMultiplier: 2.5, cpiLoading: false });
  assert.equal(lenses.net.value, costs.netTargetValue);
  assert.equal(lenses.real.value, reference.realTargetValue);
  assert.equal(lenses.real.changePercent, reference.realNetChangePercent);
});

test("result lenses never substitute gross money when CPI is loading or missing", () => {
  const input = { startingValue: 100_000, grossTargetValue: 200_000, netTargetValue: 180_000, cpiMultiplier: null, cpiLoading: true };
  const loading = createResultLenses(input);
  assert.equal(loading.gross.status, "ready");
  assert.equal(loading.net.status, "ready");
  assert.equal(loading.real.status, "loading");
  assert.equal("value" in loading.real, false);
  const missing = createResultLenses({ ...input, cpiLoading: false });
  assert.equal(missing.real.status, "unavailable");
  assert.equal("value" in missing.real, false);
  for (const cpiMultiplier of [0, -1, NaN, Infinity]) {
    assert.equal(createResultLenses({ ...input, cpiMultiplier, cpiLoading: false }).real.status, "unavailable");
  }
});

test("result lenses preserve gross access while rejecting invalid cost results", () => {
  const input = { startingValue: 100_000, grossTargetValue: 200_000, netTargetValue: null, cpiMultiplier: 2, cpiLoading: false };
  for (const netTargetValue of [null, -1, Infinity, NaN]) {
    const lenses = createResultLenses({ ...input, netTargetValue });
    assert.equal(lenses.gross.status, "ready");
    assert.equal(lenses.net.status, "unavailable");
    assert.equal(lenses.real.status, "unavailable");
    assert.equal("value" in lenses.real, false);
  }
});

test("result lenses handle zero balances, flat returns and deflation", () => {
  const input = { startingValue: 100, grossTargetValue: 100, netTargetValue: 100, cpiMultiplier: 1, cpiLoading: false };
  const flat = createResultLenses(input);
  assert.equal(flat.gross.direction, "flat");
  assert.equal(flat.real.direction, "flat");
  const deflation = createResultLenses({ ...input, cpiMultiplier: 0.5 });
  assert.equal(deflation.real.value, 200);
  assert.equal(deflation.real.changePercent, 100);
  const loss = createResultLenses({ ...input, grossTargetValue: 0, netTargetValue: 0 });
  assert.equal(loss.real.value, 0);
  assert.equal(loss.real.changePercent, -100);
  assert.equal(loss.real.direction, "loss");
  assert.equal(createResultLenses({ ...input, grossTargetValue: 100.001 }).gross.direction, "flat");
  assert.equal(createResultLenses({ ...input, grossTargetValue: 99.999 }).gross.direction, "flat");
});

test("result lenses keep invalid and overflowing values out of the display", () => {
  const input = { startingValue: 100, grossTargetValue: 200, netTargetValue: 180, cpiMultiplier: 2, cpiLoading: false };
  for (const startingValue of [0, -1, NaN, Infinity, Number.MIN_VALUE]) {
    const lenses = createResultLenses({ ...input, startingValue });
    assert.equal(lenses.gross.status, "unavailable");
    assert.equal(lenses.net.status, "unavailable");
    assert.equal(lenses.real.status, "unavailable");
  }
  const overflow = createResultLenses({ ...input, cpiMultiplier: Number.MIN_VALUE });
  assert.equal(overflow.net.status, "ready");
  assert.equal(overflow.real.status, "unavailable");
});

test("result lenses parse old and untrusted preferences with a safe default", () => {
  assert.equal(parseResultLens("net"), "net");
  assert.equal(parseResultLens("real"), "real");
  for (const value of [undefined, null, "gross", "future", "REAL", "", {}, 1]) {
    assert.equal(parseResultLens(value), "gross");
  }
  const params = new URLSearchParams({ lens: "real" });
  assert.equal(parseResultLens(new URLSearchParams(params.toString()).get("lens")), "real");
});

test("result lenses export the selected basis and never export a fallback amount", () => {
  const input = { startingValue: 100_000, grossTargetValue: 200_000, netTargetValue: 180_000, cpiMultiplier: 3, cpiLoading: false };
  const rows = resultLensCsvRows(createResultLenses(input), "real");
  assert.deepEqual(rows[0], ["Ana kartta seçilen görünüm", "Alım gücü"]);
  assert.deepEqual(rows[1], ["Ana kart fiyat düzeyi", "Başlangıç tarihi fiyat düzeyi"]);
  assert.deepEqual(rows[2], ["Ana kart tutarı (TL)", 60_000]);
  assert.deepEqual(rows[3], ["Ana kart değişimi (%)", -40]);
  const missing = resultLensCsvRows(createResultLenses({ ...input, cpiMultiplier: null }), "real");
  assert.equal(missing.some((row) => row[0] === "Ana kart tutarı (TL)"), false);
  assert.equal(missing.some((row) => row[0] === "Ana kart durumu"), true);
});

test("renders the calculator and purchasing-power benchmarks", async () => {
  const worker = await loadWorker();

  const response = await worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    env,
    ctx,
  );

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );
  const html = await response.text();
  assert.match(html, /<title>Para Hesaplayıcı<\/title>/i);
  assert.match(html, /Paranızla ilgili kararları karşılaştırın/);
  assert.match(html, /href="\/borc-karar-merkezi"[^>]*>/);
  assert.match(html, /href="\/maas-alim-gucu-hesaplama"[^>]*>/);
  assert.match(html, /href="\/harcamanin-firsat-maliyeti"[^>]*>/);
  assert.doesNotMatch(html, /class="creator-pro-discovery"/);
  assert.match(html, /Günlük hayat/i);
  assert.match(html, /Hedeften geriye/i);
  assert.match(html, /Benzin 95/i);
  assert.match(html, /Motorin/i);
  assert.match(html, /Net asgari ücret/i);
});

test("returns official net minimum-wage periods", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(
    new Request("http://localhost/api/minimum-wage?startDate=2021-01-04&targetDate=2026-08-25"),
    env,
    ctx,
  );

  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.start.netMonthly, 2825.9);
  assert.equal(data.target.netMonthly, 28075.5);
});

test("licenses the widget to one origin and applies a monthly opening quota", async () => {
  const worker = await loadWorker();
  const config = {
    "pilot-test": { origin: "https://partner.example", tool: "refinance", brand: "Pilot Marka", color: "#176b4d", monthlyQuota: 1, expiresAt: "2099-01-01T00:00:00Z" },
  };
  let opens = 0;
  const pilotEnv = {
    ...env,
    WIDGET_PILOT_LICENSES: JSON.stringify(config),
    DB: { prepare: () => ({ bind: () => ({ run: async () => ({ meta: { changes: opens++ === 0 ? 1 : 0 } }) }) }) },
  };
  const request = (referer) => new Request("http://localhost/widget?license=pilot-test&tool=deposit", {
    headers: { accept: "text/html", referer, "sec-fetch-dest": "iframe" },
  });

  assert.equal((await worker.fetch(request("https://partner.example.evil/"), pilotEnv, ctx)).status, 403);
  assert.equal(opens, 0);
  const allowed = await worker.fetch(request("https://partner.example/"), pilotEnv, ctx);
  assert.equal(allowed.status, 200);
  assert.match(allowed.headers.get("content-security-policy"), /frame-ancestors https:\/\/partner\.example/);
  assert.match(await allowed.text(), /Pilot Marka/);
  assert.equal((await worker.fetch(request("https://partner.example/"), pilotEnv, ctx)).status, 429);
});

test("publishes the new opportunity-cost guide with a canonical URL and calculator link", async () => {
  const worker = await loadWorker();
  const path = "/finans-rehberi/simdi-almak-mi-parayi-ayirmak-mi";
  const response = await worker.fetch(new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }), env, ctx);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /rel="canonical"[^>]*simdi-almak-mi-parayi-ayirmak-mi/);
  assert.match(html, /href="\/harcamanin-firsat-maliyeti"/);
  assert.match(html, /2026-11-12/);
  const sitemap = await worker.fetch(new Request("http://localhost/sitemap.xml"), env, ctx);
  assert.equal(sitemap.status, 200);
  assert.match(await sitemap.text(), /\/finans-rehberi\/simdi-almak-mi-parayi-ayirmak-mi/);
});

test("shows pilot quota and historical usage only to the owner", async () => {
  const worker = await loadWorker();
  const month = new Date().toISOString().slice(0, 7);
  const url = "http://localhost/api/admin/widget-pilot-usage?license=pilot-test";
  const pilotEnv = {
    ...env,
    OWNER_EMAIL: "owner@example.com",
    WIDGET_PILOT_LICENSES: JSON.stringify({ "pilot-test": { origin: "https://partner.example", tool: "salary", brand: "Pilot", color: "#176b4d", monthlyQuota: 10, expiresAt: "2099-01-01T00:00:00Z" } }),
    DB: { prepare: () => ({ bind: () => ({ all: async () => ({ results: [{ month, opens: 3 }] }) }) }) },
  };
  assert.equal((await worker.fetch(new Request(url), pilotEnv, ctx)).status, 403);
  const response = await worker.fetch(new Request(url, { headers: { "oai-authenticated-user-email": pilotEnv.OWNER_EMAIL } }), pilotEnv, ctx);
  assert.equal(response.status, 200);
  const report = await response.json();
  assert.equal(report.active, true);
  assert.equal(report.remaining, 7);
  assert.equal(report.settings.brand, "Pilot");
});
