import { z } from "zod";

export const BrowserRuntimeMetricsSchema = z
  .object({
    scriptDurationMs: z.number().nonnegative(),
    taskDurationMs: z.number().nonnegative(),
    layoutDurationMs: z.number().nonnegative(),
    recalcStyleDurationMs: z.number().nonnegative(),
    jsHeapUsedBytes: z.number().int().nonnegative(),
    jsHeapTotalBytes: z.number().int().nonnegative(),
    domNodes: z.number().int().nonnegative(),
    layoutCount: z.number().int().nonnegative(),
    recalcStyleCount: z.number().int().nonnegative(),
  })
  .strict();

export type BrowserRuntimeMetrics = z.infer<typeof BrowserRuntimeMetricsSchema>;
