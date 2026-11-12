"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { trackAnalyticsEvent } from "../analytics";

export default function CreatorValueCalculator() {
  const [contents, setContents] = useState(12);
  const [currentMinutes, setCurrentMinutes] = useState(45);
  const [studioMinutes, setStudioMinutes] = useState(12);
  const [hourValue, setHourValue] = useState(300);
  const result = useMemo(() => { const savedMinutes = Math.max(0, contents * (currentMinutes - studioMinutes)); return { hours: savedMinutes / 60, value: savedMinutes / 60 * hourValue }; }, [contents, currentMinutes, studioMinutes, hourValue]);
  const openStudio = () => trackAnalyticsEvent("pricing_cta_clicked", "value_calculator", "creator_pro");
  return <section className="creator-value"><div><span>Kendi rakamlarınla hesapla</span><h2>Creator Pro sana ne kadar zaman bırakabilir?</h2><p>Bu sonuç bir vaat değil; tamamen senin girdiğin mevcut çalışma süresi ve hedef süre üzerinden hesaplanır.</p><div className="creator-value-fields"><label>Aylık içerik sayısı<input min="1" max="200" onChange={(event) => setContents(Number(event.target.value))} type="number" value={contents} /></label><label>Şu an içerik başına dakika<input min="1" max="600" onChange={(event) => setCurrentMinutes(Number(event.target.value))} type="number" value={currentMinutes} /></label><label>Stüdyoyla hedeflediğin dakika<input min="1" max="600" onChange={(event) => setStudioMinutes(Number(event.target.value))} type="number" value={studioMinutes} /></label><label>Bir saatinin değeri (TL)<input min="0" max="100000" onChange={(event) => setHourValue(Number(event.target.value))} type="number" value={hourValue} /></label></div></div><aside><span>Aylık tahmini kazanım</span><strong>{result.hours.toLocaleString("tr-TR", { maximumFractionDigits: 1 })} saat</strong><b>{result.value.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} TL zaman değeri</b><small>Gerçek sonuç çalışma biçimine göre değişir.</small><Link href="/icerik-studyosu?utm_source=creator_pro&utm_campaign=value_calculator" onClick={openStudio}>Ücretsiz demoyu dene →</Link></aside></section>;
}
