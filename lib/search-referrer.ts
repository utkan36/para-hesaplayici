export function searchReferrer(referrer: string, siteOrigin: string, search: string) {
  const params = new URLSearchParams(search);
  if (["utm_source", "utm_medium", "utm_campaign", "gclid", "msclkid", "gbraid", "wbraid"].some((key) => params.has(key))) return null;

  try {
    const source = new URL(referrer);
    if (source.origin === siteOrigin) return null;
    const host = source.hostname.replace(/^www\./, "");
    if (/^google\.(?:com|com\.[a-z]{2}|co\.[a-z]{2}|[a-z]{2})$/.test(host)) return "google";
    if (host === "bing.com") return "bing";
    if (host === "duckduckgo.com") return "duckduckgo";
    if (host === "search.yahoo.com" || host.endsWith(".search.yahoo.com")) return "yahoo";
  } catch {
    return null;
  }
  return null;
}
