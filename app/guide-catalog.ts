import { decisionGuides } from "./decision-guides";

export type Guide = { topic?: "borc" | "maas" | "harcama"; updatedAt?: string; sources?: Array<{ label: string; href: string }>; slug: string; eyebrow: string; title: string; description: string; readTime: string; toolHref: string; toolLabel: string; sections: Array<{ title: string; text: string; bullets?: string[] }> };

export const guides: Guide[] = [
  { topic: "borc", slug: "borc-kartopu-mu-faiz-cigi-mi", eyebrow: "Borç yönetimi", title: "Borç kartopu mu, faiz çığı mı?", description: "Birden fazla borcu kapatırken motivasyon ile toplam faiz tasarrufu arasındaki farkı anlayın.", readTime: "6 dk", toolHref: "/borc-hesaplama#borctan-kurtulma", toolLabel: "Borç planını karşılaştır", sections: [
    { title: "İki yöntemin farkı", text: "Kartopu yönteminde ek para bakiyesi en küçük borca, faiz çığında ise aylık faizi en yüksek borca gider. Ödeme bütçesi aynıysa faiz çığı çoğunlukla daha düşük maliyet üretir." },
    { title: "Faiz çığı ne zaman mantıklı?", text: "Faiz oranları arasında belirgin fark varsa yüksek faizli bakiyeyi önce küçültmek maliyeti azaltır.", bullets: ["Ödeme disiplininiz güçlüyse", "Önceliğiniz toplam faizi azaltmaksa", "Yüksek faizli kart borcunuz varsa"] },
    { title: "Kartopu ne zaman işe yarar?", text: "Çok sayıda küçük borç takibi zorlaştırıyorsa ilk hesabı erken kapatmak ilerleme hissi ve daha sade nakit akışı sağlayabilir. Bunun ek faiz maliyetini yine de karşılaştırın." },
    { title: "Ek ödeme neden kritik?", text: "Yöntemden bağımsız olarak asgari tutarın üzerinde düzenli ödeme süreyi kısaltır. Kapanan borcun taksidini harcamak yerine sıradaki borca aktarmak gerekir." },
    { title: "Hesabın sınırı", text: "Banka günlük faiz, vergi, ücret, gecikme veya erken kapama bedeli uygulayabilir. Simülasyonu sözleşmenizdeki güncel kapama tutarıyla kontrol edin." },
  ] },
  { topic: "maas", slug: "maas-zammi-enflasyona-karsi-nasil-hesaplanir", eyebrow: "Alım gücü", title: "Maaş zammı enflasyona karşı nasıl hesaplanır?", description: "Nominal maaş artışı ile gerçek satın alma gücünü birbirinden ayırın.", readTime: "5 dk", toolHref: "/maas-alim-gucu-hesaplama", toolLabel: "Maaş alım gücünü hesapla", sections: [
    { title: "Zam oranı neden yetmez?", text: "Maaşın yüzde 40 artması alım gücünün de yüzde 40 arttığı anlamına gelmez. Aynı dönemde fiyatlar daha fazla yükseldiyse reel kayıp oluşur." },
    { title: "Koruma maaşı", text: "Eski maaşın seçilen dönemdeki enflasyon kadar artırılmış tutarıdır. Güncel maaşı bu eşikle karşılaştırmak zam yüzdesinden daha anlamlıdır." },
    { title: "Basit örnek", text: "20.000 TL maaştan sonra fiyat düzeyi yüzde 80 arttıysa koruma maaşı yaklaşık 36.000 TL olur. Güncel maaş 32.000 TL ise nominal artışa rağmen alım gücü gerilemiştir." },
    { title: "Kişisel enflasyon farkı", text: "Resmî sepet toplum ortalamasıdır. Kira, eğitim veya ulaşıma daha çok pay ayıran kişinin fiyat artışı farklı olabilir.", bullets: ["Aynı tarih aralığını kullanın", "Resmî TÜFE ile genel kıyas yapın", "Kendi harcama sepetinizi ayrıca ölçün"] },
  ] },
  { slug: "mevduat-getirisi-enflasyon-karsisinda-nasil-okunur", eyebrow: "Mevduat", title: "Mevduat getirisi enflasyon karşısında nasıl okunur?", description: "Brüt faiz, stopaj sonrası net kazanç ve reel getiri arasındaki farkı görün.", readTime: "5 dk", toolHref: "/mevduat-faiz-hesaplama", toolLabel: "Net mevduat getirisini hesapla", sections: [
    { title: "Üç ayrı sonuç", text: "İlan edilen oran brüt, kesinti sonrası kazanç net, fiyat artışları çıkarıldıktan sonraki alım gücü ise reel sonuçtur.", bullets: ["Brüt faiz: vergi öncesi", "Net faiz: kesinti sonrası", "Reel getiri: enflasyon sonrası"] },
    { title: "Vadeyi doğru eşleştirin", text: "Yıllık oran 32 günlük vadede doğrudan yıllık kazanç sağlamaz. Gün sayısı ve stopaj birlikte hesaba katılmalıdır." },
    { title: "Nominal kazanç yanılgısı", text: "Hesaptaki para artarken satın alma gücü azalabilir. Net vade getirisi aynı dönemin fiyat artışının altındaysa reel kayıp vardır." },
    { title: "Değişken varsayımlar", text: "Yenileme faizi, stopaj ve enflasyon zamanla değişebilir. Hesaplayıcı girilen varsayımları gösterir; gelecek getiriyi garanti etmez." },
  ] },
  { slug: "birikim-hedefi-nasil-planlanir", eyebrow: "Birikim", title: "Birikim hedefi nasıl planlanır?", description: "Hedef, süre, aylık katkı, getiri ve enflasyonu aynı plan içinde değerlendirin.", readTime: "6 dk", toolHref: "/birikim-hedefi-hesaplama", toolLabel: "Birikim hedefini planla", sections: [
    { title: "Hedefin gerçek değeri", text: "Beş yıl sonraki 1 milyon TL ile bugünkü 1 milyon TL aynı satın alma gücüne sahip değildir. Hedefi bugünün parasıyla mı geleceğin nominal tutarıyla mı kurduğunuzu belirleyin." },
    { title: "Beş temel girdi", text: "Başlangıç birikimi, aylık katkı, süre, getiri ve enflasyon birlikte hesaplanmalıdır.", bullets: ["Sürdürülebilir aylık katkı", "Temkinli getiri varsayımı", "Aynı dönem için enflasyon", "Katkının yıllık artışı"] },
    { title: "Katkıyı güncellemek", text: "Gelir ve fiyatlar artarken katkıyı sabit bırakmak tasarrufun gerçek değerini küçültür. Gelire uygun yıllık artış planı daha gerçekçi kılar." },
    { title: "Tek senaryoya güvenmeyin", text: "Düşük, orta ve yüksek getiri senaryolarını ayrı deneyin. Planı gelir veya hedef değiştiğinde, en geç altı ayda bir yeniden değerlendirin." },
  ] },
  ...decisionGuides,
];
export const findGuide = (slug: string) => guides.find((guide) => guide.slug === slug);
