import { getTodayIso } from "../../../lib/dates";
import { calculateBitcoinTryClose } from "../../../lib/bitcoin-price";

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      timestamp?: number[];
      indicators?: {
        quote?: Array<{ close?: Array<number | null> }>;
      };
    }>;
    error?: { description?: string } | null;
  };
};

type RateResponse = {
  date?: string;
  rate?: number;
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MIN_DATE = "2014-09-17";

function shiftDate(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value;
}

function unixSeconds(value: Date) {
  return Math.floor(value.getTime() / 1000);
}

async function fetchBitcoinClose(requestedDate: string) {
  const url = new URL("https://query2.finance.yahoo.com/v8/finance/chart/BTC-USD");
  url.searchParams.set("period1", String(unixSeconds(shiftDate(requestedDate, -7))));
  url.searchParams.set("period2", String(unixSeconds(shiftDate(requestedDate, 2))));
  url.searchParams.set("interval", "1d");
  url.searchParams.set("events", "history");

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "Mozilla/5.0 (compatible; ParaHesaplayici/1.0)",
    },
    cf: { cacheTtl: 86400, cacheEverything: true },
  } as RequestInit);

  if (!response.ok) {
    throw new Error("Bitcoin veri kaynağı şu anda yanıt vermiyor.");
  }

  const data = await response.json() as YahooChartResponse;
  const result = data.chart?.result?.[0];
  const timestamps = result?.timestamp || [];
  const closes = result?.indicators?.quote?.[0]?.close || [];

  const observations = timestamps
    .map((timestamp, index) => ({
      date: new Date(timestamp * 1000).toISOString().slice(0, 10),
      closeUsd: closes[index],
    }))
    .filter((item): item is { date: string; closeUsd: number } => (
      item.date <= requestedDate && typeof item.closeUsd === "number" && Number.isFinite(item.closeUsd) && item.closeUsd > 0
    ));

  const observation = observations.at(-1);
  if (!observation) throw new Error(`${requestedDate} tarihi için Bitcoin kapanışı bulunamadı.`);

  return observation;
}

async function fetchUsdTryRate(requestedDate: string) {
  for (let daysBack = 0; daysBack <= 7; daysBack += 1) {
    const candidateDate = shiftDate(requestedDate, -daysBack).toISOString().slice(0, 10);
    const url = new URL("https://api.frankfurter.dev/v2/rate/USD/TRY");
    url.searchParams.set("date", candidateDate);
    url.searchParams.set("providers", "TCMB");

    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      cf: { cacheTtl: 86400, cacheEverything: true },
    } as RequestInit);

    if (response.ok) {
      const data = await response.json() as RateResponse;
      if (data.date && typeof data.rate === "number" && Number.isFinite(data.rate) && data.rate > 0) {
        return { actualDate: data.date, rate: data.rate };
      }
    }

    if (response.status >= 500) {
      throw new Error("Bitcoin için kur veri kaynağı şu anda yanıt vermiyor.");
    }
  }

  throw new Error(`${requestedDate} tarihi için Bitcoin kur karşılığı bulunamadı.`);
}

async function getBitcoinSnapshot(requestedDate: string) {
  const [bitcoin, usdTry] = await Promise.all([
    fetchBitcoinClose(requestedDate),
    fetchUsdTryRate(requestedDate),
  ]);

  return {
    requestedDate,
    actualDate: bitcoin.date,
    fxActualDate: usdTry.actualDate,
    closeUsd: bitcoin.closeUsd,
    usdTryRate: usdTry.rate,
    closeTry: calculateBitcoinTryClose(bitcoin.closeUsd, usdTry.rate),
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const startDate = url.searchParams.get("startDate") || "";
  const targetDate = url.searchParams.get("targetDate") || "";

  if (!DATE_PATTERN.test(startDate) || !DATE_PATTERN.test(targetDate)) {
    return Response.json({ error: "Tarih biçimi geçersiz." }, { status: 400 });
  }

  if (startDate < MIN_DATE || targetDate > getTodayIso() || startDate >= targetDate) {
    return Response.json(
      { error: "Bitcoin için tarih aralığı 17 Eylül 2014 ile bugün arasında olmalıdır." },
      { status: 400 },
    );
  }

  try {
    const [start, target] = await Promise.all([
      getBitcoinSnapshot(startDate),
      getBitcoinSnapshot(targetDate),
    ]);

    return Response.json(
      { start, target, source: "Yahoo Finance BTC-USD × TCMB USD/TRY via Frankfurter" },
      { headers: { "Cache-Control": "public, max-age=300, s-maxage=3600" } },
    );
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Bitcoin verisi alınamadı." },
      { status: 502 },
    );
  }
}
