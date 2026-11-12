export const financialProfileKey = "para-finansal-fotograf-v1";

export const profileFields = [
  ["income", "Aylık net gelir"],
  ["expenses", "Aylık zorunlu gider (borç hariç)"],
  ["debt", "Aylık borç ödemesi"],
  ["reserve", "Acil durum fonu"],
] as const;

export type Profile = Record<typeof profileFields[number][0], number>;

export function readProfiles(raw: string | null): Record<string, Profile> {
  try {
    const rows: unknown = JSON.parse(raw ?? "{}");
    if (!rows || typeof rows !== "object" || Array.isArray(rows)) return {};
    return Object.fromEntries(Object.entries(rows).filter(([month, row]) =>
      /^\d{4}-(0[1-9]|1[0-2])$/.test(month) && row && profileFields.every(([key]) =>
        typeof row[key] === "number" && Number.isFinite(row[key]) && row[key] >= 0 && row[key] <= 1e12,
      ),
    ).map(([month, row]) => [month, Object.fromEntries(profileFields.map(([key]) => [key, row[key]]))]));
  } catch {
    return {};
  }
}

export function summarizeProfile(profile: Profile) {
  const outflow = profile.expenses + profile.debt;
  return {
    remaining: profile.income - outflow,
    debtRatio: profile.income > 0 ? profile.debt / profile.income * 100 : null,
    reserveMonths: outflow > 0 ? profile.reserve / outflow : null,
  };
}

export function latestProfile(rows: Record<string, Profile>, month: string) {
  const key = Object.keys(rows).filter((key) => key <= month).sort().at(-1);
  return key ? rows[key] : undefined;
}

export const reserveGoalKey = "para-finansal-fotograf-fon-hedefi-v1";

export function readReserveGoal(raw: string | null): number | null {
  if (!raw || !/^\d{1,2}$/.test(raw)) return null;
  const months = Number(raw);
  return months >= 1 && months <= 60 ? months : null;
}

export function reserveGoalProgress(profile: Profile, months: number) {
  const target = (profile.expenses + profile.debt) * months;
  return target > 0 ? { target, remaining: Math.max(0, target - profile.reserve), ratio: Math.min(1, profile.reserve / target) } : null;
}
