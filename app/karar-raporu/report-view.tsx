"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SaveScenarioButton from "../save-scenario-button";
import { decisionReportPath, readDecisionReport, type DecisionReport } from "../../lib/decision-report";
import { trackAnalyticsEvent } from "../analytics";

const money = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 });
const months = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 1 });

export default function DecisionReportView() {
  const [report, setReport] = useState<DecisionReport | null | undefined>();
  const [status, setStatus] = useState("");

  useEffect(() => {
    const read = () => {
      setReport(readDecisionReport(window.location.hash));
      setStatus("");
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      if (report) trackAnalyticsEvent("decision_report_copied", report.tool, "decision_report");
      setStatus("Bağlantı kopyalandı.");
    } catch {
      setStatus("Bağlantıyı adres çubuğundan kopyalayabilirsin.");
    }
  }

  if (!report) {
    return <main className="decision-report"><h1>Karar Raporu</h1><p>{report === undefined ? "Rapor açılıyor…" : "Bu rapor bağlantısı eksik veya geçersiz."}</p><Link href="/">Hesaplayıcıya dön</Link></main>;
  }

  return (
    <main className="decision-report">
      <header><p>Para Hesaplayıcı · Karar Raporu</p><h1>{report.title}</h1><p>{report.summary}</p></header>
      <section>
        <h2>Karşılaştırma</h2>
        <p>{report.basis}</p>
        <div className="decision-report-scenarios">
          {report.scenarios.map((scenario, index) => (
            <article key={index}><h3>{scenario.title}</h3><strong>{money.format(scenario.amount)}</strong><p>{scenario.detail}</p></article>
          ))}
        </div>
        <p>Fark <strong>{money.format(report.difference)}</strong>{report.expenseMonths !== undefined && <> · Yaklaşık <strong>{months.format(report.expenseMonths)} aylık</strong> temel gider</>}</p>
      </section>
      <section><h2>Kaynak ve varsayımlar</h2><p>{report.source}</p><p>{report.assumptions}</p></section>
      <section><h2>Sonraki adım</h2><p>{report.nextStep}</p></section>
      <p>Bağlantıdaki rapor, oluşturulduğu andaki hesaplama özetidir.</p>
      <div className="decision-report-actions">
        <button type="button" onClick={() => { trackAnalyticsEvent("scenario_report_printed", report.tool, "decision_report"); window.print(); }}>Yazdır veya PDF kaydet</button>
        <button type="button" onClick={() => void copy()}>Rapor bağlantısını kopyala</button>
        <SaveScenarioButton key={decisionReportPath(report)} scenario={{
          tool: report.tool,
          title: report.title,
          summary: report.summary,
          metrics: [
            ...report.scenarios.map((scenario) => ({ label: scenario.title, value: money.format(scenario.amount) })),
            { label: "Fark", value: money.format(report.difference) },
          ],
          href: decisionReportPath(report),
        }} />
        <Link href="/karar-defteri">Karar Defteri’ni aç</Link>
        <p>Bağlantıyı alan herkes rapordaki finansal tutarları görebilir.</p>
        <p role="status">{status}</p>
      </div>
    </main>
  );
}
