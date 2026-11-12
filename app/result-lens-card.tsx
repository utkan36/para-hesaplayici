"use client";

import { RESULT_LENS_OPTIONS, type ResultLens, type ResultLenses } from "../lib/result-lens";

const money = (value: number) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 2 }).format(value);
const percent = (value: number) => new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 }).format(Math.abs(value));

export default function ResultLensCard({ lenses, selected, onSelect, startDateLabel, targetDateLabel, startingValue }: {
  lenses: ResultLenses;
  selected: ResultLens;
  onSelect: (lens: ResultLens) => void;
  startDateLabel: string;
  targetDateLabel: string;
  startingValue: number;
}) {
  const lens = lenses[selected];
  const nominalGrowthRealLoss = selected === "real" && lens.status === "ready" && lens.direction === "loss" &&
    lenses.gross.status === "ready" && lenses.gross.direction === "gain";
  return (
    <div className="result-lens">
      <fieldset className="result-lens-switch">
        <legend>Sonuç merceği</legend>
        <div>
          {RESULT_LENS_OPTIONS.map((option) => (
            <label key={option.id}>
              <input type="radio" name="result-lens" value={option.id} checked={selected === option.id}
                onChange={() => onSelect(option.id)} aria-controls="result-lens-output" />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div id="result-lens-output" className="main-result result-lens-output" aria-busy={lens.status === "loading"}>
        <span>{lens.valueLabel}</span>
        {lens.status === "ready" ? <>
          <strong>{money(lens.value)}</strong>
          <em className={lens.direction === "gain" ? "positive" : lens.direction === "loss" ? "negative" : "neutral"}>
            {lens.direction === "flat" ? "Yaklaşık değişmedi" : `%${percent(lens.changePercent)} ${lens.direction === "gain" ? "artış" : "azalış"}`}
          </em>
          <small className="result-lens-basis">{lens.priceBasis === "start" ? `${startDateLabel} fiyat düzeyiyle` : `${targetDateLabel} nominal TL değeri`}</small>
          <small className="result-lens-basis">Değişimin baz aldığı başlangıç: {money(startingValue)}</small>
          {nominalGrowthRealLoss && <p className="result-lens-warning">Brüt TL tutarı arttı; masraf ve TÜFE sonrasında alım gücü azaldı.</p>}
        </> : <p className="result-lens-unavailable" role="status">{lens.message}</p>}
        <p className="result-lens-explanation">{lens.explanation}</p>
      </div>
      <p className="result-lens-scope">Mercek yalnız bu sonuç kartını değiştirir; aşağıdaki analizler kendi belirtilen ölçülerinde kalır.</p>
    </div>
  );
}
