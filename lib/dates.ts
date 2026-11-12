const TURKEY_TIME_ZONE = "Europe/Istanbul";
const DAY_IN_MILLISECONDS = 86_400_000;

function formatTurkeyDate(value: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TURKEY_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error("Türkiye tarih bilgisi oluşturulamadı.");
  }

  return `${year}-${month}-${day}`;
}

export function getTodayIso() {
  return formatTurkeyDate(new Date());
}

export function getYesterdayIso() {
  return formatTurkeyDate(new Date(Date.now() - DAY_IN_MILLISECONDS));
}

export function subtractYearsIso(isoDate: string, years: number) {
  const [year, month, day] = isoDate.split("-").map(Number);
  const targetYear = year - years;
  const lastDayOfMonth = new Date(Date.UTC(targetYear, month, 0)).getUTCDate();
  const value = new Date(Date.UTC(targetYear, month - 1, Math.min(day, lastDayOfMonth)));
  return value.toISOString().slice(0, 10);
}
