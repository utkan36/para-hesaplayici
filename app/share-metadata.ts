const money = (value: string | null) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0
    ? new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(numeric)
    : "Bir tutar";
};

const clean = (value: string | null, fallback: string) => (value ?? "").replace(/[<>\n\r]/g, " ").trim().slice(0, 48) || fallback;

export function describeSharedResult(params: URLSearchParams) {
  const tool = params.get("tool") ?? "main";
  if (tool === "opportunity") {
    const purchase = clean(params.get("purchase"), "harcama");
    const amount = money(params.get("opportunityAmount"));
    const winner = clean(params.get("winner"), "yatırım");
    const result = money(params.get("resultValue"));
    return { eyebrow: "KEŞKE HESABI", title: `${amount} “${purchase}” yerine ${winner} olsaydı?`, result, description: `${clean(params.get("opportunityDate"), "Geçmiş tarih")} tarihli harcamanın en güçlü tarihsel alternatifi. Sen de kendi hesabını oluştur.` };
  }
  if (tool === "recurring-opportunity") {
    const habit = clean(params.get("habit"), "alışkanlık");
    const monthly = money(params.get("monthly"));
    const winner = clean(params.get("winner"), "yatırım");
    return { eyebrow: "ALIŞKANLIK MALİYETİ", title: `Ayda ${monthly} “${habit}” yerine biriktirilseydi?`, result: money(params.get("resultValue")), description: `${winner} ile tarihsel karşılaştırma. Düzenli harcamanın gerçek fırsat maliyetini gör.` };
  }
  if (tool === "debt") {
    return { eyebrow: "BORÇ HESAPLAMA", title: `${money(params.get("principal"))} borcun aylık taksiti`, result: money(params.get("monthlyPayment")), description: `${clean(params.get("months"), "—")} ay vade · Aylık %${clean(params.get("rate"), "—")} faiz · Toplam geri ödeme ${money(params.get("totalPayment"))}.` };
  }
  if (tool === "salary") {
    const difference = Number(params.get("difference"));
    return { eyebrow: "MAAŞ ALIM GÜCÜ", title: `${money(params.get("oldSalary"))} maaş bugün ${money(params.get("requiredSalary"))} olmalıydı`, result: Number.isFinite(difference) ? `${difference >= 0 ? "+" : "−"}${money(String(Math.abs(difference)))} / ay` : money(params.get("requiredSalary")), description: `${clean(params.get("salaryDate"), "Geçmiş dönem")} maaşının TÜFE ile bugünkü karşılığı ve gerçek alım gücü farkı.` };
  }
  if (tool === "savings") {
    return { eyebrow: "BİRİKİM HEDEFİ", title: `Ayda ${money(params.get("monthlyContribution"))} ile ${clean(params.get("years"), "—")} yıllık plan`, result: money(params.get("futureValue")), description: `Tahmini dönem sonu birikimi · Bugünkü alım gücüyle ${money(params.get("realFutureValue"))}. Sen de kendi planını hesapla.` };
  }
  if (tool === "deposit") {
    const realGain = Number(params.get("realGain"));
    return { eyebrow: "MEVDUAT GETİRİSİ", title: `${money(params.get("principal"))} · ${clean(params.get("termDays"), "—")} günlük mevduat`, result: money(params.get("maturityAmount")), description: `Yıllık %${clean(params.get("annualInterest"), "—")} brüt faiz · ${Number.isFinite(realGain) && realGain < 0 ? "Enflasyon varsayımında alım gücü kaybı" : "Enflasyon sonrası reel sonuç"}.` };
  }
  if (tool === "personal-inflation") {
    return { eyebrow: "KİŞİSEL ENFLASYON", title: `Aylık harcama sepetim %${clean(params.get("inflation"), "—")} arttı`, result: money(params.get("currentTotal")), description: `Önceki aylık sepet ${money(params.get("oldTotal"))} · Aylık ek yük ${money(params.get("monthlyIncrease"))}. Sen de kendi sepetini hesapla.` };
  }
  const label = clean(params.get("label"), "tarihsel ölçüt");
  return { eyebrow: "PARANIN ZAMAN MAKİNESİ", title: `${money(params.get("amount"))} ${label} karşılaştırması`, result: money(params.get("resultValue")), description: `${clean(params.get("start"), "Geçmiş tarih")} tarihindeki paranın bugünkü tarihsel karşılığını gör.` };
}
