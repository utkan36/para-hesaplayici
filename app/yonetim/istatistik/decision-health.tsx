"use client";

import { useState } from "react";
import type { DataHealthRow } from "../../../lib/data-health";

type Counts = Record<string, number>;
const statusLabels = { current: "Güncel", stale: "Gecikmiş veri", unavailable: "Veri alınamadı" };
const format = new Intl.NumberFormat("tr-TR");
const steps = [
  ["calculation_started", "Başlatılan hesap"],
  ["calculation_completed", "Alınan sonuç"],
  ["calculation_failed", "Hesaplama hatası"],
  ["scenario_saved", "Senaryo kaydı"],
  ["decision_completed", "Tamamlanmış kararlar"],
  ["decision_result_ready", "Raporlanabilir karar sonuçları"],
  ["decision_result_reported", "Raporu açılan karar sonuçları"],
  ["decision_report_opened", "Rapor açma tıklamaları"],
  ["decision_report_copied", "Rapor bağlantısı kopyalama"],
  ["scenario_report_printed", "Yazdırma isteği"],
] as const;

export default function DecisionHealth({ counts }: { counts: Counts }) {
  const [health, setHealth] = useState<{ checkedAt: string; rows: DataHealthRow[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  async function refresh() {
    setLoading(true);
    setError(false);
    try {
      const response = await fetch("/api/admin/data-health", { cache: "no-store" });
      if (!response.ok) throw new Error();
      setHealth(await response.json());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <section className="stats-panel">
        <div><span>Son 30 gün</span><h2>Hesaplama ve karar adımları</h2></div>
        <p>Raporlanabilir sonuçlar borç yapılandırma, maaş alım gücü ve büyük harcama hesaplarını kapsar. Aynı sonuç için ilk rapor açma tıklaması dönüşüm sayılır. Diğer tıklamalar toplam rapor açma sayısına eklenir.</p>
        <p>Tamamlanmış karar, yeni bir sonuçtan rapor açıldığında, sonuç kaydedildiğinde veya ilgili hesaplayıcıya geçildiğinde ilk işlem üzerinden sayılır. Bu ölçüm yeni sürümle başlar.</p>
        <div className="stats-event-list">
          {steps.map(([key, label]) => (
            <div key={key}><span>{label}</span><strong>{format.format(counts[key] ?? 0)}</strong></div>
          ))}
        </div>
      </section>
      <section className="stats-panel">
        <div className="stats-panel-heading">
          <div><span>Kaynak denetimi</span><h2>Veri sağlığı</h2></div>
          <button type="button" className="stats-export-button" disabled={loading} onClick={() => void refresh()}>{loading ? "Kontrol ediliyor…" : "Kaynakları kontrol et"}</button>
        </div>
        {error && <p role="alert">Yeni kontrol tamamlanamadı. Tekrar deneyebilirsin.</p>}
        {health ? (
          <>
            <p>Son kontrol {new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Istanbul" }).format(new Date(health.checkedAt))}</p>
            <div className="stats-table"><table>
              <thead><tr><th>Gösterge</th><th>Durum</th><th>Son veri</th><th>Kaynak</th></tr></thead>
              <tbody>{health.rows.map((row) => <tr key={row.id}><td>{row.name}</td><td>{statusLabels[row.status]}</td><td>{row.period ?? "—"}</td><td>{row.source ?? "—"}</td></tr>)}</tbody>
            </table></div>
          </>
        ) : <p>Kontrol, hesaplayıcıların kullandığı veri uç noktalarından örnek veri alır.</p>}
      </section>
    </>
  );
}
