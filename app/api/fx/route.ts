import { getTodayIso } from "../../../lib/dates";

type CurrencyCode = "USD" | "EUR";

type RateResponse = {
  date?: string;
  rate?: number;
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MIN_DATE = "2005-01-03";

function previousDate(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() - days);
  return value.toISOString().slice(0, 10);
}

async function fetchRate(currency: CurrencyCode, requestedDate: string) {
  for (let daysBack = 0; daysBack <= 7; daysBack += 1) {
    const candidateDate = previousDate(requestedDate, daysBack);
    const url = new URL(`https://api.frankfurter.dev/v2/rate/${currency}/TRY`);
    url.searchParams.set("date", candidateDate);
    url.searchParams.set("providers", "TCMB");

    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      cf: { cacheTtl: 86400, cacheEverything: true },
    } as RequestInit);

    if (response.ok) {
      const data = await response.json() as RateResponse;
      if (data.date && typeof data.rate === "number" && data.rate > 0) {
        return { actualDate: data.date, rate: data.rate };
      }
    }

    if (response.status >= 500) {
      throw new Error("Kur veri kaynağı şu anda yanıt vermiyor.");
    }
  }

  throw new Error(`${requestedDate} tarihi için yayımlanmış kur bulunamadı.`);
}

async function getSnapshot(requestedDate: string) {
  const [usd, eur] = await Promise.all([
    fetchRate("USD", requestedDate),
    fetchRate("EUR", requestedDate),
  ]);

  return {
    requestedDate,
    actualDate: usd.actualDate,
    USD: usd.rate,
    EUR: eur.rate,
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
      getSnapshot(startDate),
      getSnapshot(targetDate),
    ]);

    return Response.json(
      { start, target, source: "TCMB via Frankfurter" },
      { headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" } },
    );
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Kur verisi alınamadı." },
      { status: 502 },
    );
  }
}
