export const toolCatalog = [
  { href: "/gecmis-para-degeri", icon: "↗", title: "Geçmiş Para Değeri", copy: "Geçmişteki bir tutarın bugünkü tarihsel karşılığını gör.", tag: "gecmis_para", category: "Geçmiş ve enflasyon", keywords: "geçmiş para altın dolar euro bist bitcoin" },
  { href: "/harcamanin-firsat-maliyeti", icon: "◫", title: "Harcamanın Fırsat Maliyeti", copy: "Bir harcama yerine yatırım yapılsaydı ne olacağını karşılaştır.", tag: "firsat_maliyeti", category: "Harcama analizi", keywords: "keşke telefon düğün araba yatırım" },
  { href: "/sigara-maliyeti-hesaplama", icon: "↻", title: "Sigara Maliyeti", copy: "Aylık sigara giderinin toplam ve alternatif maliyetini hesapla.", tag: "sigara", category: "Harcama analizi", keywords: "sigara alışkanlık aylık gider" },
  { href: "/borc-hesaplama", icon: "%", title: "Borçtan Kurtulma Planı", copy: "Taksiti hesapla; kartopu ve faiz çığı yöntemleriyle borçsuzluk tarihini gör.", tag: "borc", category: "Borç ve faiz", keywords: "kredi borç faiz taksit vade kartopu çığ kapatma" },
  { href: "/borc-yapilandirma-hesaplama", icon: "⇄", title: "Borç Yapılandırma", copy: "Mevcut planla yeni teklifi toplam maliyet ve başa baş süresiyle karşılaştır.", tag: "borc_yapilandirma", category: "Borç ve faiz", keywords: "borç kredi yapılandırma refinansman teklif karşılaştırma kapama" },
  { href: "/kredi-erken-kapama-hesaplama", icon: "✓", title: "Kredi Erken Kapama", copy: "Kalan taksit toplamını bankanın bugünkü kapama teklifiyle karşılaştır.", tag: "erken_kapama", category: "Borç ve faiz", keywords: "kredi erken kapama kalan taksit tasarruf kapama tutarı" },
  { href: "/borc-gelir-orani-hesaplama", icon: "÷", title: "Borç/Gelir Oranı", copy: "Borç taksitlerinin gelirindeki payını ve giderlerden sonra kalan tutarı gör.", tag: "borc_gelir_orani", category: "Borç ve faiz", keywords: "borç gelir oranı ödeme gücü bütçe taksit" },
  { href: "/maas-alim-gucu-hesaplama", icon: "₺", title: "Maaş Alım Gücü", copy: "Maaşının enflasyona karşı gerçek değişimini hesapla.", tag: "maas", category: "Maaş ve bütçe", keywords: "maaş zam enflasyon alım gücü" },
  { href: "/birikim-hedefi-hesaplama", icon: "+", title: "Birikim Hedefi", copy: "Aylık birikimin gelecekteki nominal ve reel değerini gör.", tag: "birikim", category: "Birikim ve yatırım", keywords: "birikim hedef düzenli yatırım gelecek" },
  { href: "/mevduat-faiz-hesaplama", icon: "↥", title: "Mevduat Faizi", copy: "Brüt faiz, stopaj sonrası net ve reel getiriyi hesapla.", tag: "mevduat", category: "Borç ve faiz", keywords: "mevduat faiz stopaj net getiri" },
  { href: "/kisisel-enflasyon-hesaplama", icon: "≈", title: "Kişisel Enflasyon", copy: "Kendi harcama sepetindeki gerçek fiyat artışını ölç.", tag: "kisisel_enflasyon", category: "Maaş ve bütçe", keywords: "kira market bütçe gider kişisel enflasyon" },
] as const;

export const toolCategories = ["Tümü", ...new Set(toolCatalog.map((tool) => tool.category))];
