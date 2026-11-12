"use client";

import { FormEvent, useState } from "react";
import { calculateDebtPayoff, type PayoffDebt, type PayoffResult } from "../lib/debt-payoff";
import { trackAnalyticsEvent } from "./analytics";
import DebtPaymentCalendar from "./debt-payment-calendar";
import SaveScenarioButton from "./save-scenario-button";

type DebtInput = { id: string; name: string; balance: string; rate: string; minimum: string };
const initialDebts: DebtInput[] = [
  { id: "1", name: "Kredi kartı", balance: "45000", rate: "4.25", minimum: "9000" },
  { id: "2", name: "İhtiyaç kredisi", balance: "120000", rate: "3.49", minimum: "12500" },
];
const money = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 });
const monthLabel = (months: number) => months < 12 ? `${months} ay` : `${Math.floor(months / 12)} yıl${months % 12 ? ` ${months % 12} ay` : ""}`;

export default function DebtPayoffPlanner() {
  const [debts, setDebts] = useState(initialDebts);
  const [extra, setExtra] = useState("5000");
  const [results, setResults] = useState<{ avalanche: PayoffResult; snowball: PayoffResult; baseline: PayoffResult | null; debtCount: number; extraPayment: number } | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const updateDebt = (id: string, field: keyof Omit<DebtInput, "id">, value: string) => setDebts((current) => current.map((debt) => debt.id === id ? { ...debt, [field]: value } : debt));
  const addDebt = () => setDebts((current) => current.length >= 12 ? current : [...current, { id: crypto.randomUUID(), name: `Borç ${current.length + 1}`, balance: "", rate: "", minimum: "" }]);
  const removeDebt = (id: string) => setDebts((current) => current.length === 1 ? current : current.filter((debt) => debt.id !== id));
  const parseDebts = (): PayoffDebt[] => debts.map((debt) => ({ id: debt.id, name: debt.name, balance: Number(debt.balance), monthlyRatePercent: Number(debt.rate), minimumPayment: Number(debt.minimum) }));

  function calculate(event: FormEvent) {
    event.preventDefault(); setError(""); trackAnalyticsEvent("calculation_started", "debt_payoff", "seo_landing");
    try {
      const parsed = parseDebts();
      const start = new Date();
      const extraPayment = Number(extra);
      const avalanche = calculateDebtPayoff(parsed, extraPayment, "avalanche", start);
      const snowball = calculateDebtPayoff(parsed, extraPayment, "snowball", start);
      let baseline: PayoffResult | null = null;
      try {
        baseline = calculateDebtPayoff(parsed, 0, "avalanche", start);
      } catch (error) {
        if (!(error instanceof Error) || !error.message.includes("50 yılda")) throw error;
      }
      setResults({ avalanche, snowball, baseline, debtCount: parsed.length, extraPayment });
      trackAnalyticsEvent("calculation_completed", "debt_payoff", "seo_landing");
    } catch (caught) {
      setResults(null); setError(caught instanceof Error ? caught.message : "Borç planı hesaplanamadı.");
      trackAnalyticsEvent("calculation_failed", "debt_payoff", "seo_landing");
    }
  }

  async function copySummary() {
    if (!results) return;
    const bestResult = results.avalanche.totalInterest <= results.snowball.totalInterest ? results.avalanche : results.snowball;
    const text = `${results.debtCount} borç için aylık ${money.format(results.extraPayment)} ek ödeme ile tahmini borçsuzluk sürem ${monthLabel(bestResult.months)}. ${results.baseline ? `Tahmini faiz tasarrufu ${money.format(Math.max(0, results.baseline.totalInterest - bestResult.totalInterest))}.` : "Ek ödemesiz plan 50 yıl içinde kapanmıyor."} Para Hesaplayıcı: https://para-hesaplayici.utkanyilmaz.chatgpt.site/borc-hesaplama`;
    await navigator.clipboard.writeText(text); setCopied(true); trackAnalyticsEvent("share_started", "debt_payoff", "copy"); window.setTimeout(() => setCopied(false), 1800);
  }

  const best = results && (results.avalanche.totalInterest <= results.snowball.totalInterest ? results.avalanche : results.snowball);
  const savings = results?.baseline && best ? money.format(Math.max(0, results.baseline.totalInterest - best.totalInterest)) : "Hesaplanamadı";
  const chartBase = Math.max(1, best?.schedule[0]?.remainingBalance ?? 1);

  return <section className="payoff-planner" id="borctan-kurtulma">
    <div className="payoff-heading"><span>Çoklu borç planı</span><h2>Borçsuz kalacağın tarihi gör.</h2><p>Kart ve kredilerini birlikte ekle; ek ödemenin hangi sırayla kullanıldığında daha hızlı ve daha düşük faizle sonuç verdiğini karşılaştır.</p></div>
    <form onSubmit={calculate}>
      <div className="payoff-debts">{debts.map((debt, index) => <fieldset key={debt.id}>
        <legend><span>{index + 1}</span> Borç</legend><button aria-label={`${debt.name} borcunu kaldır`} disabled={debts.length === 1} onClick={() => removeDebt(debt.id)} type="button">×</button>
        <label>Borç adı<input maxLength={32} onChange={(event) => updateDebt(debt.id, "name", event.target.value)} required value={debt.name} /></label>
        <label>Kalan borç<input inputMode="decimal" min="1" onChange={(event) => updateDebt(debt.id, "balance", event.target.value)} required type="number" value={debt.balance} /></label>
        <label>Aylık faiz (%)<input inputMode="decimal" max="30" min="0" onChange={(event) => updateDebt(debt.id, "rate", event.target.value)} required step="0.01" type="number" value={debt.rate} /></label>
        <label>Aylık asgari / taksit<input inputMode="decimal" min="1" onChange={(event) => updateDebt(debt.id, "minimum", event.target.value)} required type="number" value={debt.minimum} /></label>
      </fieldset>)}</div>
      <button className="payoff-add" disabled={debts.length >= 12} onClick={addDebt} type="button">+ Başka borç ekle</button>
      <div className="payoff-budget"><label>Aylık ek ödeme<input inputMode="decimal" min="0" onChange={(event) => setExtra(event.target.value)} required type="number" value={extra} /><small>Asgari ödemelerin üzerinde ayırabileceğin tutar.</small></label><button type="submit">Planları karşılaştır <span>→</span></button></div>
      {error && <p className="seo-error" role="alert">{error}</p>}
    </form>
    {results && best && <div className="payoff-results" aria-live="polite">
      <article className="payoff-summary"><span>En düşük faizli plan</span><strong>{best.strategy === "avalanche" ? "Faiz çığı" : "Borç kartopu"}</strong><div><p><small>Borçsuzluk süresi</small><b>{monthLabel(best.months)}</b></p><p><small>Tahmini tarih</small><b>{new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric" }).format(best.debtFreeDate)}</b></p><p><small>Faiz tasarrufu</small><b>{savings}</b></p></div></article>
      <div className="payoff-comparison">{[{ title: "Faiz çığı", note: "En yüksek faizli borç önce", result: results.avalanche }, { title: "Borç kartopu", note: "En küçük borç önce", result: results.snowball }, { title: "Yalnız mevcut ödemeler", note: "Ek ödeme olmadan", result: results.baseline }].map((item) => <article key={item.title}><div><h3>{item.title}</h3><small>{item.note}</small></div>{item.result ? <><p><span>Süre</span><strong>{monthLabel(item.result.months)}</strong></p><p><span>Toplam faiz</span><strong>{money.format(item.result.totalInterest)}</strong></p><p><span>Toplam ödeme</span><strong>{money.format(item.result.totalPaid)}</strong></p></> : <p>50 yıl içinde kapanmıyor.</p>}</article>)}</div>
      <div className="payoff-progress"><div><span>İlk 12 ayda kalan borç</span><strong>{money.format(best.schedule[Math.min(11, best.schedule.length - 1)]?.remainingBalance ?? 0)}</strong></div><div className="payoff-bars">{best.schedule.slice(0, 12).map((month) => <i key={month.month} style={{ height: `${Math.max(5, month.remainingBalance / chartBase * 100)}%` }} title={`${month.month}. ay: ${money.format(month.remainingBalance)}`} />)}</div></div>
      <DebtPaymentCalendar key={best.strategy} results={results} preferred={best.strategy} />
      <div className="payoff-result-actions"><SaveScenarioButton scenario={{ tool: "debt_payoff", title: `${results.debtCount} borç · ${monthLabel(best.months)}`, summary: `Ayda ${money.format(results.extraPayment)} ek ödeme · ${best.strategy === "avalanche" ? "Faiz çığı" : "Borç kartopu"}`, metrics: [{ label: "Borçsuzluk süresi", value: monthLabel(best.months) }, { label: "Toplam faiz", value: money.format(best.totalInterest) }, { label: "Faiz tasarrufu", value: savings }, { label: "Toplam ödeme", value: money.format(best.totalPaid) }], href: "/borc-hesaplama#borctan-kurtulma" }} /><button className="payoff-copy" onClick={() => void copySummary()} type="button">{copied ? "Özet kopyalandı" : "Borçsuzluk planını paylaş"}</button></div>
      <p className="payoff-disclaimer">Bu bir planlama simülasyonudur. Faiz her ay kalan bakiyeye uygulanır; gecikme, vergi, ücret, erken kapama bedeli ve bankaya özgü kurallar dahil değildir. Karar vermeden önce sözleşmenizdeki güncel kapama tutarını kontrol edin.</p>
    </div>}
  </section>;
}
