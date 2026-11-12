export type PeriodProfileInput = {
  realNetChangePercent: number;
  maxDrawdownPercent: number;
  timingSensitivityLevel: "low" | "medium" | "high";
  timingSpreadPercent: number;
  thresholdOutcome: "above" | "below" | "equal";
};

export function createPeriodProfile(input: PeriodProfileInput) {
  const numericValues = [
    input.realNetChangePercent,
    input.maxDrawdownPercent,
    input.timingSpreadPercent,
  ];
  if (
    numericValues.some((value) => !Number.isFinite(value)) ||
    input.maxDrawdownPercent < 0 ||
    input.timingSpreadPercent < 0
  ) {
    throw new Error("Dönem karnesi oluşturulamadı.");
  }

  const purchasingPowerSignal = input.realNetChangePercent > 0.05
    ? "gained"
    : input.realNetChangePercent < -0.05
      ? "lost"
      : "preserved";
  const drawdownLevel = input.maxDrawdownPercent <= 10
    ? "low"
    : input.maxDrawdownPercent <= 25
      ? "medium"
      : "high";
  const hasHighJourneyRisk = drawdownLevel === "high" || input.timingSensitivityLevel === "high";
  const hasMediumJourneyRisk = drawdownLevel === "medium" || input.timingSensitivityLevel === "medium";

  if (purchasingPowerSignal === "lost") {
    return {
      purchasingPowerSignal,
      drawdownLevel,
      tone: "negative" as const,
      verdict: hasHighJourneyRisk ? "Alım gücü kaybı ve sert yolculuk" : "Alım gücü kaybı",
    };
  }

  if (purchasingPowerSignal === "preserved") {
    return {
      purchasingPowerSignal,
      drawdownLevel,
      tone: hasHighJourneyRisk ? "warning" as const : "neutral" as const,
      verdict: hasHighJourneyRisk ? "Alım gücü korundu, yolculuk sert" : "Alım gücü yaklaşık korundu",
    };
  }

  return {
    purchasingPowerSignal,
    drawdownLevel,
    tone: hasHighJourneyRisk || hasMediumJourneyRisk ? "warning" as const : "positive" as const,
    verdict: hasHighJourneyRisk
      ? "Kazandırdı ama yolculuk sert"
      : hasMediumJourneyRisk
        ? "Kazandırdı, dalgalanma belirgin"
        : "Örneklemde sınırlı dalgalanma",
  };
}
