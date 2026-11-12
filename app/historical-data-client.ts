export type IndexCode = "TUFE" | "USD" | "EUR" | "ALTIN" | "BIST" | "FAIZ" | "BTC" | "BENZIN" | "MOTORIN" | "ASGARI";

export type RateSnapshot = {
  requestedDate: string;
  actualDate: string;
  USD: number;
  EUR: number;
};

export type CpiSnapshot = {
  requestedPeriod: string;
  actualPeriod: string;
  indexValue: number;
  monthlyChange: number;
  annualChange: number;
};

export type GoldSnapshot = {
  requestedDate: string;
  actualDate: string;
  gramTry: number;
  ounceTry: number;
};

export type BistSnapshot = {
  requestedDate: string;
  actualDate: string;
  close: number;
};

export type BitcoinSnapshot = {
  requestedDate: string;
  actualDate: string;
  closeTry: number;
};

export type FuelSnapshot = {
  requestedDate: string;
  actualDate: string;
  pricePerLiter: number;
};

export type MinimumWageSnapshot = {
  requestedDate: string;
  actualDate: string;
  periodStart: string;
  netMonthly: number;
};

export const FUEL_DATA_VERSION = "2";

export const BITCOIN_DATA_VERSION = "2";

export async function fetchComparisonData<T>(url: string, fallbackMessage: string) {
  const response = await fetch(url, { cache: "no-store" });
  const data = await response.json() as T & { error?: string };

  if (!response.ok) {
    throw new Error(data.error || fallbackMessage);
  }

  return data;
}

export async function getComparisonMultiplier(
  code: IndexCode,
  query: URLSearchParams,
  fxStart: RateSnapshot,
  fxTarget: RateSnapshot,
) {
  if (code === "USD" || code === "EUR") {
    return fxTarget[code] / fxStart[code];
  }

  if (code === "TUFE") {
    const data = await fetchComparisonData<{ start?: CpiSnapshot; target?: CpiSnapshot }>(
      `/api/cpi?${query.toString()}`,
      "TÜFE verisi alınamadı.",
    );
    if (!data.start || !data.target) throw new Error("TÜFE verisi eksik.");
    return data.target.indexValue / data.start.indexValue;
  }

  if (code === "ALTIN") {
    const data = await fetchComparisonData<{ start?: GoldSnapshot; target?: GoldSnapshot }>(
      `/api/gold?${query.toString()}`,
      "Altın verisi alınamadı.",
    );
    if (!data.start || !data.target) throw new Error("Altın verisi eksik.");
    return data.target.gramTry / data.start.gramTry;
  }

  if (code === "BIST") {
    const data = await fetchComparisonData<{ start?: BistSnapshot; target?: BistSnapshot }>(
      `/api/bist?${query.toString()}`,
      "BIST 100 verisi alınamadı.",
    );
    if (!data.start || !data.target) throw new Error("BIST 100 verisi eksik.");
    return data.target.close / data.start.close;
  }

  if (code === "FAIZ") {
    const data = await fetchComparisonData<{ multiplier?: number }>(
      `/api/deposit?${query.toString()}`,
      "Mevduat faizi verisi alınamadı.",
    );
    if (typeof data.multiplier !== "number") throw new Error("Mevduat faizi verisi eksik.");
    return data.multiplier;
  }

  if (code === "BTC") {
    const bitcoinQuery = new URLSearchParams(query);
    bitcoinQuery.set("v", BITCOIN_DATA_VERSION);
    const data = await fetchComparisonData<{ start?: BitcoinSnapshot; target?: BitcoinSnapshot }>(
      `/api/bitcoin?${bitcoinQuery.toString()}`,
      "Bitcoin verisi alınamadı.",
    );
    if (!data.start || !data.target) throw new Error("Bitcoin verisi eksik.");
    return data.target.closeTry / data.start.closeTry;
  }

  if (code === "BENZIN" || code === "MOTORIN") {
    const fuelQuery = new URLSearchParams(query);
    fuelQuery.set("fuel", code === "BENZIN" ? "gasoline" : "diesel");
    fuelQuery.set("v", FUEL_DATA_VERSION);
    const data = await fetchComparisonData<{ start?: FuelSnapshot; target?: FuelSnapshot }>(
      `/api/fuel?${fuelQuery.toString()}`,
      "Akaryakıt fiyatı alınamadı.",
    );
    if (!data.start || !data.target) throw new Error("Akaryakıt fiyatı eksik.");
    return data.target.pricePerLiter / data.start.pricePerLiter;
  }

  const data = await fetchComparisonData<{ start?: MinimumWageSnapshot; target?: MinimumWageSnapshot }>(
    `/api/minimum-wage?${query.toString()}`,
    "Asgari ücret verisi alınamadı.",
  );
  if (!data.start || !data.target) throw new Error("Asgari ücret verisi eksik.");
  return data.target.netMonthly / data.start.netMonthly;
}

export async function getPeriodMultiplier(code: IndexCode, startDate: string, targetDate: string) {
  const query = new URLSearchParams({ startDate, targetDate });

  if (code === "USD" || code === "EUR") {
    const data = await fetchComparisonData<{ start?: RateSnapshot; target?: RateSnapshot }>(
      `/api/fx?${query.toString()}`,
      "Kur verisi alınamadı.",
    );
    if (!data.start || !data.target) throw new Error("Kur verisi eksik.");
    return data.target[code] / data.start[code];
  }

  const placeholderRate: RateSnapshot = {
    requestedDate: startDate,
    actualDate: startDate,
    USD: 1,
    EUR: 1,
  };

  return getComparisonMultiplier(code, query, placeholderRate, placeholderRate);
}
