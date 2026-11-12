export function createRecurringContributionPlan(input: { monthlyAmount: number; startDate: string; targetDate: string; annualIncreasePercent: number; maxMonths?: number }) {
  const { monthlyAmount, startDate, targetDate, annualIncreasePercent, maxMonths = 120 } = input;
  if (!Number.isFinite(monthlyAmount) || monthlyAmount <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(targetDate) || startDate >= targetDate || !Number.isFinite(annualIncreasePercent) || annualIncreasePercent < 0 || annualIncreasePercent > 100) throw new Error("Düzenli harcama planı oluşturulamadı.");
  const addMonths = (value: string, offset: number) => { const [year, month, day] = value.split("-").map(Number); const date = new Date(Date.UTC(year, month - 1 + offset, day)); return date.toISOString().slice(0, 10); };
  const dates: string[] = [];
  for (let offset = 0; offset <= maxMonths; offset += 1) { const date = addMonths(startDate, offset); if (date >= targetDate) break; dates.push(date); }
  if (dates.length < 2 || dates.length > maxMonths) throw new Error("Düzenli harcama dönemi desteklenmiyor.");
  const annualMultiplier = 1 + annualIncreasePercent / 100;
  const amounts = dates.map((_, index) => monthlyAmount * annualMultiplier ** Math.floor(index / 12));
  const cohorts = Array.from({ length: Math.ceil(dates.length / 12) }, (_, cohortIndex) => { const start = cohortIndex * 12; const cohortDates = dates.slice(start, start + 12); return { date: cohortDates[Math.floor((cohortDates.length - 1) / 2)], amount: amounts.slice(start, start + cohortDates.length).reduce((total, value) => total + value, 0), contributionCount: cohortDates.length }; });
  return { contributionCount: dates.length, totalSpent: amounts.reduce((total, value) => total + value, 0), cohorts };
}
