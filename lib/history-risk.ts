export type HistoryRiskPoint = {
  date: string;
  value: number;
};

export type HistoryRisk = {
  maxDrawdownPercent: number;
  peakDate: string;
  peakValue: number;
  troughDate: string;
  troughValue: number;
  lossAmount: number;
  requiredRecoveryPercent: number;
  declineDays: number;
  recoveryDate: string | null;
  recoveryDays: number | null;
  underwaterDays: number;
  longestUnderwaterDays: number;
  longestUnderwaterStartDate: string | null;
  longestUnderwaterEndDate: string | null;
  longestUnderwaterRecovered: boolean;
  hasOpenDrawdown: boolean;
  sampleCount: number;
  maxSampleGapDays: number;
  worstIntervalPercent: number;
  worstIntervalStartDate: string;
  worstIntervalEndDate: string;
  positiveIntervalCount: number;
  positiveIntervalPercent: number;
  intervalCount: number;
};

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

function parseDate(date: string) {
  const time = Date.parse(`${date}T12:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(time) || new Date(time).toISOString().slice(0, 10) !== date) {
    throw new Error("Yolculuk riski hesaplanamadı: tarih geçersiz.");
  }
  return time;
}

export function calculateHistoryRisk(points: HistoryRiskPoint[]): HistoryRisk {
  if (points.length < 2) {
    throw new Error("Yolculuk riski hesaplanamadı: en az iki veri noktası gerekli.");
  }

  const orderedPoints = points
    .map((point) => {
      const time = parseDate(point.date);
      if (!Number.isFinite(point.value) || point.value <= 0) {
        throw new Error("Yolculuk riski hesaplanamadı: değerler pozitif olmalı.");
      }
      return { ...point, time };
    })
    .sort((left, right) => left.time - right.time);

  if (orderedPoints.some((point, index) => index > 0 && point.time === orderedPoints[index - 1].time)) {
    throw new Error("Yolculuk riski hesaplanamadı: tarihler benzersiz olmalı.");
  }

  // Depth and duration can belong to different drawdown episodes.
  let episodePeak = orderedPoints[0];
  let hasOpenDrawdown = false;
  let longestUnderwaterDays = 0;
  let longestUnderwaterStartDate: string | null = null;
  let longestUnderwaterEndDate: string | null = null;
  let longestUnderwaterRecovered = true;
  function recordEpisode(endPoint: typeof episodePeak, recovered: boolean) {
    const days = Math.round((endPoint.time - episodePeak.time) / DAY_IN_MILLISECONDS);
    if (days > longestUnderwaterDays || (days === longestUnderwaterDays && !recovered)) {
      longestUnderwaterDays = days;
      longestUnderwaterStartDate = episodePeak.date;
      longestUnderwaterEndDate = endPoint.date;
      longestUnderwaterRecovered = recovered;
    }
  }
  for (const point of orderedPoints.slice(1)) {
    if (point.value >= episodePeak.value) {
      if (hasOpenDrawdown) recordEpisode(point, true);
      episodePeak = point;
      hasOpenDrawdown = false;
    } else {
      hasOpenDrawdown = true;
    }
  }
  if (hasOpenDrawdown) recordEpisode(orderedPoints[orderedPoints.length - 1], false);

  let runningPeak = orderedPoints[0];
  let drawdownPeak = orderedPoints[0];
  let drawdownTrough = orderedPoints[0];
  let troughIndex = 0;
  let maxDrawdownPercent = 0;
  let worstIntervalPercent = Number.POSITIVE_INFINITY;
  let worstIntervalStartDate = orderedPoints[0].date;
  let worstIntervalEndDate = orderedPoints[1].date;
  let positiveIntervalCount = 0;
  let maxSampleGapDays = 0;

  orderedPoints.forEach((point, index) => {
    if (point.value >= runningPeak.value) runningPeak = point;

    const drawdownPercent = (1 - point.value / runningPeak.value) * 100;
    if (drawdownPercent > maxDrawdownPercent) {
      maxDrawdownPercent = drawdownPercent;
      drawdownPeak = runningPeak;
      drawdownTrough = point;
      troughIndex = index;
    }

    if (index === 0) return;
    const previousPoint = orderedPoints[index - 1];
    maxSampleGapDays = Math.max(maxSampleGapDays, Math.round((point.time - previousPoint.time) / DAY_IN_MILLISECONDS));
    const intervalPercent = (point.value / previousPoint.value - 1) * 100;
    if (intervalPercent > 0) positiveIntervalCount += 1;
    if (intervalPercent < worstIntervalPercent) {
      worstIntervalPercent = intervalPercent;
      worstIntervalStartDate = previousPoint.date;
      worstIntervalEndDate = point.date;
    }
  });

  const recoveryPoint = maxDrawdownPercent === 0
    ? drawdownPeak
    : orderedPoints.slice(troughIndex + 1).find((point) => point.value >= drawdownPeak.value) ?? null;
  const intervalCount = orderedPoints.length - 1;
  const lastPoint = orderedPoints[orderedPoints.length - 1];
  const declineDays = Math.round((drawdownTrough.time - drawdownPeak.time) / DAY_IN_MILLISECONDS);
  const recoveryDays = recoveryPoint
    ? Math.round((recoveryPoint.time - drawdownTrough.time) / DAY_IN_MILLISECONDS)
    : null;
  const underwaterEndPoint = recoveryPoint ?? lastPoint;

  return {
    maxDrawdownPercent,
    peakDate: drawdownPeak.date,
    peakValue: drawdownPeak.value,
    troughDate: drawdownTrough.date,
    troughValue: drawdownTrough.value,
    lossAmount: drawdownPeak.value - drawdownTrough.value,
    requiredRecoveryPercent: (drawdownPeak.value / drawdownTrough.value - 1) * 100,
    declineDays,
    recoveryDate: recoveryPoint?.date ?? null,
    recoveryDays,
    underwaterDays: Math.round((underwaterEndPoint.time - drawdownPeak.time) / DAY_IN_MILLISECONDS),
    longestUnderwaterDays,
    longestUnderwaterStartDate,
    longestUnderwaterEndDate,
    longestUnderwaterRecovered,
    hasOpenDrawdown,
    sampleCount: orderedPoints.length,
    maxSampleGapDays,
    worstIntervalPercent,
    worstIntervalStartDate,
    worstIntervalEndDate,
    positiveIntervalCount,
    positiveIntervalPercent: positiveIntervalCount / intervalCount * 100,
    intervalCount,
  };
}
