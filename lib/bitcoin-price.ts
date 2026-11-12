export function calculateBitcoinTryClose(closeUsd: number, usdTryRate: number) {
  const closeTry = closeUsd * usdTryRate;

  if (
    !Number.isFinite(closeUsd) ||
    !Number.isFinite(usdTryRate) ||
    closeUsd <= 0 ||
    usdTryRate <= 0 ||
    !Number.isFinite(closeTry) ||
    closeTry <= 0
  ) {
    throw new Error("Bitcoin/TL fiyatı hesaplanamadı.");
  }

  return closeTry;
}
