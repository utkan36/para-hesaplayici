const MIN_REASONABLE_FUEL_PRICE = 0.1;
const MAX_REASONABLE_FUEL_PRICE = 1_000;

export function parseFuelPriceValue(value: string) {
  const compact = value.trim().replace(/\s/g, "").replace(/[^0-9,.-]/g, "");
  const lastComma = compact.lastIndexOf(",");
  const lastDot = compact.lastIndexOf(".");
  const decimalSeparatorIndex = Math.max(lastComma, lastDot);

  const normalized = decimalSeparatorIndex >= 0
    ? `${compact.slice(0, decimalSeparatorIndex).replace(/[^0-9-]/g, "")}.${compact.slice(decimalSeparatorIndex + 1).replace(/\D/g, "")}`
    : compact.replace(/[^0-9-]/g, "");
  const price = Number(normalized);

  if (
    !Number.isFinite(price) ||
    price < MIN_REASONABLE_FUEL_PRICE ||
    price > MAX_REASONABLE_FUEL_PRICE
  ) {
    throw new Error("Akaryakıt fiyatı makul aralığın dışında.");
  }

  return price;
}
