import type { Guide } from "./guide-catalog";

export const topics = [
  { id: "borc", title: "Borç kararları", tools: ["/borc-karar-merkezi", "/borc-hesaplama", "/borc-yapilandirma-hesaplama", "/kredi-erken-kapama-hesaplama"] },
  { id: "maas", title: "Maaş ve enflasyon", tools: ["/maas-alim-gucu-hesaplama", "/kisisel-enflasyon-hesaplama"] },
  { id: "harcama", title: "Fırsat maliyeti", tools: ["/harcamanin-firsat-maliyeti", "/gecmis-para-degeri"] },
] as const;

const cpi = { label: "TCMB · TÜİK tüketici fiyatları tablosu", href: "https://www.tcmb.gov.tr/wps/wcm/connect/TR/TCMB%2BTR/Main%2BMenu/Istatistikler/Enflasyon%2BVerileri/Tuketici%2BFiyatlari" };

export const decisionGuides: Guide[] = [
  {
    slug: "borc-yapilandirma-teklifi-nasil-karsilastirilir", topic: "borc", eyebrow: "Borç kararları",
    title: "Borç yapılandırma teklifi nasıl karşılaştırılır?",
    description: "Yeni taksit, kalan vade ve peşin masraflarla iki ödeme planının toplam maliyetini hesaplayın.",
    readTime: "3 dk", toolHref: "/borc-yapilandirma-hesaplama", toolLabel: "Yapılandırma teklifini karşılaştır",
    updatedAt: "2026-11-12",
    sources: [{ label: "CFPB · Aylık taksit ve toplam kredi maliyeti karşılaştırma yöntemi", href: "https://www.consumerfinance.gov/ask-cfpb/how-do-i-compare-auto-loan-offers-what-should-i-look-at-besides-the-monthly-payment-en-753/" }],
    sections: [
      { title: "Ödeme planlarını aynı noktadan başlatın", text: "Bugünden itibaren ödenecek taksitleri karşılaştırın. Mevcut plan toplamı, kalan taksitlerin toplamıdır. Yeni plan toplamı, yeni taksitlerin toplamı artı peşin masraflardır. Taksitler eşitse toplamı taksit × ay sayısıyla bulabilirsiniz." },
      { title: "Düşük taksitli örnek", text: "Mevcut plan 12 × 8.000 TL = 96.000 TL. Yeni plan 18 × 6.000 TL + 3.000 TL peşin masraf = 111.000 TL. Yeni plan ilk 12 ay aylık 2.000 TL daha az taksit ister, peşin masraf hariç. Toplamda 15.000 TL daha fazla ödeme gerektirir." },
      { title: "Teklifteki kalemleri doğrulayın", text: "Banka ödeme planından vade, taksit ve masrafları alın. Taksitin içinde bulunan ücreti peşin masrafa tekrar eklemeyin. Bu basit toplam hesabı ödemelerin zaman değerini içermez." },
    ],
  },
  {
    slug: "kisisel-enflasyon-nasil-hesaplanir", topic: "maas", eyebrow: "Maaş ve enflasyon",
    title: "Kişisel enflasyon nasıl hesaplanır?",
    description: "Kira, market ve ulaşım sepetinizi aynı miktarlar üzerinden karşılaştırıp kendi maliyet artışınızı bulun.",
    readTime: "3 dk", toolHref: "/kisisel-enflasyon-hesaplama", toolLabel: "Kendi harcama sepetini hesapla",
    updatedAt: "2026-11-12", sources: [cpi],
    sections: [
      { title: "Aynı harcama sepetini fiyatlandırın", text: "İki dönem için aynı ürün ve hizmet miktarlarını kullanın. Kişisel enflasyon = (yeni sepet toplamı ÷ eski sepet toplamı − 1) × 100. Daha fazla ürün satın aldıysanız miktar değişimini fiyat artışıyla karıştırmamaya dikkat edin." },
      { title: "10.000 TL’lik sepet örneği", text: "Eski sepetinizde kira 6.000 TL, market 3.000 TL, ulaşım 1.000 TL olsun. Yeni maliyetler sırasıyla 9.000, 4.200 ve 1.300 TL ise sepet 14.500 TL’ye çıkar. Aynı sepetin maliyeti %45 artmıştır." },
      { title: "Maaşla birlikte okuyun", text: "Eski net maaşı 1,45 ile çarparak bu örnekte sepetin alım gücünü koruyan maaşı bulabilirsiniz. Resmî TÜFE ile aynı dönemleri kıyaslayın. Kişisel sepetteki kalem ve ağırlıklar genel endeksten farklı olabilir." },
    ],
  },
  {
    slug: "simdi-almak-mi-parayi-ayirmak-mi", topic: "harcama", eyebrow: "Fırsat maliyeti",
    title: "Şimdi almak mı, parayı ayırmak mı?",
    description: "Bir satın alma kararında ikinci el değeri ve birikimi aynı sürede ve aynı enflasyon varsayımıyla kıyaslayın.",
    readTime: "3 dk", toolHref: "/harcamanin-firsat-maliyeti", toolLabel: "Satın alma kararını karşılaştır",
    updatedAt: "2026-11-12", sources: [cpi],
    sections: [
      { title: "Karşılaştırma süresini belirleyin", text: "Peşin fiyatı, ürünün dönem sonundaki tahmini ikinci el değerini ve parayı ayırırsanız beklediğiniz net getiriyi belirleyin. Birikim = peşin fiyat × (1 + yıllık net getiri) üzeri yıl sayısı. Her iki dönem sonu tutarını aynı enflasyon katsayısına bölün." },
      { title: "Bir yıllık telefon örneği", text: "30.000 TL fiyat, 18.000 TL tahmini ikinci el değeri, %20 net getiri ve %25 enflasyon varsayalım. Dönem sonunda ikinci el değeri 18.000 TL, birikim 36.000 TL olur. Bugünün alım gücüyle bunlar 14.400 TL ve 28.800 TL’dir." },
      { title: "Ürünü kullanmanın faydasını ayrıca değerlendirin", text: "Örnekteki fark finansal değer üzerinden hesaplanır. Ürün işiniz için gelir sağlayacaksa veya beklemenin somut bir maliyeti varsa bu etkiyi ayrıca yazın. İkinci el fiyatı ve getiri varsayımlarını değiştirerek sonucu tekrar görün." },
    ],
  },
  {
    slug: "gecmis-harcamanin-firsat-maliyeti-nasil-hesaplanir", topic: "harcama", eyebrow: "Fırsat maliyeti",
    title: "Geçmiş harcamanın fırsat maliyeti nasıl hesaplanır?",
    description: "Geçmişte harcadığınız tutarın tarihsel bir yatırım alternatifinde bugün neye karşılık geleceğini hesaplayın.",
    readTime: "3 dk", toolHref: "/harcamanin-firsat-maliyeti", toolLabel: "Geçmiş harcamayı karşılaştır",
    updatedAt: "2026-11-12", sources: [{ label: "TCMB · Elektronik Veri Dağıtım Sistemi", href: "https://evds3.tcmb.gov.tr/" }],
    sections: [
      { title: "Aynı başlangıç tutarını kullanın", text: "Basit fiyat kıyaslamasında alternatifin son değeri = harcama tutarı × (son fiyat ÷ ilk fiyat). İki fiyat da aynı para biriminde olmalı. Piyasanın kapalı olduğu günlerde kullanılan işlem tarihini sonuç ekranında kontrol edin." },
      { title: "Varsayımsal fiyatlarla örnek", text: "Harcama 20.000 TL, göstergenin ilk fiyatı 100 TL ve son fiyatı 175 TL ise tarihsel karşılık 35.000 TL olur. Ürünün bugünkü ikinci el değeri 12.000 TL ise aynı tarihteki nominal değer farkı 23.000 TL’dir." },
      { title: "Sonucun sınırlarını okuyun", text: "Vergi, alış-satış makası ve işlem ücretleri sonucu değiştirebilir. Fiyatların geçmişte izlediği yol, gelecekteki getiri için güvence sağlamaz. Ürünün sağladığı kullanım faydası bu fiyat hesabına dâhil değildir." },
    ],
  },
];
