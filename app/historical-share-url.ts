import { appendCampaignAttribution } from "./analytics";

export function historicalShareUrl(
  values: Record<string, string>,
  costs: readonly number[] | null,
  lens: string | null,
) {
  const url = new URL("https://para-hesaplayici.utkanyilmaz.chatgpt.site/sonuc");
  const query = new URLSearchParams(values);
  if (costs) {
    query.set("buyCost", String(costs[0]));
    query.set("sellCost", String(costs[1]));
    query.set("annualCost", String(costs[2]));
  }
  if (lens) query.set("lens", lens);
  url.search = query.toString();
  return appendCampaignAttribution(url);
}
