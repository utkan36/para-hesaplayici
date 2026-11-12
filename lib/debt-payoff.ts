export type PayoffDebt = { id: string; name: string; balance: number; monthlyRatePercent: number; minimumPayment: number };
export type PayoffStrategy = "avalanche" | "snowball";
export type PayoffMonth = { month: number; remainingBalance: number; interestPaid: number; principalPaid: number; payment: number };
export type PayoffResult = { strategy: PayoffStrategy; months: number; totalInterest: number; totalPaid: number; debtFreeDate: Date; schedule: PayoffMonth[] };

const finitePositive = (value: number) => Number.isFinite(value) && value > 0;

export function calculateDebtPayoff(debts: PayoffDebt[], extraMonthlyPayment: number, strategy: PayoffStrategy, startDate = new Date()): PayoffResult {
  if (!Array.isArray(debts) || debts.length < 1 || debts.length > 12) throw new Error("1–12 arasında borç ekleyin.");
  if (!Number.isFinite(extraMonthlyPayment) || extraMonthlyPayment < 0 || extraMonthlyPayment > 10_000_000) throw new Error("Ek ödeme sıfır veya pozitif olmalı.");
  if (!(startDate instanceof Date) || Number.isNaN(startDate.getTime())) throw new Error("Başlangıç tarihi geçersiz.");
  const active = debts.map((debt) => {
    if (!debt.id || !debt.name.trim() || !finitePositive(debt.balance) || debt.balance > 1_000_000_000) throw new Error("Borç adı ve kalan tutar geçerli olmalı.");
    if (!Number.isFinite(debt.monthlyRatePercent) || debt.monthlyRatePercent < 0 || debt.monthlyRatePercent > 30) throw new Error("Aylık faiz %0–30 arasında olmalı.");
    if (!finitePositive(debt.minimumPayment) || debt.minimumPayment > 100_000_000) throw new Error("Asgari ödeme sıfırdan büyük olmalı.");
    return { ...debt, name: debt.name.trim(), balance: debt.balance };
  });
  const monthlyBudget = active.reduce((sum, debt) => sum + debt.minimumPayment, 0) + extraMonthlyPayment;
  if (!finitePositive(monthlyBudget)) throw new Error("Aylık ödeme bütçesi geçersiz.");
  let totalInterest = 0;
  let totalPaid = 0;
  const schedule: PayoffMonth[] = [];

  for (let month = 1; month <= 601; month += 1) {
    const open = active.filter((debt) => debt.balance > 0.005);
    if (!open.length) {
      const debtFreeDate = new Date(startDate);
      debtFreeDate.setMonth(debtFreeDate.getMonth() + month - 1, 1);
      return { strategy, months: month - 1, totalInterest, totalPaid, debtFreeDate, schedule };
    }
    if (month === 601) break;
    let monthlyInterest = 0;
    for (const debt of open) {
      const interest = debt.balance * debt.monthlyRatePercent / 100;
      debt.balance += interest;
      monthlyInterest += interest;
    }
    totalInterest += monthlyInterest;
    let available = monthlyBudget;
    let paidThisMonth = 0;
    for (const debt of open) {
      const payment = Math.min(debt.balance, debt.minimumPayment, available);
      debt.balance -= payment;
      available -= payment;
      paidThisMonth += payment;
    }
    const ordered = active.filter((debt) => debt.balance > 0.005).sort((a, b) => strategy === "avalanche" ? b.monthlyRatePercent - a.monthlyRatePercent || a.balance - b.balance : a.balance - b.balance || b.monthlyRatePercent - a.monthlyRatePercent);
    for (const debt of ordered) {
      if (available <= 0) break;
      const payment = Math.min(debt.balance, available);
      debt.balance -= payment;
      available -= payment;
      paidThisMonth += payment;
    }
    totalPaid += paidThisMonth;
    const remainingBalance = active.reduce((sum, debt) => sum + Math.max(0, debt.balance), 0);
    schedule.push({ month, remainingBalance, interestPaid: monthlyInterest, payment: paidThisMonth, principalPaid: Math.max(0, paidThisMonth - monthlyInterest) });
    if (!Number.isFinite(remainingBalance) || (month === 600 && remainingBalance > 0.005)) throw new Error("Bu ödeme bütçesiyle borçlar 50 yılda kapanmıyor. Asgari veya ek ödemeyi artırın.");
  }
  throw new Error("Borç planı hesaplanamadı.");
}
