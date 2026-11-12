import { referenceLag } from "../lib/reference-period";
import type { IndexCode } from "./historical-data-client";

const lagLimits: Partial<Record<IndexCode, number>> = {
  TUFE: 1, USD: 7, EUR: 7, ALTIN: 7, BIST: 7, BTC: 2, FAIZ: 21, BENZIN: 14, MOTORIN: 14,
};

export default function HistoricalReferenceNotice({ code, requestedStart, requestedTarget, actualStart, actualTarget, fallbackNote }: {
  code: IndexCode;
  requestedStart: string;
  requestedTarget: string;
  actualStart: string;
  actualTarget: string;
  fallbackNote: string;
}) {
  const monthly = code === "TUFE";
  const period = (value: string) => monthly ? value.slice(0, 7) : value;
  const startChanged = period(requestedStart) !== period(actualStart);
  const targetChanged = period(requestedTarget) !== period(actualTarget);
  if (!startChanged && !targetChanged) return null;

  const lag = referenceLag(requestedTarget, actualTarget, monthly);
  const limit = lagLimits[code];
  const stale = limit !== undefined && lag > limit;
  return (
    <div className={stale ? "decision-data-notice" : "reference-note"}>
      <strong>{stale ? "Hedef tarih için veri gecikmesi" : "Kullanılan veri tarihleri"}</strong>
      <p>{fallbackNote}</p>
      {startChanged && <p>Başlangıç · İstenen {period(requestedStart)}, kullanılan {period(actualStart)}.</p>}
      {targetChanged && <p>Hedef · İstenen {period(requestedTarget)}, kullanılan {period(actualTarget)}.</p>}
      {stale && <p>Hedef verisi istenen tarihten {lag} {monthly ? "ay" : "gün"} önceye ait.</p>}
    </div>
  );
}
