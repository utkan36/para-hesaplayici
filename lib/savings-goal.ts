export function calculateRequiredMonthlyContribution(
  goalAmount: number,
  initialTargetValue: number,
  contributionMultiplierSum: number,
) {
  if (
    !Number.isFinite(goalAmount) ||
    !Number.isFinite(initialTargetValue) ||
    !Number.isFinite(contributionMultiplierSum) ||
    goalAmount <= 0 ||
    initialTargetValue < 0 ||
    contributionMultiplierSum <= 0
  ) {
    throw new Error("Birikim hedefi hesaplanamadı.");
  }

  return Math.max(0, (goalAmount - initialTargetValue) / contributionMultiplierSum);
}

export function calculateNominalGoalFromPurchasingPower(
  purchasingPowerGoal: number,
  cpiMultiplier: number,
) {
  if (
    !Number.isFinite(purchasingPowerGoal) ||
    !Number.isFinite(cpiMultiplier) ||
    purchasingPowerGoal <= 0 ||
    cpiMultiplier <= 0
  ) {
    throw new Error("Alım gücü hedefi hesaplanamadı.");
  }

  return purchasingPowerGoal * cpiMultiplier;
}

export function calculateContributionPlanWeights(
  contributionMultipliers: number[],
  annualIncreasePercent: number,
) {
  if (
    contributionMultipliers.length === 0 ||
    contributionMultipliers.some((multiplier) => !Number.isFinite(multiplier) || multiplier <= 0) ||
    !Number.isFinite(annualIncreasePercent) ||
    annualIncreasePercent < 0 ||
    annualIncreasePercent > 100
  ) {
    throw new Error("Yıllık artışlı birikim planı hesaplanamadı.");
  }

  const annualIncreaseMultiplier = 1 + annualIncreasePercent / 100;
  let contributionFactorSum = 0;
  let weightedMultiplierSum = 0;
  let finalContributionFactor = 1;

  contributionMultipliers.forEach((multiplier, index) => {
    const contributionFactor = annualIncreaseMultiplier ** Math.floor(index / 12);
    contributionFactorSum += contributionFactor;
    weightedMultiplierSum += contributionFactor * multiplier;
    finalContributionFactor = contributionFactor;
  });

  return {
    contributionFactorSum,
    weightedMultiplierSum,
    finalContributionFactor,
  };
}
