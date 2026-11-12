import { getTodayIso } from "../../../lib/dates";

type WagePeriod = {
  start: string;
  netMonthly: number;
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MIN_DATE = "2005-01-01";

// T.C. Çalışma ve Sosyal Güvenlik Bakanlığı'nın yayımladığı aylık net tutarlar.
const WAGE_PERIODS: WagePeriod[] = [
  { start: "2005-01-01", netMonthly: 350.15 },
  { start: "2006-01-01", netMonthly: 380.46 },
  { start: "2006-07-01", netMonthly: 403.03 },
  { start: "2007-01-01", netMonthly: 419.15 },
  { start: "2007-07-01", netMonthly: 435.92 },
  { start: "2008-01-01", netMonthly: 481.55 },
  { start: "2008-07-01", netMonthly: 503.26 },
  { start: "2009-01-01", netMonthly: 527.13 },
  { start: "2009-07-01", netMonthly: 546.48 },
  { start: "2010-01-01", netMonthly: 576.57 },
  { start: "2010-07-01", netMonthly: 599.12 },
  { start: "2011-01-01", netMonthly: 629.95 },
  { start: "2011-07-01", netMonthly: 658.95 },
  { start: "2012-01-01", netMonthly: 701.13 },
  { start: "2012-07-01", netMonthly: 739.79 },
  { start: "2013-01-01", netMonthly: 773.01 },
  { start: "2013-07-01", netMonthly: 803.68 },
  { start: "2014-01-01", netMonthly: 846 },
  { start: "2014-07-01", netMonthly: 891.03 },
  { start: "2015-01-01", netMonthly: 949.07 },
  { start: "2015-07-01", netMonthly: 1000.54 },
  { start: "2016-01-01", netMonthly: 1300.99 },
  { start: "2017-01-01", netMonthly: 1404.06 },
  { start: "2018-01-01", netMonthly: 1603.12 },
  { start: "2019-01-01", netMonthly: 2020.9 },
  { start: "2020-01-01", netMonthly: 2324.7 },
  { start: "2021-01-01", netMonthly: 2825.9 },
  { start: "2022-01-01", netMonthly: 4253.4 },
  { start: "2022-07-01", netMonthly: 5500.35 },
  { start: "2023-01-01", netMonthly: 8506.8 },
  { start: "2023-07-01", netMonthly: 11402.32 },
  { start: "2024-01-01", netMonthly: 17002.12 },
  { start: "2025-01-01", netMonthly: 22104.67 },
  { start: "2026-01-01", netMonthly: 28075.5 },
];

function getWage(requestedDate: string) {
  const period = WAGE_PERIODS.filter((item) => item.start <= requestedDate).at(-1);
  if (!period) throw new Error(`${requestedDate} tarihi için net asgari ücret bulunamadı.`);

  return {
    requestedDate,
    actualDate: requestedDate,
    periodStart: period.start,
    netMonthly: period.netMonthly,
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
    return Response.json({ error: "Asgari ücret için tarih aralığı 1 Ocak 2005 ile bugün arasında olmalıdır." }, { status: 400 });
  }

  return Response.json(
    {
      start: getWage(startDate),
      target: getWage(targetDate),
      source: "T.C. Çalışma ve Sosyal Güvenlik Bakanlığı",
    },
    { headers: { "Cache-Control": "public, max-age=86400, s-maxage=604800" } },
  );
}
