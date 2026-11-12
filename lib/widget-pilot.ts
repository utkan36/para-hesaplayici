export const pilotTools = ["refinance", "salary", "deposit"] as const;
export const pilotIdPattern = /^[a-z0-9][a-z0-9-]{2,63}$/;

type PilotLicense = {
  origin: string;
  tool: typeof pilotTools[number];
  brand: string;
  color: string;
  monthlyQuota: number;
  expiresAt: string;
};

export function readPilotLicense(config: string | undefined, id: string, now: Date | null = new Date()): PilotLicense | null {
  if (!config || !pilotIdPattern.test(id)) return null;

  try {
    const licenses = JSON.parse(config);
    if (!licenses || typeof licenses !== "object" || !Object.hasOwn(licenses, id)) return null;
    const license = licenses[id] as PilotLicense;
    const origin = new URL(license.origin);
    const expiry = Date.parse(license.expiresAt);
    if (origin.protocol !== "https:" || origin.origin !== license.origin || origin.hostname.includes("*")
      || !pilotTools.includes(license.tool) || typeof license.brand !== "string" || !license.brand.trim()
      || license.brand.length > 32 || !/^#[a-f0-9]{6}$/i.test(license.color)
      || !Number.isSafeInteger(license.monthlyQuota) || license.monthlyQuota < 1
      || !Number.isFinite(expiry) || (now !== null && expiry <= now.getTime())) return null;
    return license;
  } catch {
    return null;
  }
}

export function canOpenPilot(headers: Headers, allowedOrigin: string) {
  if (headers.get("sec-fetch-dest") !== "iframe") return false;
  try {
    return new URL(headers.get("referer") ?? "").origin === allowedOrigin;
  } catch {
    return false;
  }
}
