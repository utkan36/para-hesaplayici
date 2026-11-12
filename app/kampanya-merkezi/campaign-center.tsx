"use client";

import Link from "next/link";
import { useState } from "react";
import { trackAnalyticsEvent } from "../analytics";
import { campaigns } from "../campaign-catalog";

export default function CampaignCenter() {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (id: string, value: string, kind: "link" | "copy") => {
    await navigator.clipboard.writeText(value);
    trackAnalyticsEvent("campaign_copy", id, kind);
    setCopied(`${id}-${kind}`);
    window.setTimeout(() => setCopied(null), 1800);
  };

  return <div className="campaign-center-grid">{campaigns.map((campaign, index) => {
    const absoluteLink = `https://para-hesaplayici.utkanyilmaz.chatgpt.site${campaign.toolHref}`;
    return <article className="campaign-card" key={campaign.id}>
      <div className="campaign-card-top"><span>{String(index + 1).padStart(2, "0")}</span><small>{campaign.eyebrow}</small></div>
      <h2>{campaign.title}</h2><p>{campaign.hook}</p><em>{campaign.audience}</em>
      <blockquote>{campaign.socialCopy}</blockquote>
      <div className="campaign-actions">
        <Link href={campaign.toolHref} onClick={() => trackAnalyticsEvent("campaign_opened", campaign.id, "campaign_center")}>Hesabı aç <span>→</span></Link>
        <button type="button" onClick={() => copy(campaign.id, campaign.socialCopy, "copy")}>{copied === `${campaign.id}-copy` ? "Metin kopyalandı" : "Metni kopyala"}</button>
        <button type="button" onClick={() => copy(campaign.id, absoluteLink, "link")}>{copied === `${campaign.id}-link` ? "Bağlantı kopyalandı" : "Bağlantıyı kopyala"}</button>
        <Link className="studio-action" href={campaign.toolHref} onClick={() => trackAnalyticsEvent("campaign_opened", campaign.id, "content_flow")}>Hesapla ve karta dönüştür</Link>
      </div>
    </article>;
  })}</div>;
}
