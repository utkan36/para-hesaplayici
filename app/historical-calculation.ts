import { calculateHistoricalGoal } from "../lib/historical-goal";
import { calculateNominalGoalFromPurchasingPower } from "../lib/savings-goal";
import { FUEL_DATA_VERSION, BITCOIN_DATA_VERSION, type IndexCode, type RateSnapshot, type CpiSnapshot, type GoldSnapshot, type BistSnapshot, type BitcoinSnapshot, type FuelSnapshot, type MinimumWageSnapshot } from "./historical-data-client";

export type CurrencyCode = "TRY" | "USD" | "EUR";

export type CalculationMode = "forward" | "reverse";

type LiveIndexCode = "USD" | "EUR";

export type SavingsGoalValueMode = "nominal" | "purchasing-power";

type DepositSnapshot = {
  requestedDate: string;
  actualDate: string;
  annualRate: number;
};

export type CalculationResult = {
  calculationMode: CalculationMode;
  goalValueMode: SavingsGoalValueMode | null;
  inputAmount: number;
  numericAmount: number;
  startingTryValue: number;
  targetTryValue: number;
  targetSelectedCurrencyValue: number;
  multiplier: number;
  changePercent: number;
  startRate: number;
  targetRate: number;
  startReference: string;
  targetReference: string;
  startReferenceRaw: string;
  targetReferenceRaw: string;
  startRequestedRaw: string;
  targetRequestedRaw: string;
  valueLabel: string;
  valueFormat: "money" | "index" | "percent";
  fallbackNote: string;
  methodologyNote: string;
  comparisonQuantity: number | null;
  comparisonUnit: string;
};

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00Z`));
}

export function formatPeriod(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}-15T12:00:00Z`));
}

export async function calculateHistoricalResult({
  startDate, targetDate, currency, indexCode, calculationMode, reverseGoalValueMode, numericAmount,
}: {
  startDate: string;
  targetDate: string;
  currency: CurrencyCode;
  indexCode: IndexCode;
  calculationMode: CalculationMode;
  reverseGoalValueMode: SavingsGoalValueMode;
  numericAmount: number;
}) {
  const query = new URLSearchParams({ startDate, targetDate });
  const fxResponse = await fetch(`/api/fx?${query.toString()}`, { cache: "no-store" });
  const fxData = await fxResponse.json() as { start?: RateSnapshot; target?: RateSnapshot; error?: string };

  if (!fxResponse.ok || !fxData.start || !fxData.target) {
    throw new Error(fxData.error || "Kur verisi alınamadı.");
  }

  const startCurrencyTry = currency === "TRY" ? 1 : fxData.start[currency];
  const targetCurrencyTry = currency === "TRY" ? 1 : fxData.target[currency];
  let startRate: number;
  let targetRate: number;
  let startReference = formatDate(fxData.start.actualDate);
  let targetReference = formatDate(fxData.target.actualDate);
  let startReferenceRaw = fxData.start.actualDate;
  let targetReferenceRaw = fxData.target.actualDate;
  let startRequestedRaw = fxData.start.requestedDate;
  let targetRequestedRaw = fxData.target.requestedDate;
  let valueLabel = "kur";
  let valueFormat: "money" | "index" | "percent" = "money";
  let fallbackNote = "İşlem günü olmayan tarihler için önceki yayımlanmış kur kullanıldı.";
  let methodologyNote = "";
  let multiplierOverride: number | null = null;
  let comparisonUnit = "";
  let goalCpiMultiplier: number | null = null;

  if (indexCode === "TUFE") {
    const cpiResponse = await fetch(`/api/cpi?${query.toString()}`, { cache: "no-store" });
    const cpiData = await cpiResponse.json() as { start?: CpiSnapshot; target?: CpiSnapshot; error?: string };

    if (!cpiResponse.ok || !cpiData.start || !cpiData.target) {
      throw new Error(cpiData.error || "TÜFE verisi alınamadı.");
    }

    startRate = cpiData.start.indexValue;
    targetRate = cpiData.target.indexValue;
    goalCpiMultiplier = targetRate / startRate;
    startReference = formatPeriod(cpiData.start.actualPeriod);
    targetReference = formatPeriod(cpiData.target.actualPeriod);
    startReferenceRaw = cpiData.start.actualPeriod;
    targetReferenceRaw = cpiData.target.actualPeriod;
    startRequestedRaw = cpiData.start.requestedPeriod;
    targetRequestedRaw = cpiData.target.requestedPeriod;
    valueLabel = "endeksi";
    valueFormat = "index";
    fallbackNote = "Seçilen ayın TÜFE verisi henüz yayımlanmamışsa son açıklanan ay kullanıldı.";
  } else if (indexCode === "ALTIN") {
    const goldResponse = await fetch(`/api/gold?${query.toString()}`, { cache: "no-store" });
    const goldData = await goldResponse.json() as { start?: GoldSnapshot; target?: GoldSnapshot; error?: string };

    if (!goldResponse.ok || !goldData.start || !goldData.target) {
      throw new Error(goldData.error || "Altın verisi alınamadı.");
    }

    startRate = goldData.start.gramTry;
    targetRate = goldData.target.gramTry;
    startReference = formatDate(goldData.start.actualDate);
    targetReference = formatDate(goldData.target.actualDate);
    startReferenceRaw = goldData.start.actualDate;
    targetReferenceRaw = goldData.target.actualDate;
    startRequestedRaw = goldData.start.requestedDate;
    targetRequestedRaw = goldData.target.requestedDate;
    valueLabel = "gram fiyatı";
    fallbackNote = "Altın fiyatının yayımlanmadığı günler için önceki referans günü kullanıldı.";
  } else if (indexCode === "BIST") {
    const bistResponse = await fetch(`/api/bist?${query.toString()}`, { cache: "no-store" });
    const bistData = await bistResponse.json() as { start?: BistSnapshot; target?: BistSnapshot; error?: string };

    if (!bistResponse.ok || !bistData.start || !bistData.target) {
      throw new Error(bistData.error || "BIST 100 verisi alınamadı.");
    }

    startRate = bistData.start.close;
    targetRate = bistData.target.close;
    startReference = formatDate(bistData.start.actualDate);
    targetReference = formatDate(bistData.target.actualDate);
    startReferenceRaw = bistData.start.actualDate;
    targetReferenceRaw = bistData.target.actualDate;
    startRequestedRaw = bistData.start.requestedDate;
    targetRequestedRaw = bistData.target.requestedDate;
    valueLabel = "endeks seviyesi";
    valueFormat = "index";
    fallbackNote = "Borsanın kapalı olduğu günler için önceki işlem gününün kapanışı kullanıldı.";
  } else if (indexCode === "BTC") {
    const bitcoinQuery = new URLSearchParams(query);
    bitcoinQuery.set("v", BITCOIN_DATA_VERSION);
    const bitcoinResponse = await fetch(`/api/bitcoin?${bitcoinQuery.toString()}`, { cache: "no-store" });
    const bitcoinData = await bitcoinResponse.json() as { start?: BitcoinSnapshot; target?: BitcoinSnapshot; error?: string };

    if (!bitcoinResponse.ok || !bitcoinData.start || !bitcoinData.target) {
      throw new Error(bitcoinData.error || "Bitcoin verisi alınamadı.");
    }

    startRate = bitcoinData.start.closeTry;
    targetRate = bitcoinData.target.closeTry;
    startReference = formatDate(bitcoinData.start.actualDate);
    targetReference = formatDate(bitcoinData.target.actualDate);
    startReferenceRaw = bitcoinData.start.actualDate;
    targetReferenceRaw = bitcoinData.target.actualDate;
    startRequestedRaw = bitcoinData.start.requestedDate;
    targetRequestedRaw = bitcoinData.target.requestedDate;
    valueLabel = "Bitcoin fiyatı";
    fallbackNote = "Seçilen gün için kapanış verisi bulunamazsa önceki günlük BTC/TRY kapanışı kullanıldı.";
    methodologyNote = "Hesaplama, Yahoo Finance günlük BTC/USD kapanışını aynı tarihte bilinen son TCMB USD/TL kuruyla Türk lirasına çevirir; alım-satım komisyonu ve vergi hesaba katılmaz.";
  } else if (indexCode === "FAIZ") {
    const depositResponse = await fetch(`/api/deposit?${query.toString()}`, { cache: "no-store" });
    const depositData = await depositResponse.json() as {
      start?: DepositSnapshot;
      target?: DepositSnapshot;
      multiplier?: number;
      termDays?: number;
      renewalCount?: number;
      error?: string;
    };

    if (!depositResponse.ok || !depositData.start || !depositData.target || typeof depositData.multiplier !== "number") {
      throw new Error(depositData.error || "Mevduat faizi verisi alınamadı.");
    }

    startRate = depositData.start.annualRate;
    targetRate = depositData.target.annualRate;
    multiplierOverride = depositData.multiplier;
    startReference = formatDate(depositData.start.actualDate);
    targetReference = formatDate(depositData.target.actualDate);
    startReferenceRaw = depositData.start.actualDate;
    targetReferenceRaw = depositData.target.actualDate;
    startRequestedRaw = depositData.start.requestedDate;
    targetRequestedRaw = depositData.target.requestedDate;
    valueLabel = "yıllık brüt faizi";
    valueFormat = "percent";
    fallbackNote = "Seçilen gün için o tarihte bilinen son haftalık TCMB mevduat faizi kullanıldı.";
    methodologyNote = `Hesaplama, TCMB'nin 1 aya kadar vadeli TL mevduat ağırlıklı ortalama faizini kullanır. Tutar ${depositData.termDays || 32} günde bir brüt faizle yenilenmiş kabul edilir; stopaj, banka kampanyaları ve vade bozumu hesaba katılmaz.`;
  } else if (indexCode === "BENZIN" || indexCode === "MOTORIN") {
    const fuelQuery = new URLSearchParams({
      startDate,
      targetDate,
      fuel: indexCode === "BENZIN" ? "gasoline" : "diesel",
      v: FUEL_DATA_VERSION,
    });
    const fuelResponse = await fetch(`/api/fuel?${fuelQuery.toString()}`, { cache: "no-store" });
    const fuelData = await fuelResponse.json() as { start?: FuelSnapshot; target?: FuelSnapshot; error?: string };

    if (!fuelResponse.ok || !fuelData.start || !fuelData.target) {
      throw new Error(fuelData.error || "Akaryakıt fiyatı alınamadı.");
    }

    startRate = fuelData.start.pricePerLiter;
    targetRate = fuelData.target.pricePerLiter;
    startReference = formatDate(fuelData.start.actualDate);
    targetReference = formatDate(fuelData.target.actualDate);
    startReferenceRaw = fuelData.start.actualDate;
    targetReferenceRaw = fuelData.target.actualDate;
    startRequestedRaw = fuelData.start.requestedDate;
    targetRequestedRaw = fuelData.target.requestedDate;
    valueLabel = "litre fiyatı";
    comparisonUnit = "litre";
    fallbackNote = "Seçilen tarih için önceki yayımlanmış EPDK akaryakıt fiyatı kullanıldı.";
    methodologyNote = "Hesaplama, EPDK'nın en yüksek işlem hacmine sahip sekiz firmanın günlük ortalama bayi satış fiyatını kullanır; şehir ve istasyon bazındaki farklar sonucu değiştirebilir.";
  } else if (indexCode === "ASGARI") {
    const wageResponse = await fetch(`/api/minimum-wage?${query.toString()}`, { cache: "no-store" });
    const wageData = await wageResponse.json() as { start?: MinimumWageSnapshot; target?: MinimumWageSnapshot; error?: string };

    if (!wageResponse.ok || !wageData.start || !wageData.target) {
      throw new Error(wageData.error || "Asgari ücret verisi alınamadı.");
    }

    startRate = wageData.start.netMonthly;
    targetRate = wageData.target.netMonthly;
    startReference = formatDate(wageData.start.actualDate);
    targetReference = formatDate(wageData.target.actualDate);
    startReferenceRaw = wageData.start.actualDate;
    targetReferenceRaw = wageData.target.actualDate;
    startRequestedRaw = wageData.start.requestedDate;
    targetRequestedRaw = wageData.target.requestedDate;
    valueLabel = "aylık net ücret";
    comparisonUnit = "aylık ücret";
    fallbackNote = "Seçilen tarihte yürürlükte olan resmî net asgari ücret kullanıldı.";
    methodologyNote = "Hesaplama, seçilen tarihlerde yürürlükte olan aylık net asgari ücret tutarlarını karşılaştırır; sosyal yardımlar ve diğer gelirler hesaba katılmaz.";
  } else {
    const liveIndex = indexCode as LiveIndexCode;
    startRate = fxData.start[liveIndex];
    targetRate = fxData.target[liveIndex];
  }

  if (
    calculationMode === "reverse" &&
    reverseGoalValueMode === "purchasing-power" &&
    goalCpiMultiplier === null
  ) {
    const goalCpiResponse = await fetch(`/api/cpi?${query.toString()}`, { cache: "no-store" });
    const goalCpiData = await goalCpiResponse.json() as { start?: CpiSnapshot; target?: CpiSnapshot; error?: string };

    if (!goalCpiResponse.ok || !goalCpiData.start || !goalCpiData.target) {
      throw new Error(goalCpiData.error || "Alım gücü hedefi için TÜFE verisi alınamadı.");
    }

    goalCpiMultiplier = goalCpiData.target.indexValue / goalCpiData.start.indexValue;
  }

  const multiplier = multiplierOverride ?? targetRate / startRate;
  const reverseTargetTryValue = calculationMode === "reverse" && reverseGoalValueMode === "purchasing-power"
    ? calculateNominalGoalFromPurchasingPower(numericAmount, goalCpiMultiplier!)
    : numericAmount;
  const historicalGoal = calculationMode === "reverse"
    ? calculateHistoricalGoal(reverseTargetTryValue, multiplier, startCurrencyTry)
    : null;
  const startingTryValue = historicalGoal?.requiredStartingTryValue ?? numericAmount * startCurrencyTry;
  const startingCurrencyValue = historicalGoal?.requiredStartingCurrencyValue ?? numericAmount;
  const targetTryValue = calculationMode === "reverse" ? reverseTargetTryValue : startingTryValue * multiplier;

  const result: CalculationResult = {
    calculationMode,
    goalValueMode: calculationMode === "reverse" ? reverseGoalValueMode : null,
    inputAmount: numericAmount,
    numericAmount: startingCurrencyValue,
    startingTryValue,
    targetTryValue,
    targetSelectedCurrencyValue: targetTryValue / targetCurrencyTry,
    multiplier,
    changePercent: (multiplier - 1) * 100,
    startRate,
    targetRate,
    startReference,
    targetReference,
    startReferenceRaw,
    targetReferenceRaw,
    startRequestedRaw,
    targetRequestedRaw,
    valueLabel,
    valueFormat,
    fallbackNote,
    methodologyNote,
    comparisonQuantity: comparisonUnit ? startingTryValue / startRate : null,
    comparisonUnit,
  };
  return { result, query, fxStart: fxData.start, fxTarget: fxData.target };
}
