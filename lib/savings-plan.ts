export type SavingsPlanResult = {
  futureValue: number;
  realFutureValue: number;
  totalContributed: number;
  investmentGain: number;
  finalMonthlyContribution: number;
  targetGap: number | null;
  targetProgressPercent: number | null;
};

export function calculateSavingsPlan(input: { initialAmount: number; monthlyContribution: number; annualContributionIncreasePercent: number; years: number; annualReturnPercent: number; annualInflationPercent: number; targetAmount?: number | null }): SavingsPlanResult {
  const { initialAmount, monthlyContribution, annualContributionIncreasePercent, years, annualReturnPercent, annualInflationPercent, targetAmount = null } = input;
  if (!Number.isFinite(initialAmount) || initialAmount < 0) throw new Error("Başlangıç birikimi geçersiz.");
  if (!Number.isFinite(monthlyContribution) || monthlyContribution <= 0) throw new Error("Aylık birikim sıfırdan büyük olmalı.");
  if (!Number.isFinite(annualContributionIncreasePercent) || annualContributionIncreasePercent < 0 || annualContributionIncreasePercent > 100) throw new Error("Yıllık katkı artışı %0–100 arasında olmalı.");
  if (!Number.isInteger(years) || years < 1 || years > 50) throw new Error("Süre 1–50 yıl arasında olmalı.");
  if (!Number.isFinite(annualReturnPercent) || annualReturnPercent < -100 || annualReturnPercent > 500) throw new Error("Beklenen yıllık getiri geçersiz.");
  if (!Number.isFinite(annualInflationPercent) || annualInflationPercent < -50 || annualInflationPercent > 500) throw new Error("Yıllık enflasyon varsayımı geçersiz.");
  if (targetAmount !== null && (!Number.isFinite(targetAmount) || targetAmount <= 0)) throw new Error("Hedef tutar sıfırdan büyük olmalı.");
  const monthlyReturn = (1 + annualReturnPercent / 100) ** (1 / 12) - 1;
  let futureValue = initialAmount;
  let totalContributed = initialAmount;
  let activeContribution = monthlyContribution;
  for (let month = 0; month < years * 12; month += 1) {
    if (month > 0 && month % 12 === 0) activeContribution *= 1 + annualContributionIncreasePercent / 100;
    futureValue = futureValue * (1 + monthlyReturn) + activeContribution;
    totalContributed += activeContribution;
  }
  const inflationMultiplier = (1 + annualInflationPercent / 100) ** years;
  return {
    futureValue,
    realFutureValue: futureValue / inflationMultiplier,
    totalContributed,
    investmentGain: futureValue - totalContributed,
    finalMonthlyContribution: activeContribution,
    targetGap: targetAmount === null ? null : futureValue - targetAmount,
    targetProgressPercent: targetAmount === null ? null : futureValue / targetAmount * 100,
  };
}
