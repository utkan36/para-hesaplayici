export type DebtIncomeInput = { monthlyNetIncome: number; essentialExpenses: number; monthlyDebtPayments: number; personalLimitPercent: number };
export type DebtIncomeResult = { debtIncomeRatioPercent: number; committedIncomePercent: number; remainingAfterEssentialsAndDebt: number; personalDebtLimit: number; debtPaymentHeadroom: number; withinPersonalLimit: boolean; stressedIncome: number; stressedDebtIncomeRatioPercent: number; stressedRemaining: number };

function finite(value: number, label: string) { if (!Number.isFinite(value)) throw new Error(`${label} geçerli bir sayı olmalı.`); }

export function calculateDebtIncomeRatio(input: DebtIncomeInput): DebtIncomeResult {
  finite(input.monthlyNetIncome, "Aylık net gelir"); finite(input.essentialExpenses, "Zorunlu gider"); finite(input.monthlyDebtPayments, "Borç ödemesi"); finite(input.personalLimitPercent, "Kişisel sınır");
  if (input.monthlyNetIncome <= 0) throw new Error("Aylık net gelir sıfırdan büyük olmalı.");
  if (input.essentialExpenses < 0 || input.monthlyDebtPayments < 0) throw new Error("Giderler ve borç ödemeleri negatif olamaz.");
  if (input.personalLimitPercent <= 0 || input.personalLimitPercent > 100) throw new Error("Kişisel borç sınırı %1 ile %100 arasında olmalı.");
  const stressedIncome = input.monthlyNetIncome * 0.9;
  const personalDebtLimit = input.monthlyNetIncome * input.personalLimitPercent / 100;
  return {
    debtIncomeRatioPercent: input.monthlyDebtPayments / input.monthlyNetIncome * 100,
    committedIncomePercent: (input.essentialExpenses + input.monthlyDebtPayments) / input.monthlyNetIncome * 100,
    remainingAfterEssentialsAndDebt: input.monthlyNetIncome - input.essentialExpenses - input.monthlyDebtPayments,
    personalDebtLimit,
    debtPaymentHeadroom: personalDebtLimit - input.monthlyDebtPayments,
    withinPersonalLimit: input.monthlyDebtPayments <= personalDebtLimit,
    stressedIncome,
    stressedDebtIncomeRatioPercent: input.monthlyDebtPayments / stressedIncome * 100,
    stressedRemaining: stressedIncome - input.essentialExpenses - input.monthlyDebtPayments,
  };
}
