export type ContributionTimingWinner = "recurring" | "upfront" | "equal";

export function compareContributionTimingTotals(
  recurringTargetValue: number,
  totalContributed: number,
  periodMultiplier: number,
) {
  if (
    !Number.isFinite(recurringTargetValue) ||
    !Number.isFinite(totalContributed) ||
    !Number.isFinite(periodMultiplier) ||
    recurringTargetValue < 0 ||
    totalContributed < 0 ||
    periodMultiplier <= 0
  ) {
    throw new Error("Yatırım zamanlaması karşılaştırılamadı.");
  }

  const upfrontTargetValue = totalContributed * periodMultiplier;
  const difference = recurringTargetValue - upfrontTargetValue;
  const tolerance = Math.max(recurringTargetValue, upfrontTargetValue, 1) * 1e-10;
  const winner: ContributionTimingWinner = Math.abs(difference) <= tolerance
    ? "equal"
    : difference > 0
      ? "recurring"
      : "upfront";

  return {
    recurringTargetValue,
    upfrontTargetValue,
    difference,
    winner,
  };
}

export function compareContributionTiming(
  monthlyContribution: number,
  contributionCount: number,
  periodMultiplier: number,
  contributionMultiplierSum: number,
) {
  if (
    !Number.isFinite(monthlyContribution) ||
    !Number.isInteger(contributionCount) ||
    !Number.isFinite(periodMultiplier) ||
    !Number.isFinite(contributionMultiplierSum) ||
    monthlyContribution < 0 ||
    contributionCount <= 0 ||
    periodMultiplier <= 0 ||
    contributionMultiplierSum <= 0
  ) {
    throw new Error("Yatırım zamanlaması karşılaştırılamadı.");
  }

  return compareContributionTimingTotals(
    monthlyContribution * contributionMultiplierSum,
    monthlyContribution * contributionCount,
    periodMultiplier,
  );
}
