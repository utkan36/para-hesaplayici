export type DebtResult = { monthlyPayment: number; totalPayment: number; totalInterest: number; monthlyRate: number; installmentCount: number };

export function calculateDebt(principal: number, monthlyRatePercent: number, installmentCount: number): DebtResult {
  if (!Number.isFinite(principal) || principal <= 0) throw new Error("Borç tutarı sıfırdan büyük olmalı.");
  if (!Number.isFinite(monthlyRatePercent) || monthlyRatePercent < 0 || monthlyRatePercent > 100) throw new Error("Aylık faiz oranı geçersiz.");
  if (!Number.isInteger(installmentCount) || installmentCount < 1 || installmentCount > 600) throw new Error("Vade 1–600 ay arasında olmalı.");
  const monthlyRate = monthlyRatePercent / 100;
  const monthlyPayment = monthlyRate === 0 ? principal / installmentCount : principal * monthlyRate * (1 + monthlyRate) ** installmentCount / ((1 + monthlyRate) ** installmentCount - 1);
  const totalPayment = monthlyPayment * installmentCount;
  return { monthlyPayment, totalPayment, totalInterest: totalPayment - principal, monthlyRate, installmentCount };
}
