import { getTodayIso } from "../../../lib/dates";

type CpiRow = {
  period: string;
  monthlyChange: number;
  annualChange: number;
  indexValue: number;
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MIN_DATE = "2005-01-03";
const SOURCE_URL = "https://www.tcmb.gov.tr/wps/wcm/connect/TR/TCMB%2BTR/Main%2BMenu/Istatistikler/Enflasyon%2BVerileri/Tuketici%2BFiyatlari";

function plainText(value: string) {
  return value.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();
}

function parseNumber(value: string) {
  return Number(value.replace(",", "."));
}

function parseCpiRows(html: string): CpiRow[] {
  const rawRows: Omit<CpiRow, "indexValue">[] = [];
  const tableRows = html.match(/<tr[\s\S]*?<\/tr>/gi) || [];

  for (const tableRow of tableRows) {
    const cells = [...tableRow.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((match) => plainText(match[1]));
    const periodMatch = cells[0]?.match(/^(\d{2})-(\d{4})$/);

    if (!periodMatch || cells.length < 3) continue;

    const annualChange = parseNumber(cells[1]);
    const monthlyChange = parseNumber(cells[2]);

    if (!Number.isFinite(annualChange) || !Number.isFinite(monthlyChange)) continue;

    rawRows.push({
      period: `${periodMatch[2]}-${periodMatch[1]}`,
      monthlyChange,
      annualChange,
    });
  }

  rawRows.sort((a, b) => a.period.localeCompare(b.period));

  let runningIndex = 100;
  return rawRows.map((row, index) => {
    if (index > 0) runningIndex *= 1 + row.monthlyChange / 100;
    return { ...row, indexValue: runningIndex };
  });
}

function getSnapshot(rows: CpiRow[], requestedDate: string) {
  const requestedPeriod = requestedDate.slice(0, 7);
  const available = rows.filter((row) => row.period <= requestedPeriod);
  const row = available.at(-1);

  if (!row) throw new Error(`${requestedPeriod} dönemi için TÜFE verisi bulunamadı.`);

  return {
    requestedPeriod,
    actualPeriod: row.period,
    indexValue: row.indexValue,
    monthlyChange: row.monthlyChange,
    annualChange: row.annualChange,
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
    const response = await fetch(SOURCE_URL, {
      headers: { Accept: "text/html", "User-Agent": "ParaHesaplayici/1.0" },
      cf: { cacheTtl: 21600, cacheEverything: true },
    } as RequestInit);

    if (!response.ok) throw new Error("TÜFE veri kaynağı şu anda yanıt vermiyor.");

    const rows = parseCpiRows(await response.text());
    if (rows.length < 12) throw new Error("TÜFE veri tablosu okunamadı.");

    return Response.json(
      {
        start: getSnapshot(rows, startDate),
        target: getSnapshot(rows, targetDate),
        latestPeriod: rows.at(-1)?.period,
        source: "TÜİK via TCMB",
      },
      { headers: { "Cache-Control": "public, max-age=3600, s-maxage=21600" } },
    );
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "TÜFE verisi alınamadı." },
      { status: 502 },
    );
  }
}
