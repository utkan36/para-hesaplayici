export type SavingsStressScenario = {
  missedCount: number;
  missedCash: number;
  targetLoss: number;
  stressedTargetValue: number;
  catchUpMonthly: number | null;
};

export function calculateSavingsStressScenarios(
  initialMonthlyContribution: number,
  annualIncreasePercent: number,
  netContributionMultipliers: number[],
  baseTargetValue: number,
  missedCounts: number[] = [1, 3, 6],
): SavingsStressScenario[] {
  if (
    !Number.isFinite(initialMonthlyContribution) ||
    !Number.isFinite(annualIncreasePercent) ||
    !Number.isFinite(baseTargetValue) ||
    initialMonthlyContribution < 0 ||
    annualIncreasePercent < 0 ||
    annualIncreasePercent > 100 ||
    baseTargetValue < 0 ||
    netContributionMultipliers.length === 0 ||
    netContributionMultipliers.some((multiplier) => !Number.isFinite(multiplier) || multiplier <= 0) ||
    missedCounts.some((count) => !Number.isInteger(count) || count <= 0)
  ) {
    throw new Error("Plan dayanıklılığı hesaplanamadı.");
  }

  const annualIncreaseMultiplier = 1 + annualIncreasePercent / 100;
  const contributions = netContributionMultipliers.map((multiplier, index) => {
    const cash = initialMonthlyContribution * annualIncreaseMultiplier ** Math.floor(index / 12);
    return {
      cash,
      index,
      multiplier,
      targetValue: cash * multiplier,
    };
  });

  return [...new Set(missedCounts)]
    .filter((count) => count <= contributions.length)
    .sort((first, second) => first - second)
    .map((missedCount) => {
      const missed = [...contributions]
        .sort((first, second) => second.targetValue - first.targetValue || first.index - second.index)
        .slice(0, missedCount);
      const missedIndices = new Set(missed.map((item) => item.index));
      const targetLoss = missed.reduce((total, item) => total + item.targetValue, 0);
      const remainingMultiplierSum = contributions.reduce(
        (total, item) => total + (missedIndices.has(item.index) ? 0 : item.multiplier),
        0,
      );

      return {
        missedCount,
        missedCash: missed.reduce((total, item) => total + item.cash, 0),
        targetLoss,
        stressedTargetValue: Math.max(0, baseTargetValue - targetLoss),
        catchUpMonthly: remainingMultiplierSum > 0 ? targetLoss / remainingMultiplierSum : null,
      };
    });
}
