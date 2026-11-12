import { getTodayIso } from "../../../lib/dates";

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

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MIN_DATE = "2005-01-03";

function shiftDate(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value;
}

function unixSeconds(value: Date) {
  return Math.floor(value.getTime() / 1000);
}

async function fetchBistClose(requestedDate: string) {
  const url = new URL("https://query2.finance.yahoo.com/v8/finance/chart/XU100.IS");
  url.searchParams.set("period1", String(unixSeconds(shiftDate(requestedDate, -10))));
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
    throw new Error("BIST 100 veri kaynağı şu anda yanıt vermiyor.");
  }

  const data = await response.json() as YahooChartResponse;
  const result = data.chart?.result?.[0];
  const timestamps = result?.timestamp || [];
  const closes = result?.indicators?.quote?.[0]?.close || [];

  const observations = timestamps
    .map((timestamp, index) => ({
      date: new Date(timestamp * 1000).toISOString().slice(0, 10),
      close: closes[index],
    }))
    .filter((item): item is { date: string; close: number } => (
      item.date <= requestedDate && typeof item.close === "number" && Number.isFinite(item.close)
    ));

  const observation = observations.at(-1);
  if (!observation) throw new Error(`${requestedDate} tarihi için BIST 100 kapanışı bulunamadı.`);

  return {
    requestedDate,
    actualDate: observation.date,
    close: observation.close,
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
    return Response.json({ error: "Tarih aralığı geçersiz." }, { status: 400 });
  }

  try {
    const [start, target] = await Promise.all([
      fetchBistClose(startDate),
      fetchBistClose(targetDate),
    ]);

    return Response.json(
      { start, target, source: "Yahoo Finance XU100.IS" },
      { headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" } },
    );
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "BIST 100 verisi alınamadı." },
      { status: 502 },
    );
  }
}
