import { getTodayIso } from "../../../lib/dates";

type EvdsItem = {
  Tarih?: string;
  TP_TRY_MT01?: string;
};

type EvdsResponse = {
  items?: EvdsItem[];
};

type DepositObservation = {
  date: string;
  annualRate: number;
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MIN_DATE = "2005-01-03";
const TERM_DAYS = 32;
const DAY_MS = 86_400_000;
const SOURCE_URL = "https://evds3.tcmb.gov.tr/igmevdsms-dis/fe";

function shiftDate(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function toEvdsDate(date: string) {
  const [year, month, day] = date.split("-");
  return `${day}-${month}-${year}`;
}

function fromEvdsDate(date: string) {
  const [day, month, year] = date.split("-");
  return `${year}-${month}-${day}`;
}

function dayDifference(start: string, end: string) {
  return Math.round((new Date(`${end}T12:00:00Z`).getTime() - new Date(`${start}T12:00:00Z`).getTime()) / DAY_MS);
}

function parseRate(value: string) {
  return Number(value.replace(",", "."));
}

function getObservation(observations: DepositObservation[], requestedDate: string) {
  const observation = observations.filter((item) => item.date <= requestedDate).at(-1);
  if (!observation) throw new Error(`${requestedDate} tarihi için mevduat faizi bulunamadı.`);

  return {
    requestedDate,
    actualDate: observation.date,
    annualRate: observation.annualRate,
  };
}

function calculateRollingDeposit(observations: DepositObservation[], startDate: string, targetDate: string) {
  let multiplier = 1;
  let renewalCount = 0;
  let periodStart = startDate;

  while (periodStart < targetDate) {
    const candidateEnd = shiftDate(periodStart, TERM_DAYS);
    const periodEnd = candidateEnd < targetDate ? candidateEnd : targetDate;
    const days = dayDifference(periodStart, periodEnd);
    const rate = getObservation(observations, periodStart).annualRate;

    multiplier *= 1 + (rate / 100) * (days / 365);
    renewalCount += 1;
    periodStart = periodEnd;
  }

  return { multiplier, renewalCount };
}

async function fetchObservations(startDate: string, targetDate: string) {
  const response = await fetch(SOURCE_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": "ParaHesaplayici/1.0",
    },
    body: JSON.stringify({
      type: "json",
      series: "TP.TRY.MT01",
      aggregationTypes: "avg",
      formulas: "0",
      startDate: toEvdsDate(shiftDate(startDate, -14)),
      endDate: toEvdsDate(targetDate),
      frequency: "3",
      decimalSeperator: ",",
      decimal: "2",
      dateFormat: "0",
      lang: "tr",
      ozelFormuller: [],
      groupSeperator: true,
      isRaporSayfasi: true,
    }),
    cf: { cacheTtl: 21600, cacheEverything: true },
  } as RequestInit);

  if (!response.ok) throw new Error("Mevduat faiz veri kaynağı şu anda yanıt vermiyor.");

  const data = await response.json() as EvdsResponse;
  const observations = (data.items || [])
    .map((item) => ({
      date: item.Tarih ? fromEvdsDate(item.Tarih) : "",
      annualRate: item.TP_TRY_MT01 ? parseRate(item.TP_TRY_MT01) : Number.NaN,
    }))
    .filter((item) => item.date && item.date <= targetDate && Number.isFinite(item.annualRate) && item.annualRate >= 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (observations.length < 2) throw new Error("Mevduat faiz serisi okunamadı.");
  return observations;
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
    const observations = await fetchObservations(startDate, targetDate);
    const calculation = calculateRollingDeposit(observations, startDate, targetDate);

    return Response.json(
      {
        start: getObservation(observations, startDate),
        target: getObservation(observations, targetDate),
        ...calculation,
        termDays: TERM_DAYS,
        source: "TCMB EVDS TP.TRY.MT01",
      },
      { headers: { "Cache-Control": "public, max-age=3600, s-maxage=21600" } },
    );
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Mevduat faizi verisi alınamadı." },
      { status: 502 },
    );
  }
}
