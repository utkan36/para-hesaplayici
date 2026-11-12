export type PersonalInflationItem = { name: string; oldAmount: number; currentAmount: number };
export type PersonalInflationResult = {
  oldTotal: number;
  currentTotal: number;
  monthlyIncrease: number;
  annualIncrease: number;
  personalInflationPercent: number;
  largestIncreaseItem: string;
  largestIncreaseAmount: number;
  requiredSalary: number | null;
  salaryGap: number | null;
};

export function calculatePersonalInflation(items: PersonalInflationItem[], oldSalary?: number | null, currentSalary?: number | null): PersonalInflationResult {
  if (items.length === 0 || items.some((item) => !item.name.trim() || !Number.isFinite(item.oldAmount) || !Number.isFinite(item.currentAmount) || item.oldAmount < 0 || item.currentAmount < 0)) throw new Error("Harcama sepetindeki tutarlar geçersiz.");
  const oldTotal = items.reduce((sum, item) => sum + item.oldAmount, 0);
  const currentTotal = items.reduce((sum, item) => sum + item.currentAmount, 0);
  if (oldTotal <= 0) throw new Error("Eski dönem toplam harcaması sıfırdan büyük olmalı.");
  const largest = items.reduce((leader, item) => item.currentAmount - item.oldAmount > leader.currentAmount - leader.oldAmount ? item : leader, items[0]);
  const multiplier = currentTotal / oldTotal;
  const hasSalary = oldSalary !== null && oldSalary !== undefined && currentSalary !== null && currentSalary !== undefined;
  if (hasSalary && (!Number.isFinite(oldSalary) || !Number.isFinite(currentSalary) || oldSalary! <= 0 || currentSalary! <= 0)) throw new Error("Maaş tutarları sıfırdan büyük olmalı.");
  const requiredSalary = hasSalary ? oldSalary! * multiplier : null;
  return { oldTotal, currentTotal, monthlyIncrease: currentTotal - oldTotal, annualIncrease: (currentTotal - oldTotal) * 12, personalInflationPercent: (multiplier - 1) * 100, largestIncreaseItem: largest.name, largestIncreaseAmount: largest.currentAmount - largest.oldAmount, requiredSalary, salaryGap: requiredSalary === null ? null : currentSalary! - requiredSalary };
}
