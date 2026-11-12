"use client";

import { useEffect, useState } from "react";

type TrustView = "method" | "sources" | "privacy" | "terms";

const views: Record<TrustView, { title: string; eyebrow: string }> = {
  method: { title: "Nasıl hesaplıyoruz?", eyebrow: "Metodoloji" },
  sources: { title: "Verinin nereden geliyor?", eyebrow: "Veri kaynakları" },
  privacy: { title: "Veriniz üzerinde kontrol sizde", eyebrow: "Gizlilik" },
  terms: { title: "Bilgilendirme aracının sınırları", eyebrow: "Kullanım koşulları" },
};

export default function TrustCenter() {
  const [activeView, setActiveView] = useState<TrustView | null>(null);

  useEffect(() => {
    if (!activeView) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveView(null);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [activeView]);

  return (
    <>
      <div className="trust-links" aria-label="Güven ve bilgilendirme bağlantıları">
        <button onClick={() => setActiveView("method")} type="button">Metodoloji</button>
        <button onClick={() => setActiveView("sources")} type="button">Veri kaynakları</button>
        <button onClick={() => setActiveView("privacy")} type="button">Gizlilik</button>
        <button onClick={() => setActiveView("terms")} type="button">Kullanım koşulları</button>
      </div>

      {activeView && (
        <div className="trust-backdrop" onMouseDown={(event) => {
          if (event.currentTarget === event.target) setActiveView(null);
        }}>
          <section aria-labelledby="trust-title" aria-modal="true" className="trust-dialog" role="dialog">
            <button aria-label="Güven merkezini kapat" className="trust-close" onClick={() => setActiveView(null)} type="button">×</button>
            <span className="trust-eyebrow">{views[activeView].eyebrow}</span>
            <h2 id="trust-title">{views[activeView].title}</h2>

            {activeView === "method" && <div className="trust-content">
              <p>Para Hesaplayıcı, seçilen başlangıç ve hedef tarihlerine en yakın yayımlanmış tarihsel verileri bulur; başlangıç tutarını aynı orandaki değişimle ileri veya geri taşır.</p>
              <ul>
                <li><strong>Tarih farkı:</strong> Tatil, hafta sonu ve yayın sıklığı nedeniyle kullanılan gerçek veri tarihi seçtiğiniz günden farklı olabilir. Sonuç ekranında bu tarih ayrıca gösterilir.</li>
                <li><strong>Masraflar:</strong> Masraf alanları açılmadıkça vergi, makas, komisyon ve saklama gideri uygulanmaz.</li>
                <li><strong>Reel değer:</strong> Enflasyon etkisi TÜFE endeksindeki dönemsel oranla çıkarılır; bu değer kişisel harcama sepetinizi temsil etmez.</li>
                <li><strong>Risk:</strong> En büyük düşüş, mevcut tarih aralığındaki gözlemlerden hesaplanır. Daha seyrek veri daha kısa hareketleri göstermeyebilir.</li>
              </ul>
              <p className="trust-callout">Her sonuç geçmişte gerçekleşmiş bir karşılaştırmadır; gelecek getiri tahmini değildir.</p>
            </div>}

            {activeView === "sources" && <div className="trust-content">
              <p>Hesaplamalar tek bir veri sağlayıcısına bağlı değildir. Her ölçüt için uygun resmî veya yaygın piyasa kaynağı kullanılır.</p>
              <dl className="trust-source-list">
                <div><dt>TÜFE</dt><dd>TÜİK tarafından yayımlanan tüketici fiyat endeksi</dd></div>
                <div><dt>Döviz</dt><dd>TCMB EVDS ve güncel kur tamamlamasında Frankfurter</dd></div>
                <div><dt>Altın</dt><dd>Tarihsel ons fiyatı ve aynı tarihteki döviz karşılığı</dd></div>
                <div><dt>BIST ve Bitcoin</dt><dd>Yahoo Finance tarihsel piyasa kapanışları</dd></div>
                <div><dt>Mevduat</dt><dd>TCMB gösterge niteliğindeki faiz serileri</dd></div>
                <div><dt>Akaryakıt ve ücret</dt><dd>EPDK ve Çalışma ve Sosyal Güvenlik Bakanlığı</dd></div>
              </dl>
              <p className="trust-callout">Kaynakların yayın takvimi farklıdır. Uygulama, hedef güne en yakın doğrulanabilir veriyi ve varsa eksik ölçütü sonuçta açıklar.</p>
            </div>}

            {activeView === "privacy" && <div className="trust-content">
              <p>Şu an üyelik sistemi, reklam profili veya pazarlama çerezi kullanılmıyor. Formlara girdiğiniz hesaplama değerleri hesap üretmek amacıyla işlenir.</p>
              <ul>
                <li>Kaydettiğiniz senaryolar ve tercihler, aksi belirtilmedikçe kullandığınız cihazın tarayıcı hafızasında tutulur.</li>
                <li>Canlı sonuç bağlantısı oluşturursanız tutar, tarih ve senaryo adı bağlantının içinde yer alır. Bağlantıyı gönderdiğiniz kişiler bu bilgileri görebilir.</li>
                <li>Hizmetin güvenliği ve çalışması için sunucu altyapısı IP adresi, istek zamanı ve teknik hata bilgileri gibi zorunlu kayıtları sınırlı süreyle işleyebilir.</li>
                <li>Hesaplama alanlarına ad, telefon, hesap numarası veya başka kişisel bilgiler yazmamanızı öneririz.</li>
              </ul>
              <p className="trust-callout">Analitik, üyelik veya ticari ileti özelliği eklenirse bu metin ve gerekli tercih ekranları yayından önce güncellenecektir.</p>
            </div>}

            {activeView === "terms" && <div className="trust-content">
              <p>Uygulamayı kullanarak sonuçların eğitim ve genel bilgilendirme amacı taşıdığını; kişisel yatırım danışmanlığı, alım-satım önerisi veya kazanç garantisi olmadığını kabul edersiniz.</p>
              <ul>
                <li>Veri sağlayıcıların düzeltmeleri, gecikmeleri veya kesintileri sonuçları etkileyebilir.</li>
                <li>Vergi, komisyon, likidite, kur makası ve kişisel koşullar açıkça eklenmedikçe sonuçlara dahil değildir.</li>
                <li>Bir finansal karar vermeden önce güncel veriyi doğrulamak ve gerektiğinde yetkili bir uzmana danışmak kullanıcının sorumluluğundadır.</li>
                <li>Oluşturulan görseller kaynak ve uyarı metni korunarak paylaşılabilir; yanıltıcı vaat veya garanti amacıyla kullanılamaz.</li>
              </ul>
              <p className="trust-callout">Ücretli ürün, üyelik veya kurumsal hizmet başlamadan önce koşullar işletme bilgileri ve ticari hükümlerle ayrıca tamamlanmalıdır.</p>
            </div>}
          </section>
        </div>
      )}
    </>
  );
}
