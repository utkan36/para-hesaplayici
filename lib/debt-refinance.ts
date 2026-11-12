export type DebtRefinanceInput = {
  remainingPrincipal: number;
  currentMonthlyPayment: number;
  currentRemainingMonths: number;
  newMonthlyRatePercent: number;
  newTermMonths: number;
  refinancingCosts: number;
};

export type DebtRefinanceResult = {
  currentRemainingCost: number;
  newMonthlyPayment: number;
  newLoanPayments: number;
  newTotalCost: number;
  monthlyRelief: number;
  totalSavings: number;
  breakEvenMonths: number | null;
  verdict: "advantageous" | "costlier" | "equal";
};

const finite = (value: number) => Number.isFinite(value);

export function calculateDebtRefinance(input: DebtRefinanceInput): DebtRefinanceResult {
  const { remainingPrincipal, currentMonthlyPayment, currentRemainingMonths, newMonthlyRatePercent, newTermMonths, refinancingCosts } = input;
  if (![remainingPrincipal, currentMonthlyPayment, currentRemainingMonths, newMonthlyRatePercent, newTermMonths, refinancingCosts].every(finite)) throw new Error("Bütün alanlara geçerli bir sayı girin.");
  if (remainingPrincipal <= 0 || currentMonthlyPayment <= 0) throw new Error("Borç ve mevcut taksit sıfırdan büyük olmalı.");
  if (!Number.isInteger(currentRemainingMonths) || !Number.isInteger(newTermMonths) || currentRemainingMonths < 1 || newTermMonths < 1 || currentRemainingMonths > 600 || newTermMonths > 600) throw new Error("Vadeler 1–600 ay arasında tam sayı olmalı.");
  if (newMonthlyRatePercent < 0 || newMonthlyRatePercent > 100 || refinancingCosts < 0) throw new Error("Faiz ve masraflar negatif olamaz.");
  const rate = newMonthlyRatePercent / 100;
  const newMonthlyPayment = rate === 0 ? remainingPrincipal / newTermMonths : remainingPrincipal * rate * (1 + rate) ** newTermMonths / ((1 + rate) ** newTermMonths - 1);
  const currentRemainingCost = currentMonthlyPayment * currentRemainingMonths;
  const newLoanPayments = newMonthlyPayment * newTermMonths;
  const newTotalCost = newLoanPayments + refinancingCosts;
  const monthlyRelief = currentMonthlyPayment - newMonthlyPayment;
  const totalSavings = currentRemainingCost - newTotalCost;
  const breakEvenMonths = monthlyRelief > 0 && refinancingCosts > 0 ? Math.ceil(refinancingCosts / monthlyRelief) : refinancingCosts === 0 && monthlyRelief > 0 ? 0 : null;
  const tolerance = 0.01;
  return { currentRemainingCost, newMonthlyPayment, newLoanPayments, newTotalCost, monthlyRelief, totalSavings, breakEvenMonths, verdict: totalSavings > tolerance ? "advantageous" : totalSavings < -tolerance ? "costlier" : "equal" };
}
