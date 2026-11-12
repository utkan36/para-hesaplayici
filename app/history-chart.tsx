"use client";

import { type ReactNode, useState } from "react";

export type HistoryPoint = {
  date: string;
  value: number;
};

type HistoryChartProps = {
  points: HistoryPoint[];
  indexLabel: string;
  children?: ReactNode;
};

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

export default function HistoryChart({ children, points, indexLabel }: HistoryChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (points.length < 2) return null;

  const width = 640;
  const height = 230;
  const left = 58;
  const right = 18;
  const top = 22;
  const bottom = 38;
  const values = points.map((point) => point.value);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const difference = rawMax - rawMin || rawMax * 0.1 || 1;
  const minimum = rawMin - difference * 0.08;
  const maximum = rawMax + difference * 0.08;

  function getX(index: number) {
    return left + (index / (points.length - 1)) * (width - left - right);
  }

  function getY(value: number) {
    return top + ((maximum - value) / (maximum - minimum)) * (height - top - bottom);
  }

  const linePoints = points
    .map((point, index) => `${getX(index)},${getY(point.value)}`)
    .join(" ");
  const areaPoints = [
    `${getX(0)},${height - bottom}`,
    linePoints,
    `${getX(points.length - 1)},${height - bottom}`,
  ].join(" ");
  const labelIndices = [...new Set([0, Math.floor((points.length - 1) / 2), points.length - 1])];
  const lastPoint = points[points.length - 1];
  const activePoint = activeIndex === null ? null : points[activeIndex];
  const tooltipWidth = 150;
  const tooltipHeight = 54;
  const activeX = activeIndex === null ? 0 : getX(activeIndex);
  const activeY = activePoint ? getY(activePoint.value) : 0;
  const tooltipX = Math.min(
    Math.max(activeX - tooltipWidth / 2, left),
    width - right - tooltipWidth,
  );
  const tooltipY = activeY < top + tooltipHeight + 12
    ? activeY + 14
    : activeY - tooltipHeight - 14;

  return (
    <section className="history-card" aria-labelledby="history-title">
      <div className="history-heading">
        <div>
          <span>Zaman içindeki değişim</span>
          <h3 id="history-title">{indexLabel} değer grafiği</h3>
        </div>
        <strong>{formatMoney(lastPoint.value)}</strong>
      </div>

      <div className="history-chart-scroll">
        <svg
          aria-label={`${indexLabel} tarihsel değer değişimi`}
          className="history-chart"
          onPointerLeave={(event) => {
            if (event.pointerType === "mouse") setActiveIndex(null);
          }}
          preserveAspectRatio="none"
          role="group"
          viewBox={`0 0 ${width} ${height}`}
        >
          <defs>
            <linearGradient id="history-area" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#b9df73" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#b9df73" stopOpacity="0" />
            </linearGradient>
          </defs>

          {[rawMin, (rawMin + rawMax) / 2, rawMax].map((value, index) => {
            const y = getY(value);

            return (
              <g key={`${value}-${index}`}>
                <line className="history-grid-line" x1={left} x2={width - right} y1={y} y2={y} />
                <text className="history-axis-label" x={left - 8} y={y + 4}>
                  {formatMoney(value)}
                </text>
              </g>
            );
          })}

          <polygon fill="url(#history-area)" points={areaPoints} />
          <polyline className="history-line" fill="none" points={linePoints} />

          {points.map((point, index) => {
            const label = `${formatDate(point.date)}: ${formatMoney(point.value)}`;

            return (
            <g
              aria-label={label}
              className="history-point-control"
              key={point.date}
              onClick={() => setActiveIndex(index)}
              onFocus={() => setActiveIndex(index)}
              onPointerEnter={() => setActiveIndex(index)}
              onPointerDown={() => setActiveIndex(index)}
              role="button"
              tabIndex={0}
            >
              <circle
                className={`history-point${activeIndex === index ? " active" : ""}`}
                cx={getX(index)}
                cy={getY(point.value)}
                r="4"
              />
              <circle
                aria-hidden="true"
                className="history-hit-target"
                cx={getX(index)}
                cy={getY(point.value)}
                r="16"
              />
            </g>
            );
          })}

          {activePoint && (
            <g className="history-tooltip" pointerEvents="none">
              <line
                className="history-guide"
                x1={activeX}
                x2={activeX}
                y1={top}
                y2={height - bottom}
              />
              <rect
                className="history-tooltip-background"
                height={tooltipHeight}
                rx="10"
                width={tooltipWidth}
                x={tooltipX}
                y={tooltipY}
              />
              <text className="history-tooltip-date" x={tooltipX + 12} y={tooltipY + 20}>
                {formatDate(activePoint.date)}
              </text>
              <text className="history-tooltip-value" x={tooltipX + 12} y={tooltipY + 40}>
                {formatMoney(activePoint.value)}
              </text>
            </g>
          )}

          {labelIndices.map((index) => (
            <text
              className="history-date-label"
              key={points[index].date}
              textAnchor={index === 0 ? "start" : index === points.length - 1 ? "end" : "middle"}
              x={getX(index)}
              y={height - 10}
            >
              {formatDate(points[index].date)}
            </text>
          ))}
        </svg>
      </div>
      {children}
    </section>
  );
}
