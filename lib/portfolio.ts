export type PortfolioHolding = {
  code: string;
  label: string;
  weightPercent: number;
  multiplier: number;
};

export type PortfolioHoldingResult = PortfolioHolding & {
  startingValue: number;
  targetValue: number;
  targetSharePercent: number;
  contributionPercent: number;
};

export type PortfolioResult = {
  totalWeightPercent: number;
  multiplier: number;
  changePercent: number;
  startingValue: number;
  targetValue: number;
  requiredStartingValue: number;
  holdings: PortfolioHoldingResult[];
};

const EPSILON = 0.000001;

export function calculateBuyAndHoldPortfolio(
  holdings: PortfolioHolding[],
  startingValue: number,
  targetValue: number,
): PortfolioResult {
  if (!Number.isFinite(startingValue) || startingValue <= 0) {
    throw new Error("Portföy başlangıç tutarı sıfırdan büyük olmalıdır.");
  }
  if (!Number.isFinite(targetValue) || targetValue <= 0) {
    throw new Error("Portföy hedef tutarı sıfırdan büyük olmalıdır.");
  }
  if (holdings.length === 0) throw new Error("Portföyde en az bir yatırım aracı bulunmalıdır.");

  const totalWeightPercent = holdings.reduce((total, holding) => {
    if (!Number.isFinite(holding.weightPercent) || holding.weightPercent < 0 || holding.weightPercent > 100) {
      throw new Error("Portföy yüzdeleri 0 ile 100 arasında olmalıdır.");
    }
    if (!Number.isFinite(holding.multiplier) || holding.multiplier <= 0) {
      throw new Error("Portföy ölçüt çarpanları sıfırdan büyük olmalıdır.");
    }
    return total + holding.weightPercent;
  }, 0);

  if (Math.abs(totalWeightPercent - 100) > EPSILON) {
    throw new Error("Portföy dağılımı toplamda %100 olmalıdır.");
  }

  const multiplier = holdings.reduce(
    (total, holding) => total + (holding.weightPercent / 100) * holding.multiplier,
    0,
  );
  const calculatedTargetValue = startingValue * multiplier;
  const requiredStartingValue = targetValue / multiplier;

  const holdingResults = holdings
    .filter((holding) => holding.weightPercent > 0)
    .map((holding) => {
      const holdingStartingValue = startingValue * holding.weightPercent / 100;
      const holdingTargetValue = holdingStartingValue * holding.multiplier;
      return {
        ...holding,
        startingValue: holdingStartingValue,
        targetValue: holdingTargetValue,
        targetSharePercent: calculatedTargetValue > 0 ? holdingTargetValue / calculatedTargetValue * 100 : 0,
        contributionPercent: calculatedTargetValue > startingValue
          ? (holdingTargetValue - holdingStartingValue) / (calculatedTargetValue - startingValue) * 100
          : 0,
      };
    })
    .sort((first, second) => second.targetValue - first.targetValue);

  return {
    totalWeightPercent,
    multiplier,
    changePercent: (multiplier - 1) * 100,
    startingValue,
    targetValue: calculatedTargetValue,
    requiredStartingValue,
    holdings: holdingResults,
  };
}
