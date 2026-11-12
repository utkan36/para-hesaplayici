"use client";

import { useState } from "react";
import type { HistoryPoint } from "./history-chart";

export type ScenarioSeries = {
  indexCode: string;
  label: string;
  points: HistoryPoint[];
};

type ScenarioHistoryChartProps = {
  series: ScenarioSeries[];
  valueMode: "nominal" | "real";
};

const SERIES_COLORS = ["#0f7755", "#d97824", "#2869a7"];

function formatMoney(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00Z`));
}

export default function ScenarioHistoryChart({ series, valueMode }: ScenarioHistoryChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const referencePoints = series[0]?.points ?? [];

  if (series.length === 0 || referencePoints.length < 2) return null;

  const width = 780;
  const height = 300;
  const left = 68;
  const right = 22;
  const top = 28;
  const bottom = 46;
  const values = series.flatMap((item) => item.points.map((point) => point.value));
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const difference = rawMax - rawMin || rawMax * 0.1 || 1;
  const minimum = rawMin - difference * 0.08;
  const maximum = rawMax + difference * 0.08;

  function getX(index: number) {
    return left + (index / (referencePoints.length - 1)) * (width - left - right);
  }

  function getY(value: number) {
    return top + ((maximum - value) / (maximum - minimum)) * (height - top - bottom);
  }

  const labelIndices = [...new Set([
    0,
    Math.floor((referencePoints.length - 1) / 2),
    referencePoints.length - 1,
  ])];
  const activeX = activeIndex === null ? 0 : getX(activeIndex);
  const tooltipWidth = 186;
  const tooltipHeight = 38 + series.length * 20;
  const tooltipX = activeX > width / 2
    ? Math.max(left, activeX - tooltipWidth - 14)
    : Math.min(activeX + 14, width - right - tooltipWidth);
  const tooltipY = top + 8;

  return (
    <div className="scenario-chart-wrap">
      <div className="scenario-legend" aria-label="Grafik göstergesi">
        {series.map((item, index) => (
          <span key={item.indexCode}>
            <i aria-hidden="true" style={{ backgroundColor: SERIES_COLORS[index] }} />
            {item.label}
            <strong>{formatMoney(item.points[item.points.length - 1].value)}</strong>
          </span>
        ))}
      </div>

      <div className="scenario-chart-scroll">
        <svg
          aria-label={`${series.map((item) => item.label).join(", ")} ${valueMode === "real" ? "TÜFE etkisinden arındırılmış reel" : "nominal"} tarihsel değer karşılaştırması`}
          className="scenario-chart"
          onPointerLeave={(event) => {
            if (event.pointerType === "mouse") setActiveIndex(null);
          }}
          preserveAspectRatio="none"
          role="group"
          viewBox={`0 0 ${width} ${height}`}
        >
          {[rawMin, (rawMin + rawMax) / 2, rawMax].map((value, index) => {
            const y = getY(value);

            return (
              <g key={`${value}-${index}`}>
                <line className="scenario-grid-line" x1={left} x2={width - right} y1={y} y2={y} />
                <text className="scenario-axis-label" x={left - 9} y={y + 4}>
                  {formatMoney(value)}
                </text>
              </g>
            );
          })}

          {series.map((item, seriesIndex) => (
            <polyline
              fill="none"
              key={item.indexCode}
              points={item.points.map((point, pointIndex) => `${getX(pointIndex)},${getY(point.value)}`).join(" ")}
              stroke={SERIES_COLORS[seriesIndex]}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="3"
            />
          ))}

          {referencePoints.map((point, pointIndex) => {
            const label = series
              .map((item) => `${item.label}: ${formatMoney(item.points[pointIndex].value)}`)
              .join(", ");

            return (
              <g
                aria-label={`${formatDate(point.date)}; ${label}`}
                className="scenario-point-control"
                key={point.date}
                onClick={() => setActiveIndex(pointIndex)}
                onFocus={() => setActiveIndex(pointIndex)}
                onPointerEnter={() => setActiveIndex(pointIndex)}
                onPointerDown={() => setActiveIndex(pointIndex)}
                role="button"
                tabIndex={0}
              >
                <rect
                  aria-hidden="true"
                  fill="transparent"
                  height={height - top - bottom}
                  width="34"
                  x={getX(pointIndex) - 17}
                  y={top}
                />
                {series.map((item, seriesIndex) => (
                  <circle
                    className={activeIndex === pointIndex ? "active" : ""}
                    cx={getX(pointIndex)}
                    cy={getY(item.points[pointIndex].value)}
                    fill="white"
                    key={item.indexCode}
                    r={activeIndex === pointIndex ? 5 : 3.5}
                    stroke={SERIES_COLORS[seriesIndex]}
                    strokeWidth={activeIndex === pointIndex ? 3 : 2}
                  />
                ))}
              </g>
            );
          })}

          {activeIndex !== null && (
            <g className="scenario-tooltip" pointerEvents="none">
              <line className="scenario-guide" x1={activeX} x2={activeX} y1={top} y2={height - bottom} />
              <rect
                className="scenario-tooltip-background"
                height={tooltipHeight}
                rx="11"
                width={tooltipWidth}
                x={tooltipX}
                y={tooltipY}
              />
              <text className="scenario-tooltip-date" x={tooltipX + 13} y={tooltipY + 20}>
                {formatDate(referencePoints[activeIndex].date)}
              </text>
              {series.map((item, seriesIndex) => (
                <g key={item.indexCode}>
                  <circle cx={tooltipX + 15} cy={tooltipY + 37 + seriesIndex * 20} fill={SERIES_COLORS[seriesIndex]} r="3" />
                  <text className="scenario-tooltip-label" x={tooltipX + 24} y={tooltipY + 41 + seriesIndex * 20}>
                    {item.label}
                  </text>
                  <text className="scenario-tooltip-value" textAnchor="end" x={tooltipX + tooltipWidth - 12} y={tooltipY + 41 + seriesIndex * 20}>
                    {formatMoney(item.points[activeIndex].value)}
                  </text>
                </g>
              ))}
            </g>
          )}

          {labelIndices.map((index) => (
            <text
              className="scenario-date-label"
              key={referencePoints[index].date}
              textAnchor={index === 0 ? "start" : index === referencePoints.length - 1 ? "end" : "middle"}
              x={getX(index)}
              y={height - 12}
            >
              {formatDate(referencePoints[index].date)}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}
