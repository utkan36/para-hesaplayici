export type DepositReturnResult = {
  grossInterest: number;
  withholdingTax: number;
  netInterest: number;
  maturityAmount: number;
  realMaturityAmount: number;
  realGain: number;
  netReturnPercent: number;
};

export function calculateDepositReturn(input: { principal: number; annualInterestPercent: number; termDays: number; withholdingPercent: number; annualInflationPercent: number }): DepositReturnResult {
  const { principal, annualInterestPercent, termDays, withholdingPercent, annualInflationPercent } = input;
  if (!Number.isFinite(principal) || principal <= 0) throw new Error("Mevduat tutarı sıfırdan büyük olmalı.");
  if (!Number.isFinite(annualInterestPercent) || annualInterestPercent < 0 || annualInterestPercent > 500) throw new Error("Yıllık faiz oranı geçersiz.");
  if (!Number.isInteger(termDays) || termDays < 1 || termDays > 3650) throw new Error("Vade 1–3.650 gün arasında olmalı.");
  if (!Number.isFinite(withholdingPercent) || withholdingPercent < 0 || withholdingPercent > 100) throw new Error("Stopaj oranı %0–100 arasında olmalı.");
  if (!Number.isFinite(annualInflationPercent) || annualInflationPercent < -50 || annualInflationPercent > 500) throw new Error("Enflasyon varsayımı geçersiz.");
  const grossInterest = principal * annualInterestPercent / 100 * termDays / 365;
  const withholdingTax = grossInterest * withholdingPercent / 100;
  const netInterest = grossInterest - withholdingTax;
  const maturityAmount = principal + netInterest;
  const inflationMultiplier = (1 + annualInflationPercent / 100) ** (termDays / 365);
  const realMaturityAmount = maturityAmount / inflationMultiplier;
  return { grossInterest, withholdingTax, netInterest, maturityAmount, realMaturityAmount, realGain: realMaturityAmount - principal, netReturnPercent: netInterest / principal * 100 };
}
