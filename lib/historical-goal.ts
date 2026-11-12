export type HistoricalGoalResult = {
  requiredStartingTryValue: number;
  requiredStartingCurrencyValue: number;
};

export function calculateHistoricalGoal(
  targetTryValue: number,
  multiplier: number,
  startingCurrencyTryRate: number,
): HistoricalGoalResult {
  if (
    !Number.isFinite(targetTryValue) ||
    !Number.isFinite(multiplier) ||
    !Number.isFinite(startingCurrencyTryRate) ||
    targetTryValue <= 0 ||
    multiplier <= 0 ||
    startingCurrencyTryRate <= 0
  ) {
    throw new Error("Tarihsel hedef hesaplanamadı: değerler sıfırdan büyük olmalıdır.");
  }

  const requiredStartingTryValue = targetTryValue / multiplier;

  return {
    requiredStartingTryValue,
    requiredStartingCurrencyValue: requiredStartingTryValue / startingCurrencyTryRate,
  };
}
