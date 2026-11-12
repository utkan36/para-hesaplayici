import Link from "next/link";
import type { ReactNode } from "react";
import { topics } from "./decision-guides";
import { guides } from "./guide-catalog";
import SeoTracker from "./seo-tracker";

const tools = [
  ["Geçmiş para değeri", "/gecmis-para-degeri"],
  ["Harcamanın fırsat maliyeti", "/harcamanin-firsat-maliyeti"],
  ["Sigara maliyeti", "/sigara-maliyeti-hesaplama"],
  ["Borç hesaplama", "/borc-hesaplama"],
  ["Borç/gelir oranı", "/borc-gelir-orani-hesaplama"],
  ["Maaş alım gücü", "/maas-alim-gucu-hesaplama"],
  ["Birikim hedefi", "/birikim-hedefi-hesaplama"],
  ["Mevduat faizi", "/mevduat-faiz-hesaplama"],
  ["Kişisel enflasyon", "/kisisel-enflasyon-hesaplama"],
] as const;

export default function SeoShell({ eyebrow, title, description, page, example, children, faq }: {
  eyebrow: string; title: string; description: string; children: ReactNode;
  page?: string; example?: { title: string; description: string };
  faq: { question: string; answer: string }[];
}) {
  const inferred = title.includes("Sigara")
    ? { page: "sigara", title: "2021'den beri ayda 2.000 TL sigara harcaması", description: "Aylık harcamalar fiyat artışıyla toplanır ve aynı katkı planı farklı tarihsel yatırım araçlarıyla karşılaştırılır." }
    : title.includes("Borç")
      ? { page: "borc", title: "100.000 TL borç, aylık %3,5 faiz ve 12 ay vade", description: "Sabit oran ve eşit taksit varsayımında aylık ödeme, toplam ödeme ve faiz yükü ayrı gösterilir." }
      : title.includes("harcama")
        ? { page: "firsat_maliyeti", title: "2021'de 15.000 TL'lik telefon yerine altın alınsaydı?", description: "Aynı tutarın farklı yatırım araçlarındaki tarihsel karşılığı kıyaslanır; harcamanın kişisel faydası puanlanmaz." }
        : { page: "gecmis_para", title: "2020'deki 25.000 TL gram altında olsaydı?", description: "Başlangıçta alınabilecek gram altın miktarı bugünkü tarihsel fiyatla yeniden değerlenir." };
  const canonicalTools: Record<string, string> = { borc_yapilandirma: "/borc-yapilandirma-hesaplama", maas: "/maas-alim-gucu-hesaplama", kisisel_enflasyon: "/kisisel-enflasyon-hesaplama", firsat_maliyeti: "/harcamanin-firsat-maliyeti", borc: "/borc-hesaplama", erken_kapama: "/kredi-erken-kapama-hesaplama", gecmis_para: "/gecmis-para-degeri" };
  const activePage = page ?? inferred.page;
  const topic = topics.find((item) => item.tools.some((href) => href === canonicalTools[activePage]));
  const activeExample = example ?? { title: inferred.title, description: inferred.description };
  const schema = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((item) => ({ "@type": "Question", name: item.question, acceptedAnswer: { "@type": "Answer", text: item.answer } })) };
  return <main className="seo-shell">
    <SeoTracker page={activePage} />
    <header className="seo-header"><Link className="brand" href="/"><span className="brand-mark">₺</span><span><strong>Para Hesaplayıcı</strong><small>Paranın zaman makinesi</small></span></Link><Link className="seo-home-link" href="/">Tüm araçlar →</Link></header>
    <nav className="breadcrumbs" aria-label="Sayfa yolu"><Link href="/">Ana sayfa</Link><span>›</span><span>{title}</span></nav>
    <section className="seo-hero"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></section>
    {children}
    <aside className="seo-example"><span>Örnek hesap</span><h2>{activeExample.title}</h2><p>{activeExample.description}</p></aside>
    <section className="seo-copy" aria-labelledby="faq-title"><div><span>Nasıl çalışır?</span><h2 id="faq-title">Sık sorulan sorular</h2></div><div className="seo-faq">{faq.map((item) => <article key={item.question}><h3>{item.question}</h3><p>{item.answer}</p></article>)}</div></section>
    {topic && <nav className="seo-tools" aria-label="İlgili rehberler"><strong>{topic.title} rehberleri</strong><div>{guides.filter((guide) => guide.topic === topic.id).map((guide) => <Link href={`/finans-rehberi/${guide.slug}`} key={guide.slug}>{guide.title}<span>→</span></Link>)}</div></nav>}
    <nav className="seo-tools" aria-label="Diğer hesaplama araçları"><strong>Diğer ücretsiz araçlar</strong><div>{tools.map(([label, href]) => <Link href={href} key={href}>{label}<span>→</span></Link>)}</div></nav>
    <footer className="seo-footer">Hesaplamalar bilgilendirme amaçlıdır; yatırım, kredi veya finansal danışmanlık değildir. <Link href="/finans-rehberi">Finans rehberini oku →</Link></footer>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
  </main>;
}
