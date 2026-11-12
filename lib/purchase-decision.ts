type PurchaseDecisionInput = {
  price: number;
  residualValue: number;
  months: number;
  annualNetReturn: number;
  annualInflation: number;
};

export function comparePurchaseDecision({
  price, residualValue, months, annualNetReturn, annualInflation,
}: PurchaseDecisionInput) {
  if (![price, residualValue, months, annualNetReturn, annualInflation].every(Number.isFinite)
    || price <= 0 || residualValue < 0 || !Number.isInteger(months) || months < 1 || months > 120
    || annualNetReturn <= -100 || annualInflation <= -100) {
    throw new Error("Geçerli bir fiyat, değer, oran ve 1–120 ay arasında bir süre girin.");
  }

  const years = months / 12;
  const inflationFactor = (1 + annualInflation / 100) ** years;
  const savingsValue = price * (1 + annualNetReturn / 100) ** years;
  const purchaseRealValue = residualValue / inflationFactor;
  const savingsRealValue = savingsValue / inflationFactor;
  if (![savingsValue, purchaseRealValue, savingsRealValue].every(Number.isFinite)) {
    throw new Error("Girilen değerlerle hesaplama yapılamadı.");
  }

  return { purchaseRealValue, savingsRealValue, savingsValue, difference: savingsRealValue - purchaseRealValue };
}
