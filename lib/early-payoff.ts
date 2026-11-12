export type EarlyPayoffResult = {
  scheduledRemainingCost: number;
  settlementAmount: number;
  nominalSavings: number;
  savingsPercent: number;
  monthsEliminated: number;
  verdict: "saves" | "costs_more" | "equal";
};

export function calculateEarlyPayoff(monthlyPayment: number, remainingMonths: number, settlementAmount: number): EarlyPayoffResult {
  if (![monthlyPayment, remainingMonths, settlementAmount].every(Number.isFinite)) throw new Error("Bütün alanlara geçerli bir sayı girin.");
  if (monthlyPayment <= 0 || settlementAmount <= 0) throw new Error("Taksit ve kapama tutarı sıfırdan büyük olmalı.");
  if (!Number.isInteger(remainingMonths) || remainingMonths < 1 || remainingMonths > 600) throw new Error("Kalan vade 1–600 ay arasında tam sayı olmalı.");
  const scheduledRemainingCost = monthlyPayment * remainingMonths;
  const nominalSavings = scheduledRemainingCost - settlementAmount;
  const savingsPercent = scheduledRemainingCost === 0 ? 0 : nominalSavings / scheduledRemainingCost * 100;
  return { scheduledRemainingCost, settlementAmount, nominalSavings, savingsPercent, monthsEliminated: remainingMonths, verdict: nominalSavings > 0.01 ? "saves" : nominalSavings < -0.01 ? "costs_more" : "equal" };
}
