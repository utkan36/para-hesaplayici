"use client";

import { useDecisionCompletion } from "./use-decision-completion";
import DecisionComparison from "./decision-comparison";
import { referenceLag } from "../lib/reference-period";
import DecisionEvidence from "./decision-evidence";

import { FormEvent, useState } from "react";
import { calculateSalaryPurchasingPower, type SalaryPurchasingPowerResult } from "../lib/salary-purchasing-power";
import { appendCampaignAttribution, trackAnalyticsEvent, trackCampaignEvent } from "./analytics";
import SaveScenarioButton from "./save-scenario-button";

type CpiResponse = { start?: { indexValue: number; actualPeriod: string }; target?: { indexValue: number; actualPeriod: string }; error?: string };
type Initial = { oldSalary: string; currentSalary: string; salaryDate: string; oldIndex?: string; currentIndex?: string };
const money = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 });
const percent = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
const today = () => new Date().toISOString().slice(0, 10);

export default function SalaryPurchasingPowerCalculator({ initial, embedded = false }: { initial?: Initial; embedded?: boolean }) {
  const [resultVersion, setResultVersion] = useState(0);
  const completeDecision = useDecisionCompletion("salary", resultVersion, !embedded);
  const [oldSalary, setOldSalary] = useState(initial?.oldSalary ?? "10000");
  const [currentSalary, setCurrentSalary] = useState(initial?.currentSalary ?? "30000");
  const [salaryDate, setSalaryDate] = useState(initial?.salaryDate ?? "2022-01");
  const [periods, setPeriods] = useState<{ start: string; target: string } | null>(null);
  const [result, setResult] = useState<SalaryPurchasingPowerResult | null>(() => { try { return initial?.oldIndex && initial.currentIndex ? calculateSalaryPurchasingPower(Number(initial.oldSalary), Number(initial.currentSalary), Number(initial.oldIndex), Number(initial.currentIndex)) : null; } catch { return null; } });
  const [indexes, setIndexes] = useState<{ oldIndex: number; currentIndex: number } | null>(() => initial?.oldIndex && initial.currentIndex ? { oldIndex: Number(initial.oldIndex), currentIndex: Number(initial.currentIndex) } : null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const monthsBehind = periods ? referenceLag(today(), periods.target, true) : 0;

  function clearResult() {
    setResult(null);
    setIndexes(null);
    setPeriods(null);
    setError("");
    setCopied(false);
  }

  function resultUrl(active: SalaryPurchasingPowerResult, activeIndexes: { oldIndex: number; currentIndex: number }) { const url = new URL("https://para-hesaplayici.utkanyilmaz.chatgpt.site/sonuc"); url.search = new URLSearchParams({ tool: "salary", oldSalary, currentSalary, salaryDate, oldIndex: String(activeIndexes.oldIndex), currentIndex: String(activeIndexes.currentIndex), requiredSalary: String(active.requiredSalary), difference: String(active.monthlyDifference) }).toString(); return appendCampaignAttribution(url).toString(); }
  async function copy(active: SalaryPurchasingPowerResult, activeIndexes: { oldIndex: number; currentIndex: number }) { trackAnalyticsEvent("share_started", "salary_link", "copy"); trackCampaignEvent("campaign_shared"); await navigator.clipboard.writeText(resultUrl(active, activeIndexes)); setCopied(true); window.setTimeout(() => setCopied(false), 1800); }
  function share(active: SalaryPurchasingPowerResult, activeIndexes: { oldIndex: number; currentIndex: number }) { trackAnalyticsEvent("share_started", "salary_link", "whatsapp"); trackCampaignEvent("campaign_shared"); const verdict = active.outcome === "lost" ? `aylık ${money.format(Math.abs(active.monthlyDifference))} alım gücü kaybı` : active.outcome === "gained" ? `aylık ${money.format(active.monthlyDifference)} alım gücü artışı` : "alım gücünü koruyan sonuç"; window.open(`https://wa.me/?text=${encodeURIComponent(`${salaryDate} dönemindeki ${money.format(Number(oldSalary))} maaşın bugün ${money.format(active.requiredSalary)} olması gerekiyordu: ${verdict}. ${resultUrl(active, activeIndexes)}`)}`, "_blank", "noopener,noreferrer"); }
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(""); setLoading(true); trackAnalyticsEvent("calculation_started", "salary", "seo_landing");
    try {
      const response = await fetch(`/api/cpi?startDate=${salaryDate}-01&targetDate=${today()}`);
      const data = await response.json() as CpiResponse;
      if (!response.ok || !data.start || !data.target) throw new Error(data.error || "TÜFE verisi alınamadı.");
      const nextIndexes = { oldIndex: data.start.indexValue, currentIndex: data.target.indexValue };
      const next = calculateSalaryPurchasingPower(Number(oldSalary), Number(currentSalary), nextIndexes.oldIndex, nextIndexes.currentIndex);
      setIndexes(nextIndexes); setPeriods({ start: data.start.actualPeriod, target: data.target.actualPeriod }); setResult(next); setResultVersion((version) => version + 1); if (!embedded) trackAnalyticsEvent("decision_result_ready", "salary", "calculator_result"); trackAnalyticsEvent("calculation_completed", "salary", "seo_landing"); trackCampaignEvent("campaign_completed");
    } catch (caught) { setResult(null); setIndexes(null); setError(caught instanceof Error ? caught.message : "Maaş alım gücü hesaplanamadı."); trackAnalyticsEvent("calculation_failed", "salary", "seo_landing"); }
    finally { setLoading(false); }
  }
  return <section className="seo-calculator salary-calculator"><form onSubmit={submit} onChange={clearResult}><div className="seo-calculator-heading"><span>Maaş alım gücü</span><h2>Maaşın enflasyona karşı ne durumda?</h2></div><div className="seo-field-grid">
    <label><span>Eski net maaş</span><div className="seo-money"><b>₺</b><input disabled={loading} inputMode="decimal" min="1" onChange={(e) => setOldSalary(e.target.value)} required type="number" value={oldSalary} /></div></label>
    <label><span>Eski maaşın dönemi</span><input disabled={loading} max={today().slice(0, 7)} min="2005-02" onChange={(e) => setSalaryDate(e.target.value)} required type="month" value={salaryDate} /></label>
    <label><span>Bugünkü net maaş</span><div className="seo-money"><b>₺</b><input disabled={loading} inputMode="decimal" min="1" onChange={(e) => setCurrentSalary(e.target.value)} required type="number" value={currentSalary} /></div></label>
  </div><button disabled={loading} type="submit">{loading ? "TÜFE verisi alınıyor…" : "Maaşın alım gücünü hesapla"}<span>→</span></button>{error && <p className="seo-error" role="alert">{error}</p>}</form>
  {result && indexes && <div className={`salary-result ${result.outcome}`} aria-live="polite"><div><span>Alım gücünü koruyan maaş</span><strong>{money.format(result.requiredSalary)}</strong><p>{periods ? `${periods.start}–${periods.target} TÜFE dönemleri` : "Paylaşılan TÜFE karşılaştırması"}</p></div><div className="salary-result-grid"><article><span>Reel değişim</span><strong>{result.realChangePercent >= 0 ? "+" : ""}{percent.format(result.realChangePercent)}%</strong></article><article><span>Aylık fark</span><strong>{result.monthlyDifference >= 0 ? "+" : "−"}{money.format(Math.abs(result.monthlyDifference))}</strong></article><article><span>Yıllık fark</span><strong>{result.annualDifference >= 0 ? "+" : "−"}{money.format(Math.abs(result.annualDifference))}</strong></article><article><span>Dönem enflasyonu</span><strong>%{percent.format(result.inflationPercent)}</strong></article></div><h3>{result.outcome === "lost" ? "Maaşın alım gücü gerilemiş." : result.outcome === "gained" ? "Maaşın alım gücü artmış." : "Maaşın alım gücünü korumuş."}</h3><p>Bugünkü maaşın, eski dönemin parasıyla yaklaşık {money.format(result.currentSalaryInOldMoney)} alım gücüne karşılık geliyor.</p>{periods && (monthsBehind > 1 || periods.start !== salaryDate) && (
    <p role="status" className="decision-data-notice">
      {monthsBehind > 1 && <>Son alınabilen TÜFE dönemi <strong>{periods.target}</strong>. Hesap bu döneme kadar olan fiyat değişimini içeriyor. </>}
      {periods.start !== salaryDate && <>Seçilen {salaryDate} dönemi yerine kaynakta bulunan {periods.start} dönemi kullanıldı.</>}
    </p>
  )}
  {!embedded && <DecisionComparison key={resultVersion} onComplete={completeDecision} measureConversion={periods !== null}
    current={{ title: "Mevcut net maaş", amount: Number(currentSalary), detail: "Bugün eline geçen aylık tutar" }}
    alternative={{ title: "Alım gücünü koruyan maaş", amount: result.requiredSalary, detail: "Eski maaşın TÜFE’ye göre bugünkü karşılığı" }}
    basis={periods ? `Aylık net TL · TÜFE dönemi ${periods.start} → ${periods.target}` : "Aylık net TL · Paylaşılan endeks değerleri"}
    difference={result.monthlyDifference}
    report={{
      tool: "salary",
      title: "Maaş alım gücü karşılaştırması",
      summary: result.outcome === "lost" ? "Mevcut maaşın önceki alım gücünün altında." : result.outcome === "gained" ? "Mevcut maaşın önceki alım gücünü aşıyor." : "Mevcut maaşın önceki alım gücünü yaklaşık koruyor.",
      source: periods ? "TCMB üzerinden erişilen TÜİK tüketici fiyatları serisi." : "Paylaşılan bağlantıdaki endeks değerleri.",
      assumptions: `Eski net maaş ${money.format(Number(oldSalary))}. Dönem enflasyonu %${percent.format(result.inflationPercent)}. Gerekli maaş, eski net maaşın endeks oranıyla çarpılmasıyla bulunur.`,
      nextStep: "Kira, market ve ulaşım giderlerin genel sepetten farklıysa aynı dönemi kişisel harcama sepetinle de karşılaştır.",
    }}
  />}<DecisionEvidence source={periods ? <a href="https://www.tcmb.gov.tr/wps/wcm/connect/TR/TCMB%2BTR/Main%2BMenu/Istatistikler/Enflasyon%2BVerileri/Tuketici%2BFiyatlari">TÜİK TÜFE serisi (TCMB)</a> : "Paylaşılan bağlantıdaki endeks değerleri."} period={periods ? `${periods.start} → ${periods.target}` : "Dönem bilgisi bağlantıda doğrulanamıyor."} method="Alım gücünü koruyan net maaş = eski net maaş × son TÜFE endeksi ÷ eski TÜFE endeksi." assumptions="TÜFE ortalama tüketim sepetini temsil eder. Son açıklanan ay kullanılır ve kişisel harcama sepetiniz farklı bir sonuç verebilir." /><div className="debt-share-actions"><SaveScenarioButton onSaved={() => completeDecision("save")} scenario={{ tool: "salary", title: `${salaryDate} maaş karşılaştırması`, summary: `${money.format(Number(oldSalary))} → ${money.format(Number(currentSalary))}`, metrics: [{ label: "Koruyan maaş", value: money.format(result.requiredSalary) }, { label: "Reel değişim", value: `${result.realChangePercent >= 0 ? "+" : ""}${percent.format(result.realChangePercent)}%` }, { label: "Aylık fark", value: `${result.monthlyDifference >= 0 ? "+" : "−"}${money.format(Math.abs(result.monthlyDifference))}` }], href: resultUrl(result, indexes) }} /><button onClick={() => void copy(result, indexes)} type="button">{copied ? "Bağlantı kopyalandı" : "Bağlantıyı kopyala"}</button><button onClick={() => share(result, indexes)} type="button">WhatsApp&apos;ta paylaş</button></div></div>}</section>;
}
