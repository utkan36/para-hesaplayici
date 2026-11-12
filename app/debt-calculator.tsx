"use client";

import { FormEvent, useEffect, useState } from "react";
import { calculateDebt, type DebtResult } from "../lib/debt";
import { appendCampaignAttribution, trackAnalyticsEvent, trackCampaignEvent } from "./analytics";
import SaveScenarioButton from "./save-scenario-button";

const money = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 2 });

export default function DebtCalculator({ initial }: { initial?: { principal: string; rate: string; months: string } }) {
  const [principal, setPrincipal] = useState(initial?.principal ?? "100000");
  const [rate, setRate] = useState(initial?.rate ?? "3.5");
  const [months, setMonths] = useState(initial?.months ?? "12");
  const [result, setResult] = useState<DebtResult | null>(() => { try { return initial ? calculateDebt(Number(initial.principal), Number(initial.rate), Number(initial.months)) : null; } catch { return null; } });
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => { if (result) trackCampaignEvent("campaign_completed"); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  function resultUrl(active: DebtResult) { const url = new URL("https://para-hesaplayici.utkanyilmaz.chatgpt.site/sonuc"); url.search = new URLSearchParams({ tool: "debt", principal, rate, months, monthlyPayment: String(active.monthlyPayment), totalPayment: String(active.totalPayment) }).toString(); return appendCampaignAttribution(url).toString(); }
  async function copy(active: DebtResult) { trackAnalyticsEvent("share_started", "debt_link", "copy"); trackCampaignEvent("campaign_shared"); await navigator.clipboard.writeText(resultUrl(active)); setCopied(true); window.setTimeout(() => setCopied(false), 1800); }
  function share(active: DebtResult) { trackAnalyticsEvent("share_started", "debt_link", "whatsapp"); trackCampaignEvent("campaign_shared"); const text = `${money.format(Number(principal))} borcun ${months} ay vadede aylık taksiti ${money.format(active.monthlyPayment)}. Toplam geri ödeme ${money.format(active.totalPayment)}. ${resultUrl(active)}`; window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer"); }
  function submit(event: FormEvent) {
    event.preventDefault(); setError(""); trackAnalyticsEvent("seo_tool_opened", "debt", "organic_landing"); trackAnalyticsEvent("calculation_started", "debt", "seo_landing");
    try { const next = calculateDebt(Number(principal), Number(rate), Number(months)); setResult(next); trackAnalyticsEvent("calculation_completed", "debt", "seo_landing"); trackCampaignEvent("campaign_completed"); }
    catch (caught) { setResult(null); setError(caught instanceof Error ? caught.message : "Borç hesaplanamadı."); trackAnalyticsEvent("calculation_failed", "debt", "seo_landing"); }
  }
  return <section className="seo-calculator debt-calculator">
    <form onSubmit={submit}><div className="seo-calculator-heading"><span>Borç hesaplama</span><h2>Aylık taksit ve toplam faiz maliyeti</h2></div><div className="seo-field-grid">
      <label><span>Borç / kredi tutarı</span><div className="seo-money"><b>₺</b><input inputMode="decimal" min="1" onChange={(e) => setPrincipal(e.target.value)} required type="number" value={principal} /></div></label>
      <label><span>Aylık faiz oranı (%)</span><input inputMode="decimal" min="0" max="100" onChange={(e) => setRate(e.target.value)} required step="0.01" type="number" value={rate} /></label>
      <label><span>Vade (ay)</span><input inputMode="numeric" min="1" max="600" onChange={(e) => setMonths(e.target.value)} required step="1" type="number" value={months} /></label>
    </div><button type="submit">Borcu hesapla <span>→</span></button>{error && <p className="seo-error" role="alert">{error}</p>}</form>
    {result && <div className="debt-result" aria-live="polite"><article className="primary"><span>Aylık eşit taksit</span><strong>{money.format(result.monthlyPayment)}</strong></article><article><span>Toplam geri ödeme</span><strong>{money.format(result.totalPayment)}</strong></article><article><span>Toplam faiz yükü</span><strong>{money.format(result.totalInterest)}</strong></article><div className="debt-share-actions"><SaveScenarioButton scenario={{ tool: "debt", title: `${money.format(Number(principal))} borç · ${months} ay`, summary: `Aylık %${rate} faizle eşit taksit planı`, metrics: [{ label: "Aylık taksit", value: money.format(result.monthlyPayment) }, { label: "Toplam ödeme", value: money.format(result.totalPayment) }, { label: "Toplam faiz", value: money.format(result.totalInterest) }], href: resultUrl(result) }} /><button onClick={() => void copy(result)} type="button">{copied ? "Bağlantı kopyalandı" : "Bağlantıyı kopyala"}</button><button onClick={() => share(result)} type="button">WhatsApp&apos;ta paylaş</button></div><p>Hesap, sabit aylık faiz ve eşit taksit varsayımı kullanır. Tahsis ücreti, vergi, sigorta ve gecikme maliyetleri dahil değildir.</p></div>}
  </section>;
}
