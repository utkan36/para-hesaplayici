"use client";

import { FormEvent, useState } from "react";
import { trackAnalyticsEvent } from "./analytics";

type Kind = "past" | "opportunity" | "cigarette";

export default function SeoLauncher({ kind }: { kind: Kind }) {
  const [amount, setAmount] = useState(kind === "cigarette" ? "2000" : "25000");
  const [date, setDate] = useState(kind === "cigarette" ? "2021-01-01" : "2020-01-02");
  const [index, setIndex] = useState("ALTIN");
  function submit(event: FormEvent) {
    event.preventDefault();
    const numeric = Number(amount);
    if (!Number.isFinite(numeric) || numeric <= 0 || !date) return;
    trackAnalyticsEvent("calculation_started", `seo_${kind}`, "organic_landing");
    const seoCategory = kind === "past" ? "gecmis_para" : kind === "opportunity" ? "firsat_maliyeti" : "sigara";
    trackAnalyticsEvent("seo_tool_opened", seoCategory, "organic_landing");
    const query = kind === "past"
      ? new URLSearchParams({ amount, currency: "TRY", start: date, target: new Date(Date.now() - 86400000).toISOString().slice(0, 10), index, mode: "forward", goalValue: "nominal", delay: "30", lens: "gross" })
      : kind === "opportunity"
        ? new URLSearchParams({ tool: "opportunity", opportunityAmount: amount, opportunityDate: date })
        : new URLSearchParams({ tool: "recurring-opportunity", habit: "Sigara", monthly: amount, recurringStart: date, yearlyIncrease: "20" });
    const anchor = kind === "opportunity" ? "#opportunity-title" : "";
    window.location.href = `/?${query.toString()}${anchor}`;
  }
  return <form className="seo-calculator" onSubmit={submit}>
    <div className="seo-calculator-heading"><span>Ücretsiz hesapla</span><h2>{kind === "past" ? "Paranın bugünkü karşılığını gör" : kind === "opportunity" ? "Harcama yerine ne olabilirdi?" : "Sigaranın gerçek maliyetini gör"}</h2></div>
    <div className="seo-field-grid">
      <label><span>{kind === "cigarette" ? "İlk aylık sigara harcaması" : "Tutar"}</span><div className="seo-money"><b>₺</b><input inputMode="decimal" min="1" onChange={(e) => setAmount(e.target.value)} required type="number" value={amount} /></div></label>
      <label><span>{kind === "cigarette" ? "Başlangıç tarihi" : "Geçmiş tarih"}</span><input max={new Date().toISOString().slice(0, 10)} min="2005-01-03" onChange={(e) => setDate(e.target.value)} required type="date" value={date} /></label>
      {kind === "past" && <label><span>Karşılaştırma ölçütü</span><select onChange={(e) => setIndex(e.target.value)} value={index}><option value="ALTIN">Gram altın</option><option value="TUFE">Enflasyon (TÜFE)</option><option value="USD">ABD doları</option><option value="BIST">BIST 100</option><option value="FAIZ">Mevduat</option><option value="BTC">Bitcoin</option></select></label>}
    </div>
    <button type="submit">Hesabı oluştur <span>→</span></button>
    <p>Girdiğin tutar tarayıcından ayrılmadan hesaplama aracına aktarılır.</p>
  </form>;
}
