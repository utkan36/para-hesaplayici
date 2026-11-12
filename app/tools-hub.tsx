"use client";

import Link from "next/link";
import { trackAnalyticsEvent } from "./analytics";

const decisions = [
  { href: "/borc-karar-merkezi", tag: "borc", icon: "⇄", title: "Borç kararı", question: "Borcumu nasıl ödemeliyim?", copy: "Yapılandırma, erken kapama ve ödeme planı seçeneklerini incele." },
  { href: "/maas-alim-gucu-hesaplama", tag: "maas", icon: "₺", title: "Maaş ve enflasyon", question: "Maaşım alım gücünü korudu mu?", copy: "Net maaşını TÜFE’ye göre alım gücünü koruyan tutarla karşılaştır." },
  { href: "/harcamanin-firsat-maliyeti", tag: "firsat_maliyeti", icon: "◫", title: "Büyük harcama", question: "Şimdi alsam ne değişir?", copy: "Satın alma ve parayı ayırma seçeneklerini karşılaştır." },
];

export default function ToolsHub() {
  return (
    <section className="tools-hub decision-hub" aria-label="Finansal karar araçları">
      <div className="tools-hub-grid">
        {decisions.map((decision) => (
          <Link href={decision.href} key={decision.href} onClick={() => trackAnalyticsEvent("seo_tool_opened", decision.tag, "homepage")}>
            <i aria-hidden="true">{decision.icon}</i>
            <span className="decision-hub-label">{decision.title}</span>
            <strong>{decision.question}</strong>
            <p>{decision.copy}</p>
            <b>Kararı incele <span aria-hidden="true">→</span></b>
          </Link>
        ))}
      </div>
      <nav className="tools-hub-secondary" aria-label="Diğer araçlar">
        <Link className="tools-hub-all" href="/hesaplama-araclari">Tüm araçlar</Link>
        <Link className="tools-hub-all" href="/finans-rehberi">Finans rehberi</Link>
        <Link className="tools-hub-all" href="/karar-defteri">Karar Defterim</Link>
        <Link className="tools-hub-all" href="/kurumsal-widget">Kurumsal çözümler</Link>
      </nav>
    </section>
  );
}
