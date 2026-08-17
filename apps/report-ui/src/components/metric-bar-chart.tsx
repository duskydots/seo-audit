import { barY, defineChart } from "@tanstack/charts";
import { scaleBand } from "@tanstack/charts/scales/band";
import { scaleLinear } from "@tanstack/charts/scales/linear";
import { Chart } from "@tanstack/react-charts";
import { useMemo } from "react";

export type MetricChartRow = Readonly<{ label: string; value: number }>;

export function MetricBarChart({
  rows,
  ariaLabel,
  color = "#26a269",
  height = 240,
}: {
  rows: readonly MetricChartRow[];
  ariaLabel: string;
  color?: string;
  height?: number;
}) {
  const definition = useMemo(
    () =>
      defineChart({
        marks: [barY(rows, { x: "label", y: "value", fill: color, inset: 3 })],
        x: { scale: () => scaleBand().padding(0.2) },
        y: { scale: scaleLinear, nice: true, grid: true },
      }),
    [rows, color],
  );
  if (rows.length === 0) return <div className="chart-empty">No measurements available.</div>;
  return <Chart definition={definition} height={height} ariaLabel={ariaLabel} />;
}
