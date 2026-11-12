export type RiskLimitAssessment = {
  lossExceeded: boolean;
  durationExceeded: boolean;
  durationPending: boolean;
  lossGapPercentagePoints: number;
  durationGapDays: number;
  outcome: "within" | "pending" | "loss-exceeded" | "duration-exceeded" | "both-exceeded";
};

export function describeRiskLimits(assessment: RiskLimitAssessment) {
  return {
    headline: assessment.outcome === "within"
      ? "Örneklemde aşım görülmedi"
      : assessment.outcome === "pending"
        ? "Bekleme sonucu açık"
        : "Örneklemde sınır aşıldı",
    loss: assessment.lossExceeded ? "Örneklemde aşıldı" : "Örneklemde aşım görülmedi",
    duration: assessment.durationExceeded
      ? "Örneklemde aşıldı"
      : assessment.durationPending
        ? "Toparlanma tamamlanmadı"
        : "Örneklemde aşım görülmedi",
  };
}

export function evaluateRiskLimits({
  maxDrawdownPercent,
  underwaterDays,
  lossLimitPercent,
  durationLimitDays,
  hasOpenDrawdown,
}: {
  maxDrawdownPercent: number;
  underwaterDays: number;
  lossLimitPercent: number;
  durationLimitDays: number;
  hasOpenDrawdown: boolean;
}): RiskLimitAssessment {
  const values = [maxDrawdownPercent, underwaterDays, lossLimitPercent, durationLimitDays];
  if (
    values.some((value) => !Number.isFinite(value)) ||
    maxDrawdownPercent < 0 ||
    maxDrawdownPercent > 100 ||
    underwaterDays < 0 ||
    lossLimitPercent <= 0 ||
    lossLimitPercent > 100 ||
    durationLimitDays <= 0 ||
    typeof hasOpenDrawdown !== "boolean"
  ) {
    throw new Error("Kişisel sınır testi hesaplanamadı.");
  }

  const lossGapPercentagePoints = maxDrawdownPercent - lossLimitPercent;
  const durationGapDays = underwaterDays - durationLimitDays;
  const lossExceeded = lossGapPercentagePoints > 1e-9;
  const durationExceeded = durationGapDays > 0;
  const durationPending = !durationExceeded && hasOpenDrawdown;
  const outcome = lossExceeded && durationExceeded
    ? "both-exceeded"
    : lossExceeded
      ? "loss-exceeded"
      : durationExceeded
        ? "duration-exceeded"
        : durationPending
          ? "pending"
          : "within";

  return {
    lossExceeded,
    durationExceeded,
    durationPending,
    lossGapPercentagePoints,
    durationGapDays,
    outcome,
  };
}
