"use client";

import { useState, type FormEvent } from "react";
import { comparePurchaseDecision } from "../lib/purchase-decision";
import { useDecisionCompletion } from "./use-decision-completion";
import DecisionComparison from "./decision-comparison";
import DecisionEvidence from "./decision-evidence";
import { trackAnalyticsEvent } from "./analytics";

const fields = [
  { name: "price", label: "Bugünkü satın alma fiyatı (TL)", min: 1, step: "any" },
  { name: "residualValue", label: "Süre sonunda tahmini ikinci el değeri (TL)", min: 0, step: "any" },
  { name: "months", label: "Karşılaştırma süresi (ay)", min: 1, max: 120, step: "1" },
  { name: "annualNetReturn", label: "Varsaydığın yıllık net getiri (%)", min: -99.99, step: "0.01" },
  { name: "annualInflation", label: "Varsaydığın yıllık enflasyon (%)", min: -99.99, step: "0.01" },
] as const;
const money = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 });

export default function PurchaseDecisionCalculator() {
  const [resultVersion, setResultVersion] = useState(0);
  const completeDecision = useDecisionCompletion("purchase", resultVersion, true);
  const [result, setResult] = useState<(ReturnType<typeof comparePurchaseDecision> & { months: number; residualValue: number; price: number; annualNetReturn: number; annualInflation: number; stress: { rate: number; savingsRealValue: number; difference: number } | null }) | null>(null);
  const [error, setError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const number = (field: string) => Number(data.get(field));
    const months = number("months");
    const residualValue = number("residualValue");
    trackAnalyticsEvent("calculation_started", "purchase_decision", "seo_landing");
    try {
      const input = {
        price: number("price"), residualValue, months,
        annualNetReturn: number("annualNetReturn"), annualInflation: number("annualInflation"),
      };
      const comparison = comparePurchaseDecision(input);
      const stressInput = String(data.get("stressRate") ?? "").trim();
      const stress = stressInput === "" ? null : {
        rate: Number(stressInput),
        ...comparePurchaseDecision({ ...input, annualNetReturn: Number(stressInput) }),
      };
      setResult({ ...input, ...comparison, stress });
      setError("");
      setResultVersion((version) => version + 1); trackAnalyticsEvent("decision_result_ready", "purchase", "calculator_result"); trackAnalyticsEvent("calculation_completed", "purchase_decision", "seo_landing");
    } catch (caught) {
      setResult(null);
      setError(caught instanceof Error ? caught.message : "Hesaplama tamamlanamadı.");
      trackAnalyticsEvent("calculation_failed", "purchase_decision", "seo_landing");
    }
  }

  const summary = !result ? "" : result.difference > 0
    ? "Bu senaryoda parayı ayırmak dönem sonunda daha yüksek finansal değer bırakıyor."
    : result.difference < 0
      ? "Bu senaryoda ürünün tahmini ikinci el değeri dönem sonundaki birikimi aşıyor."
      : "Bu senaryoda iki seçeneğin dönem sonu finansal değeri eşit.";

  const stress = result?.stress;
  const stressSummary = stress
    ? `Yıllık net getiri %${stress.rate.toLocaleString("tr-TR")} olursa birikimin bugünkü karşılığı ${money.format(stress.savingsRealValue)}. ${stress.difference === 0 ? "İki seçeneğin değeri eşit." : `${stress.difference > 0 ? "Birikim" : "İkinci el değeri"} ${money.format(Math.abs(stress.difference))} daha yüksek.`}`
    : "";

  return (
    <section className="seo-calculator">
      <form onSubmit={submit} onChange={() => { setResult(null); setError(""); }}>
        <div className="seo-calculator-heading"><h2>Şimdi alırsan veya paranı tutarsan ne değişir?</h2></div>
        <p>İkinci el değeri yoksa 0 gir. Getiri ve enflasyon için kendi senaryo oranlarını kullan.</p>
        <div className="seo-field-grid">
          {fields.map((field) => (
            <label key={field.name}>
              <span>{field.label}</span>
              <input name={field.name} min={field.min} max={"max" in field ? field.max : undefined} step={field.step} type="number" required />
            </label>
          ))}
          <label>
            <span>Alternatif yıllık net getiri (%) · İsteğe bağlı</span>
            <input name="stressRate" min="-99.99" step="0.01" type="number" inputMode="decimal" />
          </label>
        </div>
        <button type="submit">İki seçeneği karşılaştır <span aria-hidden="true">→</span></button>
        {error && <p className="seo-error" role="alert">{error}</p>}
      </form>
      {result && (
        <>
          <p>{summary}</p>
          <DecisionComparison key={resultVersion} onComplete={completeDecision}
            current={{ title: "Şimdi satın al", amount: result.purchaseRealValue, detail: `Süre sonunda tahmini ${money.format(result.residualValue)} ikinci el değeri` }}
            alternative={{ title: "Parayı ayır", amount: result.savingsRealValue, detail: `Süre sonunda varsayımsal ${money.format(result.savingsValue)} birikim` }}
            basis={`${result.months} ay sonundaki değerler, bugünün alım gücüyle`}
            difference={result.difference}
            report={{
              tool: "purchase",
              title: "Büyük harcama karşılaştırması",
              summary,
              source: "Kullanıcının girdiği satın alma fiyatı, ikinci el değeri, net getiri ve enflasyon.",
              assumptions: `Peşin fiyat ${money.format(result.price)}. Yıllık net getiri %${result.annualNetReturn.toLocaleString("tr-TR")}, yıllık enflasyon %${result.annualInflation.toLocaleString("tr-TR")}. Kullanım faydası, bakım masrafı ve ilerideki alım fiyatı hesaba girmez.`,
              nextStep: stressSummary || "Karar vermeden önce ikinci el değeri ile net getiri varsayımlarını daha düşük ve daha yüksek değerlerle tekrar dene.",
            }}
          />
          {stress && <section className="decision-comparison" aria-labelledby="purchase-stress-title">
            <h3 id="purchase-stress-title">Getiri değişirse</h3>
            <p>{stressSummary}</p>
            <p>Karşılaştırma süresi, ikinci el değeri ve enflasyon varsayımı iki getiri hesabında aynı.</p>
          </section>}
          <DecisionEvidence
            source="Girdiğin fiyat, tahmini ikinci el değeri, net getiri ve enflasyon oranları."
            method="Ayrılan para varsayılan yıllık net getiriyle bileşik büyür. İki seçeneğin dönem sonu değeri aynı enflasyon katsayısıyla bugüne çevrilir."
            assumptions="Peşin alım varsayılır. Ürünü kullanmanın faydası, bakım masrafı ve ilerideki satın alma fiyatı hesaba girmez. Oranlar senaryo boyunca sabittir."
          />
        </>
      )}
    </section>
  );
}
