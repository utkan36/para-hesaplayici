export function calculateCostRetentionFactor(
  periodYears: number,
  buyCostPercent: number,
  sellCostPercent: number,
  annualCostPercent: number,
) {
  const values = [periodYears, buyCostPercent, sellCostPercent, annualCostPercent];
  const percentages = [buyCostPercent, sellCostPercent, annualCostPercent];

  if (
    values.some((value) => !Number.isFinite(value)) ||
    periodYears < 0 ||
    percentages.some((value) => value < 0 || value >= 100)
  ) {
    throw new Error("Maliyet etkisi hesaplanamadı.");
  }

  const buyFactor = 1 - buyCostPercent / 100;
  const sellFactor = 1 - sellCostPercent / 100;
  const annualFactor = Math.pow(1 - annualCostPercent / 100, periodYears);
  return buyFactor * annualFactor * sellFactor;
}

export function calculateInvestmentCosts(
  grossTargetValue: number,
  startingValue: number,
  periodYears: number,
  buyCostPercent: number,
  sellCostPercent: number,
  annualCostPercent: number,
) {
  const values = [
    grossTargetValue,
    startingValue,
    periodYears,
    buyCostPercent,
    sellCostPercent,
    annualCostPercent,
  ];
  const percentages = [buyCostPercent, sellCostPercent, annualCostPercent];

  if (
    values.some((value) => !Number.isFinite(value)) ||
    grossTargetValue < 0 ||
    startingValue <= 0 ||
    periodYears < 0 ||
    percentages.some((value) => value < 0 || value >= 100)
  ) {
    throw new Error("Maliyet etkisi hesaplanamadı.");
  }

  const retentionFactor = calculateCostRetentionFactor(
    periodYears,
    buyCostPercent,
    sellCostPercent,
    annualCostPercent,
  );
  const netTargetValue = grossTargetValue * retentionFactor;
  const costImpact = grossTargetValue - netTargetValue;

  return {
    netTargetValue,
    costImpact,
    retainedPercent: grossTargetValue > 0 ? netTargetValue / grossTargetValue * 100 : 0,
    netChangePercent: (netTargetValue / startingValue - 1) * 100,
  };
}

export function calculateCostAdjustedGoal(
  frictionlessStartingValue: number,
  targetValue: number,
  periodYears: number,
  buyCostPercent: number,
  sellCostPercent: number,
  annualCostPercent: number,
) {
  if (
    !Number.isFinite(frictionlessStartingValue) ||
    !Number.isFinite(targetValue) ||
    frictionlessStartingValue <= 0 ||
    targetValue <= 0
  ) {
    throw new Error("Maliyet dahil hedef hesaplanamadı.");
  }

  const retentionFactor = calculateCostRetentionFactor(
    periodYears,
    buyCostPercent,
    sellCostPercent,
    annualCostPercent,
  );
  const requiredStartingValue = frictionlessStartingValue / retentionFactor;

  return {
    retentionFactor,
    requiredStartingValue,
    additionalStartingValue: requiredStartingValue - frictionlessStartingValue,
    requiredGrossTargetValue: targetValue / retentionFactor,
    netTargetValue: targetValue,
  };
}

export function calculateCostAndInflationOutcome(
  grossTargetValue: number,
  startingValue: number,
  inflationMultiplier: number,
  periodYears: number,
  buyCostPercent: number,
  sellCostPercent: number,
  annualCostPercent: number,
) {
  if (!Number.isFinite(inflationMultiplier) || inflationMultiplier <= 0) {
    throw new Error("Net alım gücü hesaplanamadı.");
  }

  const costOutcome = calculateInvestmentCosts(
    grossTargetValue,
    startingValue,
    periodYears,
    buyCostPercent,
    sellCostPercent,
    annualCostPercent,
  );
  const realTargetValue = costOutcome.netTargetValue / inflationMultiplier;

  return {
    grossTargetValue,
    netTargetValue: costOutcome.netTargetValue,
    realTargetValue,
    costImpact: costOutcome.costImpact,
    inflationImpact: costOutcome.netTargetValue - realTargetValue,
    totalDrag: grossTargetValue - realTargetValue,
    nominalNetChangePercent: costOutcome.netChangePercent,
    realNetChangePercent: (realTargetValue / startingValue - 1) * 100,
  };
}

export function calculatePurchasingPowerThreshold(
  actualGrossMultiplier: number,
  inflationMultiplier: number,
  periodYears: number,
  buyCostPercent: number,
  sellCostPercent: number,
  annualCostPercent: number,
) {
  if (
    !Number.isFinite(actualGrossMultiplier) ||
    !Number.isFinite(inflationMultiplier) ||
    actualGrossMultiplier <= 0 ||
    inflationMultiplier <= 0 ||
    !Number.isFinite(periodYears) ||
    periodYears <= 0
  ) {
    throw new Error("Alım gücü eşiği hesaplanamadı.");
  }

  const retentionFactor = calculateCostRetentionFactor(
    periodYears,
    buyCostPercent,
    sellCostPercent,
    annualCostPercent,
  );
  const requiredGrossMultiplier = inflationMultiplier / retentionFactor;
  const actualAnnualReturnPercent = (Math.pow(actualGrossMultiplier, 1 / periodYears) - 1) * 100;
  const requiredAnnualReturnPercent = (Math.pow(requiredGrossMultiplier, 1 / periodYears) - 1) * 100;
  const marginPercentagePoints = actualAnnualReturnPercent - requiredAnnualReturnPercent;

  return {
    actualAnnualReturnPercent,
    requiredAnnualReturnPercent,
    marginPercentagePoints,
    requiredGrossMultiplier,
    realNetMultiplier: actualGrossMultiplier * retentionFactor / inflationMultiplier,
    outcome: marginPercentagePoints > 0.005
      ? "above"
      : marginPercentagePoints < -0.005
        ? "below"
        : "equal",
  } as const;
}
