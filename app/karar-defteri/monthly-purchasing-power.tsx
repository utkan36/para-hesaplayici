"use client";

import { useEffect, useRef, useState } from "react";

const percent = new Intl.NumberFormat("tr-TR", { style: "percent", maximumFractionDigits: 1, signDisplay: "exceptZero" });

export default function MonthlyPurchasingPower({ from, to, oldIncome, income }: {
  from: string;
  to: string;
  oldIncome: number;
  income: number;
}) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  async function compare() {
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setMessage("");
    try {
      const query = new URLSearchParams({ startDate: `${from}-01`, targetDate: `${to}-01` });
      const response = await fetch(`/api/cpi?${query}`, { signal: controller.signal });
      if (!response.ok) throw new Error("TÜFE verisi şu anda alınamadı.");
      const data = await response.json() as { start?: { actualPeriod: string; indexValue: number }; target?: { actualPeriod: string; indexValue: number } };
      if (data.start?.actualPeriod !== from || data.target?.actualPeriod !== to) {
        throw new Error("Seçilen ayların ikisi için de TÜFE yayımlandığında bu karşılaştırma yapılabilir.");
      }
      const change = (income / oldIncome) * (data.start.indexValue / data.target.indexValue) - 1;
      if (!Number.isFinite(change) || data.start.indexValue <= 0 || data.target.indexValue <= 0) throw new Error("TÜFE endeksleri karşılaştırılamadı.");
      setMessage(`${from} ile ${to} arasında net gelirin TÜFE’ye göre reel değişimi ${percent.format(change)}.`);
    } catch (error) {
      if (!controller.signal.aborted) setMessage(error instanceof Error ? error.message : "Karşılaştırma yapılamadı.");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  return (
    <section className="financial-profile-goal">
      <h3>Net gelirin alım gücü</h3>
      <p>{from} ve {to} kayıtlarını TÜFE’ye göre karşılaştır. Yalnızca ay bilgileri veri isteğinde kullanılır.</p>
      {oldIncome > 0
        ? <button type="button" disabled={loading} onClick={() => void compare()}>{loading ? "TÜFE verisi alınıyor…" : "Reel gelir değişimini hesapla"}</button>
        : <p>Yüzde değişimi hesaplamak için önceki ayın net geliri sıfırdan büyük olmalı.</p>}
      <p role="status">{message}</p>
    </section>
  );
}
