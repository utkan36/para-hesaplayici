"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { trackAnalyticsEvent } from "./analytics";
import { DebtDecisionAnswer, recommendDebtTool } from "../lib/debt-decision-guide";

const options = [
  { href: "/borc-hesaplama", icon: "%", label: "Yeni kredi veya tek borç", title: "Taksitimi ve toplam faizi hesaplamak istiyorum", copy: "Tutar, aylık faiz ve vadeye göre eşit taksit planını gör." },
  { href: "/borc-hesaplama#borctan-kurtulma", icon: "↘", label: "Birden fazla borç", title: "Kartlarımı ve kredilerimi sırayla kapatmak istiyorum", copy: "Faiz çığı ve borç kartopu yöntemlerini aynı bütçeyle karşılaştır." },
  { href: "/borc-yapilandirma-hesaplama", icon: "⇄", label: "Yeni banka teklifi", title: "Yapılandırma gerçekten ucuz mu görmek istiyorum", copy: "Yeni taksit, toplam maliyet, masraf ve başa baş süresini hesapla." },
  { href: "/kredi-erken-kapama-hesaplama", icon: "✓", label: "Toplu para ile kapama", title: "Krediyi bugün kapatırsam ne kazanırım?", copy: "Kalan taksit toplamını bankanın güncel kapama rakamıyla karşılaştır." },
  { href: "/borc-gelir-orani-hesaplama", icon: "÷", label: "Aylık ödeme gücü", title: "Gelirimin ne kadarı borca gidiyor?", copy: "Borç/gelir oranını, giderlerden sonra kalan tutarı ve stres testini gör." },
] as const;

const initialAnswers: DebtDecisionAnswer = { debtCount: "one", hasRefinanceOffer: false, hasLumpSum: false };

export default function DebtDecisionOptions() {
  const [answers, setAnswers] = useState(initialAnswers);
  const [recommendation, setRecommendation] = useState<ReturnType<typeof recommendDebtTool> | null>(null);
  function submit(event: FormEvent) { event.preventDefault(); const next = recommendDebtTool(answers); setRecommendation(next); trackAnalyticsEvent("guide_choice", `debt_recommendation_${next.id}`, "debt_center_guide"); }

  return <>
    <form className="debt-guide" onSubmit={submit}>
      <div className="debt-guide-heading"><span>60 saniyelik yönlendirme</span><h2>Hangi hesapla başlamalısın?</h2><p>Üç kısa cevap ver; durumuna uygun ilk adımı söyleyelim.</p></div>
      <div className="debt-guide-questions">
        <fieldset><legend>Kaç borcun var?</legend><label><input checked={answers.debtCount === "one"} name="debt-count" onChange={() => setAnswers({ ...answers, debtCount: "one" })} type="radio" /> Tek borç</label><label><input checked={answers.debtCount === "multiple"} name="debt-count" onChange={() => setAnswers({ ...answers, debtCount: "multiple" })} type="radio" /> Birden fazla</label></fieldset>
        <fieldset><legend>Yeni yapılandırma teklifin var mı?</legend><label><input checked={answers.hasRefinanceOffer} name="offer" onChange={() => setAnswers({ ...answers, hasRefinanceOffer: true })} type="radio" /> Evet</label><label><input checked={!answers.hasRefinanceOffer} name="offer" onChange={() => setAnswers({ ...answers, hasRefinanceOffer: false })} type="radio" /> Hayır</label></fieldset>
        <fieldset><legend>Kullanabileceğin toplu para var mı?</legend><label><input checked={answers.hasLumpSum} name="lump-sum" onChange={() => setAnswers({ ...answers, hasLumpSum: true })} type="radio" /> Evet</label><label><input checked={!answers.hasLumpSum} name="lump-sum" onChange={() => setAnswers({ ...answers, hasLumpSum: false })} type="radio" /> Hayır</label></fieldset>
      </div>
      <button type="submit">Bana uygun aracı göster</button>
      {recommendation ? <div className="debt-guide-result" aria-live="polite"><span>Önerilen ilk adım</span><h3>{recommendation.title}</h3><p>{recommendation.reason}</p><Link href={recommendation.href} onClick={() => trackAnalyticsEvent("guide_choice", `debt_recommended_open_${recommendation.id}`, "debt_center_guide")}>Önerilen hesabı aç →</Link><small>Bu yönlendirme finansal tavsiye değildir; hesap sonucunu bankanın yazılı teklifiyle doğrula.</small></div> : null}
    </form>
    <div className="debt-options-heading"><span>Tüm borç araçları</span><h2>Aracını kendin de seçebilirsin.</h2></div>
    <div className="debt-decision-options">{options.map((option, index) => <Link href={option.href} key={option.href} onClick={() => trackAnalyticsEvent("guide_choice", `debt_path_${index + 1}`, "debt_center")}><i aria-hidden="true">{option.icon}</i><div><span>{option.label}</span><h2>{option.title}</h2><p>{option.copy}</p><b>Doğru aracı aç →</b></div></Link>)}</div>
  </>;
}
