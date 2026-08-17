import { describe, expect, test } from "bun:test";
import { BrowserRuntimeMetricsSchema } from "../../packages/seo-audit/src/domain/render/browser-runtime-metrics.schema.ts";
import { CdpPerformanceMetricsSchema } from "../../packages/seo-audit/src/domain/render/cdp-performance-metrics.schema.ts";
import { compareRuntimeMetrics } from "../../packages/seo-audit/src/domain/render/compare-runtime-metrics.ts";

describe("browser runtime metrics", () => {
  test("converts cumulative Chromium metrics into page deltas", () => {
    const before = CdpPerformanceMetricsSchema.parse({
      metrics: [
        { name: "ScriptDuration", value: 0.1 },
        { name: "TaskDuration", value: 0.2 },
        { name: "LayoutCount", value: 2 },
      ],
    });
    const after = CdpPerformanceMetricsSchema.parse({
      metrics: [
        { name: "ScriptDuration", value: 0.35 },
        { name: "TaskDuration", value: 0.7 },
        { name: "LayoutDuration", value: 0.02 },
        { name: "RecalcStyleDuration", value: 0.01 },
        { name: "JSHeapUsedSize", value: 1234.4 },
        { name: "JSHeapTotalSize", value: 4096 },
        { name: "Nodes", value: 42 },
        { name: "LayoutCount", value: 5 },
        { name: "RecalcStyleCount", value: 7 },
      ],
    });
    const metrics = compareRuntimeMetrics(before, after);
    expect(metrics.scriptDurationMs).toBeCloseTo(250);
    expect(metrics.taskDurationMs).toBeCloseTo(500);
    expect(metrics.layoutDurationMs).toBe(20);
    expect(metrics.jsHeapUsedBytes).toBe(1234);
    expect(metrics.domNodes).toBe(42);
    expect(metrics.layoutCount).toBe(3);
    expect(BrowserRuntimeMetricsSchema.parse(JSON.parse(JSON.stringify(metrics)))).toEqual(metrics);
  });

  test("rejects malformed and unknown CDP values", () => {
    expect(CdpPerformanceMetricsSchema.safeParse({ metrics: [{ name: "ScriptDuration", value: "slow" }] }).success).toBeFalse();
    expect(CdpPerformanceMetricsSchema.safeParse({ metrics: [], unexpected: true }).success).toBeFalse();
  });
});
