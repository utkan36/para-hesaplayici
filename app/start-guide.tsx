"use client";

import { useEffect, useState } from "react";
import { getAnalyticsSource, trackAnalyticsEvent } from "./analytics";

const GUIDE_KEY = "para-hesaplayici-start-guide-v1";

export default function StartGuide() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(window.localStorage.getItem(GUIDE_KEY) !== "dismissed"), 0);
    return () => window.clearTimeout(timer);
  }, []);
  if (!visible) return null;

  function choose(target: string) {
    const category = target.includes("borc") ? "debt" : target.includes("recurring") ? "recurring" : target.includes("opportunity") ? "opportunity" : "main";
    trackAnalyticsEvent("guide_choice", category, getAnalyticsSource());
    window.localStorage.setItem(GUIDE_KEY, "dismissed");
    setVisible(false);
    window.requestAnimationFrame(() => document.querySelector<HTMLElement>(target)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  return <section className="start-guide" aria-labelledby="start-guide-title">
    <div className="start-guide-heading"><div><span>İlk adım</span><h2 id="start-guide-title">Bugün neyi merak ediyorsun?</h2><p>Bir yol seç; seni doğrudan doğru araca götürelim.</p></div><button aria-label="Başlangıç rehberini kapat" onClick={() => { window.localStorage.setItem(GUIDE_KEY, "dismissed"); setVisible(false); }} type="button">×</button></div>
    <div className="start-guide-options">
      <button onClick={() => choose(".calculator-card")} type="button"><span aria-hidden="true">↗</span><strong>Geçmişteki param</strong><small>Bir tutarın bugün ne olacağını hesapla.</small><b>Para zaman makinesi</b></button>
      <button onClick={() => choose("#opportunity-title")} type="button"><span aria-hidden="true">◫</span><strong>Tek bir harcamam</strong><small>Telefon, araba veya düğün yerine ne olabilirdi?</small><b>Keşke Hesabı</b></button>
      <button onClick={() => choose("#recurring-opportunity-title")} type="button"><span aria-hidden="true">↻</span><strong>Aylık alışkanlığım</strong><small>Her ay tekrarlanan harcamanın gerçek maliyetini gör.</small><b>Alışkanlık maliyeti</b></button>
      <button onClick={() => { trackAnalyticsEvent("guide_choice", "debt", getAnalyticsSource()); window.location.href = "/borc-hesaplama"; }} type="button"><span aria-hidden="true">%</span><strong>Borcum</strong><small>Taksiti veya bütün borçlarının kapanış planını hesapla.</small><b>Borçsuzluk planı</b></button>
    </div>
  </section>;
}
