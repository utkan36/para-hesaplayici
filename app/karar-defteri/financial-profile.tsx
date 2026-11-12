"use client";

import { useEffect, useState, type FormEvent } from "react";
import { trackFeatureUsage } from "../feature-usage";
import MonthlyPurchasingPower from "./monthly-purchasing-power";
import { getTodayIso } from "../../lib/dates";
import { financialProfileKey, latestProfile, profileFields, readProfiles, readReserveGoal, reserveGoalKey, reserveGoalProgress, summarizeProfile, type Profile } from "../../lib/financial-profile";

const money = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 2 });
const monthFormat = new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric", timeZone: "UTC" });
const formatMonth = (month: string) => monthFormat.format(new Date(`${month}-01T00:00:00Z`));
const decimal = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 1 });

export default function FinancialProfile() {
  const [currentMonth, setCurrentMonth] = useState("");
  const [month, setMonth] = useState("");
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [goal, setGoal] = useState<number | null>(null);
  const [goalInput, setGoalInput] = useState("");
  const [status, setStatus] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    const today = getTodayIso().slice(0, 7);
    setCurrentMonth(today);
    setMonth(today);
    try {
      setProfiles(readProfiles(localStorage.getItem(financialProfileKey)));
      const savedGoal = readReserveGoal(localStorage.getItem(reserveGoalKey));
      setGoal(savedGoal);
      setGoalInput(savedGoal === null ? "" : String(savedGoal));
    } catch {
      setStatus("Tarayıcı depolamasına erişilemedi.");
    }
  }, []);

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const values = Object.fromEntries(profileFields.map(([key]) => [key, Number(data.get(key))])) as Profile;
    const checked = readProfiles(JSON.stringify({ [month]: values }));
    if (profileFields.some(([key]) => !String(data.get(key) ?? "").trim()) || !checked[month]) {
      setStatus("Dört alana da geçerli bir tutar gir. Gerekirse 0 kullan.");
      return;
    }

    try {
      const current = readProfiles(localStorage.getItem(financialProfileKey));
      const next = { ...current, ...checked };
      localStorage.setItem(financialProfileKey, JSON.stringify(next));
      setProfiles(next);
      trackFeatureUsage("financial_profile");
      setStatus(`${formatMonth(month)} kaydı kaydedildi.`);
    } catch {
      setStatus("Kayıt yapılamadı. Tarayıcı depolamasını kontrol et.");
    }
  }

  function updateGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const target = readReserveGoal(goalInput);
    if (target === null) {
      setStatus("Fon hedefi için 1–60 arasında tam ay gir.");
      return;
    }
    try {
      localStorage.setItem(reserveGoalKey, String(target));
      setGoal(target);
      setStatus("Acil durum fonu hedefi kaydedildi.");
    } catch {
      setStatus("Fon hedefi kaydedilemedi.");
    }
  }

  function removeGoal() {
    try {
      localStorage.removeItem(reserveGoalKey);
      setGoal(null);
      setGoalInput("");
      setStatus("Acil durum fonu hedefi kaldırıldı.");
    } catch {
      setStatus("Fon hedefi kaldırılamadı.");
    }
  }

  function remove() {
    try {
      localStorage.removeItem(financialProfileKey);
      setProfiles({});
      setMonth(currentMonth);
      setConfirmDelete(false);
      setStatus("Finansal Fotoğraf kayıtları silindi.");
    } catch {
      setStatus("Kayıtlar silinemedi.");
    }
  }

  const current = profiles[month];
  const progress = current && goal !== null ? reserveGoalProgress(current, goal) : null;
  const summary = current ? summarizeProfile(current) : null;
  const history = Object.keys(profiles).sort().reverse();
  const previousMonth = history.find((key) => key < month);
  const previous = previousMonth ? summarizeProfile(profiles[previousMonth]) : null;
  const prefill = latestProfile(profiles, month);

  function selectMonth(selected: string) {
    setMonth(selected);
    if (profiles[selected]) trackFeatureUsage("financial_profile");
    setStatus("");
    setConfirmDelete(false);
  }

  return (
    <section className="financial-profile" aria-labelledby="financial-profile-title">
      <h2 id="financial-profile-title">Finansal Fotoğraf</h2>
      <p>Her ay değişen tutarları güncelle. Kayıtların bu tarayıcıda saklanır.</p>
      {history.length > 0 && <label className="financial-profile-month">
        Görüntülenen ay
        <select value={month} onChange={(event) => selectMonth(event.target.value)}>
          {[...new Set([currentMonth, ...history])].map((key) => <option key={key} value={key}>{formatMonth(key)}{key === currentMonth ? " · Bu ay" : ""}</option>)}
        </select>
      </label>}
      {month && <form className="seo-calculator" key={month + JSON.stringify(prefill ?? null)} onSubmit={save}>
        <div className="seo-field-grid">
          {profileFields.map(([key, label]) => (
            <label key={key}><span>{label} (TL)</span><input name={key} defaultValue={prefill?.[key]} type="number" inputMode="decimal" min="0" max="1000000000000" step="any" required /></label>
          ))}
        </div>
        <button type="submit">{formatMonth(month)} kaydını {current ? "güncelle" : "oluştur"}</button>
      </form>}
      {summary && <dl className="financial-profile-summary">
        <div><dt>Gider ve borç sonrası kalan</dt><dd>{money.format(summary.remaining)}</dd></div>
        <div><dt>Borç ödemesinin gelire oranı</dt><dd>{summary.debtRatio === null ? "—" : `%${decimal.format(summary.debtRatio)}`}</dd></div>
        <div><dt>Fonun karşıladığı gider ve borç</dt><dd>{summary.reserveMonths === null ? "—" : `${decimal.format(summary.reserveMonths)} ay`}</dd></div>
      </dl>}
      {summary && previous && <p>Son kayıtlı aya ({previousMonth && formatMonth(previousMonth)}) göre aylık kalan tutar farkı <strong>{money.format(summary.remaining - previous.remaining)}</strong>.</p>}
      {current && previousMonth && <MonthlyPurchasingPower
        key={`${previousMonth}:${profiles[previousMonth].income}:${month}:${current.income}`}
        from={previousMonth} to={month} oldIncome={profiles[previousMonth].income} income={current.income}
      />}
      <section className="financial-profile-goal" aria-labelledby="financial-profile-goal">
        <h3 id="financial-profile-goal">Acil durum fonu hedefi</h3>
        <form onSubmit={updateGoal}>
          <label>Hedeflenen süre (ay)<input type="number" min="1" max="60" step="1" required value={goalInput} onChange={(event) => setGoalInput(event.target.value)} /></label>
          <button type="submit">Hedefi kaydet</button>
          {goal !== null && <button type="button" onClick={removeGoal}>Hedefi kaldır</button>}
        </form>
        {goal !== null && <p>{goal} aylık zorunlu gider ve borç ödemesini karşılayacak fon.</p>}
        {progress && <div>
          <label>{formatMonth(month)} hedef ilerlemesi <progress value={progress.ratio} max={1}>{decimal.format(progress.ratio * 100)}%</progress></label>
          <p>Hedef tutar <strong>{money.format(progress.target)}</strong> · {progress.remaining === 0 ? <strong>Hedefe ulaşıldı</strong> : <>Kalan <strong>{money.format(progress.remaining)}</strong></>}</p>
        </div>}
        {goal !== null && !progress && <p>İlerlemeyi görmek için seçili aya gider veya borç ödemesi içeren bir kayıt ekle.</p>}
      </section>
      {history.length > 0 && <section aria-labelledby="financial-profile-history">
        <h3 id="financial-profile-history">Aylık geçmiş</h3>
        <div className="payoff-calendar-scroll" tabIndex={0} role="region" aria-label="Finansal Fotoğraf geçmişi">
          <table className="financial-profile-table">
            <thead><tr><th scope="col">Ay</th><th scope="col">Kalan bütçe</th><th scope="col">Borç / gelir</th><th scope="col">Fon süresi</th></tr></thead>
            <tbody>{history.map((key) => {
              const row = summarizeProfile(profiles[key]);
              return <tr key={key}>
                <th scope="row"><button type="button" onClick={() => selectMonth(key)} aria-pressed={key === month}>{formatMonth(key)}</button></th>
                <td>{money.format(row.remaining)}</td>
                <td>{row.debtRatio === null ? "—" : `%${decimal.format(row.debtRatio)}`}</td>
                <td>{row.reserveMonths === null ? "—" : `${decimal.format(row.reserveMonths)} ay`}</td>
              </tr>;
            })}</tbody>
          </table>
        </div>
      </section>}
      {history.length > 0 && (
        <div className="financial-profile-delete">
          {confirmDelete ? <>
            <button type="button" onClick={remove}>Tüm ayları sil</button>
            <button type="button" onClick={() => setConfirmDelete(false)}>Vazgeç</button>
          </> : <button type="button" onClick={() => setConfirmDelete(true)}>Finansal Fotoğraf kayıtlarını sil</button>}
        </div>
      )}
      <p role="status">{status}</p>
    </section>
  );
}
