"use client";

import { useState } from "react";
import type { PayoffResult } from "../lib/debt-payoff";

const labels = { avalanche: "Faiz çığı", snowball: "Borç kartopu", baseline: "Ek ödemesiz plan" };
const amount = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });
const period = new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric" });

export default function DebtPaymentCalendar({ results, preferred }: {
  results: Record<"avalanche" | "snowball", PayoffResult> & { baseline: PayoffResult | null };
  preferred: "avalanche" | "snowball";
}) {
  const [selected, setSelected] = useState<keyof typeof labels>(preferred);
  const [expanded, setExpanded] = useState(false);
  const active = results[selected] ? selected : preferred;
  const plan = results[active] ?? results[preferred];
  const visible = expanded ? plan.schedule : plan.schedule.slice(0, 12);

  return (
    <section className="payoff-calendar" aria-labelledby="payoff-calendar-title">
      <h3 id="payoff-calendar-title">Aylık borç ödeme takvimi</h3>
      <label>Ödeme planı <select value={active} onChange={(event) => { setSelected(event.target.value as keyof typeof labels); setExpanded(false); }}>
        {(Object.keys(labels) as Array<keyof typeof labels>).filter((key) => results[key]).map((key) => <option key={key} value={key}>{labels[key]}</option>)}
      </select></label>
      <div className="payoff-calendar-scroll" tabIndex={0} role="region" aria-label="Aylık ödemeler tablosu">
        <table>
          <thead><tr><th scope="col">Ay</th><th scope="col">Ödeme</th><th scope="col">İşleyen faiz</th><th scope="col">Kalan borç</th></tr></thead>
          <tbody>{visible.map((row) => {
            const date = new Date(plan.debtFreeDate);
            date.setMonth(date.getMonth() + row.month - plan.months, 1);
            return <tr key={row.month}><th scope="row">{period.format(date)}</th><td>{amount.format(row.payment)}</td><td>{amount.format(row.interestPaid)}</td><td>{amount.format(row.remainingBalance)}</td></tr>;
          })}</tbody>
        </table>
      </div>
      {plan.schedule.length > 12 && <button type="button" onClick={() => setExpanded(!expanded)}>{expanded ? "İlk 12 ayı göster" : `Tüm ${plan.months} ayı göster`}</button>}
    </section>
  );
}
