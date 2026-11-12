"use client";

import { useEffect, useRef, useState } from "react";

import Link from "next/link";
import { trackAnalyticsEvent } from "./analytics";
import { decisionReportPath, type DecisionReport, type ReportScenario } from "../lib/decision-report";

import { getTodayIso } from "../lib/dates";
import { financialProfileKey, latestProfile, readProfiles } from "../lib/financial-profile";

const money = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 });
const relatedTools = {
  refinance: { href: "/kredi-erken-kapama-hesaplama", label: "Erken kapama seçeneğini hesapla" },
  salary: { href: "/kisisel-enflasyon-hesaplama", label: "Kişisel enflasyonunu hesapla" },
  purchase: { href: "/birikim-hedefi-hesaplama", label: "Birikim hedefini planla" },
};
const months = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 1 });

export default function DecisionComparison({ current, alternative, basis, difference, report, useProfile = true, measureConversion = true, onComplete }: {
  current: ReportScenario;
  useProfile?: boolean;
  measureConversion?: boolean;
  onComplete?: (action: "report" | "related_tool") => void;
  alternative: ReportScenario;
  basis: string;
  difference: number;
  report: Omit<DecisionReport, "basis" | "scenarios" | "difference" | "expenseMonths">;
}) {
  const reportOpened = useRef(false);
  const [expenses, setExpenses] = useState("");
  const [savedExpense, setSavedExpense] = useState(0);
  useEffect(() => {
    if (!useProfile) return;
    try {
      const profiles = readProfiles(localStorage.getItem(financialProfileKey));
      setSavedExpense(latestProfile(profiles, getTodayIso().slice(0, 7))?.expenses ?? 0);
    } catch {
      setSavedExpense(0);
    }
  }, [useProfile]);

  const monthlyExpenses = Number(expenses);
  const coverage = Math.abs(difference) / monthlyExpenses;

  const expenseMonths = monthlyExpenses >= 1 && Number.isFinite(coverage) ? coverage : undefined;
  const reportHref = decisionReportPath({ ...report, basis, scenarios: [current, alternative], difference: Math.abs(difference), expenseMonths });

  function openReport() {
    onComplete?.("report");
    trackAnalyticsEvent("decision_report_opened", report.tool, "calculator_result");
    if (measureConversion && !reportOpened.current) {
      reportOpened.current = true;
      trackAnalyticsEvent("decision_result_reported", report.tool, "calculator_result");
    }
  }

  return (
    <section className="decision-comparison">
      <h3>Karar İkizi</h3>
      <p>{basis}</p>
      <div className="salary-result-grid">
        {[current, alternative].map((scenario) => (
          <article key={scenario.title}>
            <span>{scenario.title}</span>
            <strong>{money.format(scenario.amount)}</strong>
            <small>{scenario.detail}</small>
          </article>
        ))}
      </div>
      <p>İki seçenek arasındaki fark <strong>{money.format(Math.abs(difference))}</strong>.</p>
      <label>
        <span>Aylık temel giderin (isteğe bağlı, TL)</span>
        <input type="number" inputMode="decimal" min="1" step="any" value={expenses} onChange={(event) => setExpenses(event.target.value)} />
      </label>
      {useProfile && savedExpense >= 1 && <button className="financial-profile-use" type="button" onClick={() => setExpenses(String(savedExpense))}>Kayıtlı zorunlu gideri kullan</button>}
      {expenseMonths !== undefined && (
        <p aria-live="polite">Bu fark yaklaşık <strong>{months.format(coverage)} aylık</strong> temel giderine denk geliyor.</p>
      )}
      <Link href={reportHref} onClick={openReport} target="_blank" rel="noopener noreferrer">Karar raporunu aç ↗</Link>
      {useProfile && <Link href={relatedTools[report.tool].href} onClick={() => onComplete?.("related_tool")}>{relatedTools[report.tool].label} →</Link>}
    </section>
  );
}
