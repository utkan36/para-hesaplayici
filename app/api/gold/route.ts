import { getTodayIso } from "../../../lib/dates";

type GoldRateResponse = {
  date?: string;
  rate?: number;
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MIN_DATE = "2005-01-03";
const GRAMS_PER_TROY_OUNCE = 31.1034768;

function previousDate(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() - days);
  return value.toISOString().slice(0, 10);
}

async function fetchGoldRate(requestedDate: string) {
  for (let daysBack = 0; daysBack <= 7; daysBack += 1) {
    const candidateDate = previousDate(requestedDate, daysBack);
    const url = new URL("https://api.frankfurter.dev/v2/rate/XAU/TRY");
    url.searchParams.set("date", candidateDate);

    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      cf: { cacheTtl: 86400, cacheEverything: true },
    } as RequestInit);

    if (response.ok) {
      const data = await response.json() as GoldRateResponse;
      if (data.date && typeof data.rate === "number" && data.rate > 0) {
        return {
          requestedDate,
          actualDate: data.date,
          ounceTry: data.rate,
          gramTry: data.rate / GRAMS_PER_TROY_OUNCE,
        };
      }
    }

    if (response.status >= 500) {
      throw new Error("Altın veri kaynağı şu anda yanıt vermiyor.");
    }
  }

  throw new Error(`${requestedDate} tarihi için altın fiyatı bulunamadı.`);
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
      fetchGoldRate(startDate),
      fetchGoldRate(targetDate),
    ]);

    return Response.json(
      { start, target, source: "Frankfurter XAU/TRY" },
      { headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" } },
    );
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Altın verisi alınamadı." },
      { status: 502 },
    );
  }
}
