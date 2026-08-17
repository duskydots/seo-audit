import { type MetricDistribution, MetricDistributionSchema } from "./site-metric.schema.ts";

function percentile(sorted: readonly number[], fraction: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.ceil(fraction * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, index))] ?? 0;
}

export function calculateMetricDistribution(values: readonly number[]): MetricDistribution {
  const sorted = [...values].sort((left, right) => left - right);
  return MetricDistributionSchema.parse({
    count: sorted.length,
    minimum: sorted[0] ?? 0,
    p50: percentile(sorted, 0.5),
    p75: percentile(sorted, 0.75),
    p95: percentile(sorted, 0.95),
    maximum: sorted.at(-1) ?? 0,
  });
}
