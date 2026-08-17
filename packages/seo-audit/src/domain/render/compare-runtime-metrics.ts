import type { BrowserRuntimeMetrics } from "./browser-runtime-metrics.schema.ts";
import type { CdpPerformanceMetrics } from "./cdp-performance-metrics.schema.ts";

function indexMetrics(snapshot: CdpPerformanceMetrics): ReadonlyMap<string, number> {
  return new Map(snapshot.metrics.map((metric) => [metric.name, metric.value]));
}

function delta(before: ReadonlyMap<string, number>, after: ReadonlyMap<string, number>, name: string): number {
  return Math.max(0, (after.get(name) ?? 0) - (before.get(name) ?? 0));
}

export function compareRuntimeMetrics(beforeSnapshot: CdpPerformanceMetrics, afterSnapshot: CdpPerformanceMetrics): BrowserRuntimeMetrics {
  const before = indexMetrics(beforeSnapshot);
  const after = indexMetrics(afterSnapshot);
  return Object.freeze({
    scriptDurationMs: delta(before, after, "ScriptDuration") * 1_000,
    taskDurationMs: delta(before, after, "TaskDuration") * 1_000,
    layoutDurationMs: delta(before, after, "LayoutDuration") * 1_000,
    recalcStyleDurationMs: delta(before, after, "RecalcStyleDuration") * 1_000,
    jsHeapUsedBytes: Math.max(0, Math.round(after.get("JSHeapUsedSize") ?? 0)),
    jsHeapTotalBytes: Math.max(0, Math.round(after.get("JSHeapTotalSize") ?? 0)),
    domNodes: Math.max(0, Math.round(after.get("Nodes") ?? 0)),
    layoutCount: Math.round(delta(before, after, "LayoutCount")),
    recalcStyleCount: Math.round(delta(before, after, "RecalcStyleCount")),
  });
}
