export type SalaryPurchasingPowerResult = {
  requiredSalary: number;
  monthlyDifference: number;
  annualDifference: number;
  inflationPercent: number;
  nominalRaisePercent: number;
  realChangePercent: number;
  currentSalaryInOldMoney: number;
  outcome: "gained" | "lost" | "preserved";
};

export function calculateSalaryPurchasingPower(oldSalary: number, currentSalary: number, oldIndex: number, currentIndex: number): SalaryPurchasingPowerResult {
  if (!Number.isFinite(oldSalary) || oldSalary <= 0) throw new Error("Eski maaş sıfırdan büyük olmalı.");
  if (!Number.isFinite(currentSalary) || currentSalary <= 0) throw new Error("Bugünkü maaş sıfırdan büyük olmalı.");
  if (!Number.isFinite(oldIndex) || !Number.isFinite(currentIndex) || oldIndex <= 0 || currentIndex <= oldIndex) throw new Error("TÜFE endeksleri karşılaştırılamadı.");
  const inflationMultiplier = currentIndex / oldIndex;
  const requiredSalary = oldSalary * inflationMultiplier;
  const monthlyDifference = currentSalary - requiredSalary;
  const epsilon = Math.max(0.01, requiredSalary * 0.000001);
  return {
    requiredSalary,
    monthlyDifference,
    annualDifference: monthlyDifference * 12,
    inflationPercent: (inflationMultiplier - 1) * 100,
    nominalRaisePercent: (currentSalary / oldSalary - 1) * 100,
    realChangePercent: (currentSalary / requiredSalary - 1) * 100,
    currentSalaryInOldMoney: currentSalary / inflationMultiplier,
    outcome: monthlyDifference > epsilon ? "gained" : monthlyDifference < -epsilon ? "lost" : "preserved",
  };
}
