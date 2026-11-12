export type InvestmentDelayOutcome = "cost" | "benefit" | "equal";
export type TimingPosition = "earlier" | "selected" | "delayed";
export type TimingSensitivityLevel = "low" | "medium" | "high";

export function compareInvestmentDelay(originalTargetValue: number, delayedTargetValue: number) {
  if (
    !Number.isFinite(originalTargetValue) ||
    !Number.isFinite(delayedTargetValue) ||
    originalTargetValue < 0 ||
    delayedTargetValue < 0
  ) {
    throw new Error("Gecikme etkisi hesaplanamadı.");
  }

  const difference = delayedTargetValue - originalTargetValue;
  const tolerance = Math.max(originalTargetValue, delayedTargetValue, 1) * 1e-10;
  const outcome: InvestmentDelayOutcome = Math.abs(difference) <= tolerance
    ? "equal"
    : difference < 0
      ? "cost"
      : "benefit";

  return {
    difference,
    impactPercent: originalTargetValue > 0 ? Math.abs(difference) / originalTargetValue * 100 : 0,
    outcome,
  };
}

export function analyzeInvestmentTimingSensitivity(
  originalTargetValue: number,
  delayedTargetValue: number,
  earlierTargetValue: number | null = null,
) {
  const values = [originalTargetValue, delayedTargetValue, ...(earlierTargetValue === null ? [] : [earlierTargetValue])];
  if (values.some((value) => !Number.isFinite(value) || value <= 0)) {
    throw new Error("Tarih hassasiyeti hesaplanamadı.");
  }

  const scenarios: { position: TimingPosition; value: number }[] = [
    { position: "selected", value: originalTargetValue },
    { position: "delayed", value: delayedTargetValue },
    ...(earlierTargetValue === null ? [] : [{ position: "earlier" as const, value: earlierTargetValue }]),
  ];
  const best = scenarios.reduce((current, item) => item.value > current.value ? item : current);
  const worst = scenarios.reduce((current, item) => item.value < current.value ? item : current);
  const spread = best.value - worst.value;
  const spreadPercent = spread / originalTargetValue * 100;
  const sensitivityLevel: TimingSensitivityLevel = spreadPercent <= 5
    ? "low"
    : spreadPercent <= 15
      ? "medium"
      : "high";

  return {
    ...compareInvestmentDelay(originalTargetValue, delayedTargetValue),
    spread,
    spreadPercent,
    sensitivityLevel,
    bestPosition: best.position,
    worstPosition: worst.position,
    sampleCount: scenarios.length,
  };
}
