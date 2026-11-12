"use client";

import { useDecisionCompletion } from "./use-decision-completion";
import DecisionComparison from "./decision-comparison";
import DecisionEvidence from "./decision-evidence";

import { FormEvent, useState } from "react";
import { calculateDebtRefinance, type DebtRefinanceResult } from "../lib/debt-refinance";
import { appendCampaignAttribution, trackAnalyticsEvent } from "./analytics";
import SaveScenarioButton from "./save-scenario-button";

type Values = { principal: string; currentPayment: string; currentMonths: string; newRate: string; newMonths: string; costs: string };
const money = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 });

export default function DebtRefinanceCalculator({ initial, useProfile = true }: { initial?: Values; useProfile?: boolean }) {
  const [resultVersion, setResultVersion] = useState(0);
  const completeDecision = useDecisionCompletion("refinance", resultVersion, useProfile);
  const [values, setValues] = useState<Values>(initial ?? { principal: "150000", currentPayment: "13500", currentMonths: "18", newRate: "2.79", newMonths: "18", costs: "5000" });
  const [result, setResult] = useState<DebtRefinanceResult | null>(null); const [error, setError] = useState(""); const [copied, setCopied] = useState(false);
  const set = (key: keyof Values, value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
    setResult(null);
    setError("");
  };
  function run() { return calculateDebtRefinance({ remainingPrincipal: Number(values.principal), currentMonthlyPayment: Number(values.currentPayment), currentRemainingMonths: Number(values.currentMonths), newMonthlyRatePercent: Number(values.newRate), newTermMonths: Number(values.newMonths), refinancingCosts: Number(values.costs) }); }
  function resultUrl() { const url = new URL("https://para-hesaplayici.utkanyilmaz.chatgpt.site/borc-yapilandirma-hesaplama"); url.search = new URLSearchParams(values).toString(); return appendCampaignAttribution(url).toString(); }
  function submit(event: FormEvent) { event.preventDefault(); setError(""); trackAnalyticsEvent("calculation_started", "debt_refinance", "seo_landing"); try { const next = run(); setResult(next); setResultVersion((version) => version + 1); if (useProfile) trackAnalyticsEvent("decision_result_ready", "refinance", "calculator_result"); trackAnalyticsEvent("calculation_completed", "debt_refinance", "seo_landing"); } catch (caught) { setResult(null); setError(caught instanceof Error ? caught.message : "Yapılandırma hesaplanamadı."); trackAnalyticsEvent("calculation_failed", "debt_refinance", "seo_landing"); } }
  async function copy() { if (!result) return; const verdict = result.verdict === "advantageous" ? `${money.format(result.totalSavings)} daha avantajlı` : `${money.format(Math.abs(result.totalSavings))} daha maliyetli`; await navigator.clipboard.writeText(`Borç yapılandırma teklifi toplamda ${verdict}. Yeni aylık taksit ${money.format(result.newMonthlyPayment)}. ${resultUrl()}`); setCopied(true); trackAnalyticsEvent("share_started", "debt_refinance", "copy"); window.setTimeout(() => setCopied(false), 1800); }
  return <section className="seo-calculator refinance-calculator"><form onSubmit={submit}><div className="seo-calculator-heading"><span>Teklif karşılaştırması</span><h2>Mevcut borç mu, yeni yapılandırma mı?</h2></div><div className="refinance-columns"><fieldset><legend>Mevcut borcun</legend><label><span>Kalan anapara</span><div className="seo-money"><b>₺</b><input min="1" onChange={(e) => set("principal", e.target.value)} required type="number" value={values.principal} /></div></label><label><span>Mevcut aylık taksit</span><div className="seo-money"><b>₺</b><input min="1" onChange={(e) => set("currentPayment", e.target.value)} required type="number" value={values.currentPayment} /></div></label><label><span>Kalan vade (ay)</span><input min="1" max="600" onChange={(e) => set("currentMonths", e.target.value)} required type="number" value={values.currentMonths} /></label></fieldset><fieldset><legend>Yeni teklif</legend><label><span>Aylık faiz (%)</span><input min="0" max="100" onChange={(e) => set("newRate", e.target.value)} required step="0.01" type="number" value={values.newRate} /></label><label><span>Yeni vade (ay)</span><input min="1" max="600" onChange={(e) => set("newMonths", e.target.value)} required type="number" value={values.newMonths} /></label><label><span>Toplam yapılandırma masrafı</span><div className="seo-money"><b>₺</b><input min="0" onChange={(e) => set("costs", e.target.value)} required type="number" value={values.costs} /></div></label></fieldset></div><button type="submit">Teklifleri karşılaştır <span>→</span></button>{error && <p className="seo-error" role="alert">{error}</p>}</form>{result && <div className={`refinance-result ${result.verdict}`} aria-live="polite"><div className="refinance-verdict"><span>Toplam maliyet sonucu</span><strong>{result.verdict === "advantageous" ? `${money.format(result.totalSavings)} avantaj` : result.verdict === "costlier" ? `${money.format(Math.abs(result.totalSavings))} ek maliyet` : "Maliyetler eşit"}</strong><p>{result.verdict === "advantageous" ? "Girilen varsayımlara göre yapılandırma toplam maliyeti düşürüyor." : result.verdict === "costlier" ? "Daha düşük taksit görünse bile toplam maliyet artıyor." : "İki seçeneğin toplam maliyeti neredeyse aynı."}</p></div><DecisionComparison key={resultVersion} onComplete={completeDecision} measureConversion={useProfile}
      current={{ title: "Mevcut ödeme planı", amount: result.currentRemainingCost, detail: `${money.format(Number(values.currentPayment))} aylık taksit · ${values.currentMonths} ay` }}
      alternative={{ title: "Yeni yapılandırma", amount: result.newTotalCost, detail: `${money.format(result.newMonthlyPayment)} aylık taksit · ${values.newMonths} ay` }}
      basis="Her planın kalan vadesi boyunca toplam ödeme (nominal TL)"
      difference={result.totalSavings}
      useProfile={useProfile}
      report={{
        tool: "refinance",
        title: "Borç yapılandırma karşılaştırması",
        summary: result.verdict === "advantageous" ? "Yeni yapılandırmanın toplam ödemesi daha düşük." : result.verdict === "costlier" ? "Mevcut planın toplam ödemesi daha düşük." : "İki planın toplam ödemesi yaklaşık eşit.",
        source: "Kullanıcının girdiği mevcut ödeme planı ve yapılandırma teklifi.",
        assumptions: `Kalan anapara ${money.format(Number(values.principal))}. Yeni aylık faiz %${Number(values.newRate).toLocaleString("tr-TR")}, peşin masraf ${money.format(Number(values.costs))}. Toplamlar nominal TL üzerinden hesaplanır.`,
        nextStep: "Bankadan kapama bedeli, vergi, sigorta ve diğer ücretleri içeren yazılı ödeme planını iste.",
      }}
    /><p>Aylık taksit farkı <strong>{result.monthlyRelief >= 0 ? "+" : "−"}{money.format(Math.abs(result.monthlyRelief))}</strong> (mevcut taksit eksi yeni taksit).</p><p className="refinance-break-even">{result.breakEvenMonths === null ? "Masrafı yalnız aylık taksit farkıyla geri kazanma noktası oluşmuyor." : result.breakEvenMonths === 0 ? "Ek masraf olmadığı için avantaj ilk aydan başlıyor." : `Yapılandırma masrafı aylık rahatlamayla yaklaşık ${result.breakEvenMonths} ayda geri kazanılıyor.`}</p><DecisionEvidence source="Girdiğiniz mevcut ödeme planı ve yapılandırma teklifi." method="Mevcut toplam, taksit ile kalan vadenin çarpımıdır. Yeni toplam, sabit taksitlerin toplamına peşin masrafların eklenmesiyle bulunur." assumptions="Tutarlar nominal TL’dir. Vergi, sigorta ve diğer ücretler yalnız girdiğiniz faiz veya masrafa dâhilse hesaba girer." /><div className="debt-share-actions"><SaveScenarioButton onSaved={() => completeDecision("save")} scenario={{ tool: "refinance", title: `${money.format(Number(values.principal))} yapılandırma`, summary: `%${values.newRate} aylık faiz · ${values.newMonths} ay yeni vade`, metrics: [{ label: "Toplam fark", value: `${result.totalSavings >= 0 ? "+" : "−"}${money.format(Math.abs(result.totalSavings))}` }, { label: "Yeni taksit", value: money.format(result.newMonthlyPayment) }, { label: "Yeni toplam", value: money.format(result.newTotalCost) }, { label: "Başa baş", value: result.breakEvenMonths === null ? "Oluşmuyor" : `${result.breakEvenMonths} ay` }], href: resultUrl() }} /><button onClick={() => void copy()} type="button">{copied ? "Özet kopyalandı" : "Sonucu kopyala"}</button></div><p className="refinance-warning">Karar vermeden önce bankanızdan güncel kapama tutarı, erken ödeme bedeli, tahsis ücreti, sigorta ve vergileri içeren yazılı toplam maliyeti isteyin.</p></div>}</section>;
}
