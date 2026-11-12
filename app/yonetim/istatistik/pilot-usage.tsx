"use client";

import { useState, type FormEvent } from "react";

type Report = {
  license: string;
  usage: Array<{ month: string; opens: number }>;
  month: string;
  opens: number;
  settings: { brand: string; origin: string; expiresAt: string; monthlyQuota: number; tool: string } | null;
  active: boolean;
  remaining: number | null;
};

const numbers = new Intl.NumberFormat("tr-TR");
const tools: Record<string, string> = { refinance: "Borç yapılandırma", salary: "Maaş alım gücü", deposit: "Mevduat getirisi" };

export default function PilotUsage() {
  const [id, setId] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  async function load(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setReport(null);
    setLoading(true);
    setStatus("");
    try {
      const query = new URLSearchParams({ license: id.trim() });
      const response = await fetch(`/api/admin/widget-pilot-usage?${query}`, { cache: "no-store" });
      if (!response.ok) throw new Error();
      setReport(await response.json() as Report);
    } catch {
      setStatus("Pilot raporu alınamadı.");
    } finally {
      setLoading(false);
    }
  }

  async function copyReport() {
    if (!report) return;
    const history = report.usage.map((row) => `${row.month} · ${numbers.format(row.opens)} açılış`);
    if (!report.usage.some((row) => row.month === report.month)) history.unshift(`${report.month} · 0 açılış`);
    const lines = [
      `Para Hesaplayıcı · Widget kullanım raporu`,
      report.settings?.brand ?? report.license,
      ...history,
      ...(report.remaining === null ? [] : [`Bu ay kalan açılış kotası: ${numbers.format(report.remaining)}`]),
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setStatus("Kullanım özeti kopyalandı.");
    } catch {
      setStatus("Kullanım özeti panoya kopyalanamadı.");
    }
  }

  return (
    <section className="stats-panel">
      <div><span>Kurumsal widget</span><h2>Pilot kullanım raporu</h2></div>
      <form className="campaign-builder" onSubmit={load}>
        <label>Lisans kimliği<input required pattern="[a-z0-9][a-z0-9\\-]{2,63}" value={id} onChange={(event) => setId(event.target.value)} /></label>
        <button className="stats-export-button" type="submit" disabled={loading}>{loading ? "Getiriliyor…" : "Raporu getir"}</button>
      </form>
      {report && <>
        <h3>{report.settings?.brand ?? report.license}</h3>
        {report.settings ? (
          <p>{report.settings.origin} · {tools[report.settings.tool]} · {report.active ? "Etkin" : "Süresi dolmuş"} · Bitiş {new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeZone: "Europe/Istanbul" }).format(new Date(report.settings.expiresAt))}</p>
        ) : <p>Bu kimlik için lisans ayarı bulunamadı. Varsa önceki kullanım kayıtları aşağıda görünür.</p>}
        <div className="stats-feedback">
          <article><span>{report.month} açılışları</span><strong>{numbers.format(report.opens)}</strong></article>
          <article><span>Aylık kota</span><strong>{report.settings ? numbers.format(report.settings.monthlyQuota) : "—"}</strong></article>
          <article><span>Kalan kota</span><strong>{report.remaining === null ? "—" : numbers.format(report.remaining)}</strong></article>
        </div>
        {report.usage.length > 0 && <div className="stats-table"><table>
          <thead><tr><th scope="col">Ay (UTC)</th><th scope="col">Açılış</th></tr></thead>
          <tbody>{report.usage.map((row) => <tr key={row.month}><td>{row.month}</td><td>{numbers.format(row.opens)}</td></tr>)}</tbody>
        </table></div>}
        <button className="stats-export-button" type="button" onClick={() => void copyReport()}>Kullanım özetini kopyala</button>
      </>}
      <p role="status">{status}</p>
    </section>
  );
}
