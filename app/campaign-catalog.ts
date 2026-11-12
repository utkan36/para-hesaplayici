export type Campaign = {
  id: string;
  eyebrow: string;
  title: string;
  hook: string;
  audience: string;
  toolHref: string;
  socialCopy: string;
};

const withCampaign = (href: string, id: string) => {
  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}utm_source=kampanya_merkezi&utm_campaign=${id}`;
};

const rawCampaigns: Campaign[] = [
  { id: "telefon-yerine-altin", eyebrow: "KEŞKE HESABI", title: "2021’de telefon yerine altın", hook: "Bir telefonun fiyatı yatırımda kalsaydı bugün ne olurdu?", audience: "Instagram · X", toolHref: "/?tool=opportunity&purchase=Telefon&opportunityAmount=15000&opportunityDate=2021-01-04", socialCopy: "2021’de 15.000 TL’lik telefon yerine altın alınsaydı bugün ne olurdu? Sonucu tahmin et, sonra hesabı aç 👇" },
  { id: "bes-yillik-sigara", eyebrow: "ALIŞKANLIK", title: "Beş yıllık sigara harcaması", hook: "Aylık gideri tek rakam değil, birikimli fırsat maliyeti olarak gör.", audience: "Instagram · WhatsApp", toolHref: "/?tool=recurring-opportunity&habit=Sigara&monthly=2000&recurringStart=2021-01-04&yearlyIncrease=20", socialCopy: "Ayda 2.000 TL sigara harcaması beş yılda yalnız toplam gider değildir. Aynı para düzenli yatırıma gitseydi ne olurdu?" },
  { id: "kahve-yerine-birikim", eyebrow: "GÜNLÜK HARCAMA", title: "Kahve yerine düzenli birikim", hook: "Küçük ama tekrarlanan bir harcamanın uzun vadeli etkisini göster.", audience: "Reels · TikTok", toolHref: "/?tool=recurring-opportunity&habit=Kahve&monthly=1500&recurringStart=2022-01-03&yearlyIncrease=20", socialCopy: "Kahve içme demiyorum; maliyetini bil diyorum. Ayda 1.500 TL düzenli birikseydi bugün hangi noktada olurdu?" },
  { id: "dugun-firsat-maliyeti", eyebrow: "BÜYÜK KARAR", title: "Düğün harcamasının fırsat maliyeti", hook: "Tek günlük harcamayı uzun vadeli finansal alternatifleriyle karşılaştır.", audience: "X · LinkedIn", toolHref: "/?tool=opportunity&purchase=Düğün&opportunityAmount=250000&opportunityDate=2022-06-01", socialCopy: "2022’de düğüne ayrılan 250.000 TL yatırımda kalsaydı bugün ne olurdu? Harcamanın değerini değil, finansal alternatifini hesapladım." },
  { id: "eski-maas-bugun", eyebrow: "MAAŞ", title: "Eski maaşın bugünkü alım gücü", hook: "Zam oranından önce, aynı alım gücü için gereken maaşı bul.", audience: "LinkedIn · X", toolHref: "/maas-alim-gucu-hesaplama?oldSalary=10000&currentSalary=30000&salaryDate=2022-01", socialCopy: "Maaşım yüzde kaç arttı değil, aynı hayatı sürdürmek için bugün kaç TL olmalıydı? TÜFE ile alım gücü hesabı burada." },
  { id: "yuz-bin-mevduat", eyebrow: "MEVDUAT", title: "100.000 TL’nin 32 günlük getirisi", hook: "Brüt faiz, stopaj ve enflasyon sonrasını aynı ekranda gör.", audience: "Google · X", toolHref: "/mevduat-faiz-hesaplama?principal=100000&annualInterest=45&termDays=32&withholding=15&inflation=30", socialCopy: "100.000 TL mevduatta 32 günde ne kadar kazanır? Brüt faiz tek başına yetmez; stopaj ve enflasyon sonrası sonucu da hesaplamak gerekir." },
  { id: "kredi-gercek-maliyet", eyebrow: "BORÇ", title: "100.000 TL borcun gerçek maliyeti", hook: "Aylık taksitin yanında toplam faiz yükünü görünür kıl.", audience: "Google · WhatsApp", toolHref: "/borc-hesaplama?principal=100000&rate=3.5&months=12", socialCopy: "100.000 TL borçta yalnız aylık taksite bakmak yanıltır. Vade sonunda toplam ödeme ve faiz yükü ne kadar?" },
  { id: "aylik-bes-bin", eyebrow: "BİRİKİM", title: "Ayda 5.000 TL, beş yılda ne olur?", hook: "Getiri kadar enflasyon sonrası alım gücünü de hesaba kat.", audience: "Instagram · LinkedIn", toolHref: "/birikim-hedefi-hesaplama?initialAmount=0&monthlyContribution=5000&annualIncrease=20&years=5&annualReturn=35&inflation=25&target=1000000", socialCopy: "Ayda 5.000 TL biriktirmek beş yılda hangi tutara ulaşır? Nominal sonucu ve bugünkü alım gücünü ayrı ayrı hesapladım." },
  { id: "yuz-bin-gecmis-deger", eyebrow: "ZAMAN MAKİNESİ", title: "2020’deki 100.000 TL bugün ne olurdu?", hook: "Altın, dolar, BIST, mevduat ve enflasyon karşılaştırmasını başlat.", audience: "X · Instagram", toolHref: "/?amount=100000&currency=TRY&start=2020-01-02&target=2026-09-01&index=ALTIN&mode=forward&goalValue=nominal&delay=30&lens=gross", socialCopy: "2020’deki 100.000 TL bugün ne olurdu? Tek bir cevap yok: altın, dolar, BIST, mevduat ve enflasyon farklı hikâyeler anlatıyor." },
  { id: "kisisel-enflasyon", eyebrow: "HARCAMA SEPETİ", title: "Benim enflasyonum kaç?", hook: "Resmî ortalamanın yanında kendi harcama sepetindeki değişimi ölç.", audience: "Instagram · WhatsApp", toolHref: "/kisisel-enflasyon-hesaplama", socialCopy: "Herkesin enflasyonu aynı değil. Kira, market, ulaşım ve faturaları kendi ağırlıklarımla hesaplayınca benim oranım kaç çıkıyor?" },
];

export const campaigns = rawCampaigns.map((campaign) => ({ ...campaign, toolHref: withCampaign(campaign.toolHref, campaign.id) }));
