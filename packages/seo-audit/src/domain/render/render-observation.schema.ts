import { z } from "zod";
import { BrowserConsoleEventSchema } from "./browser-console-event.schema.ts";
import { BrowserLongTaskSchema } from "./browser-long-task.schema.ts";
import { BrowserResourceObservationSchema } from "./browser-resource-observation.schema.ts";
import { BrowserRuntimeMetricsSchema } from "./browser-runtime-metrics.schema.ts";

export const NetworkFailureSchema = z
  .object({
    url: z.url(),
    resourceType: z.string().min(1),
    errorText: z.string().min(1),
  })
  .strict();

export const RenderObservationSchema = z
  .object({
    jobId: z.string(),
    url: z.url(),
    documentStatus: z.number().int().min(0).max(599).optional(),
    browserRawHtml: z.string(),
    renderedHtml: z.string(),
    termination: z.enum(["stable", "hard-timeout", "navigation-error"]),
    durationMs: z.number().nonnegative(),
    requests: z.number().int().nonnegative(),
    consoleMessages: z.number().int().nonnegative().default(0),
    requestCounts: z.record(z.string(), z.number().int().nonnegative()),
    checkpoints: z
      .object({
        domContentLoadedMs: z.number().nonnegative().optional(),
        loadMs: z.number().nonnegative().optional(),
        contentStableMs: z.number().nonnegative().optional(),
      })
      .strict(),
    mutationCount: z.number().int().nonnegative(),
    runtimeMetrics: BrowserRuntimeMetricsSchema.optional(),
    runtimeMetricsUnavailableReason: z.string().min(1).optional(),
    longTasks: z.array(BrowserLongTaskSchema).default([]),
    longTasksTruncated: z.boolean().default(false),
    resources: z.array(BrowserResourceObservationSchema).default([]),
    resourcesTruncated: z.boolean().default(false),
    consoleEvents: z.array(BrowserConsoleEventSchema).default([]),
    consoleEventsTruncated: z.boolean().default(false),
    failedRequests: z.array(NetworkFailureSchema),
    consoleErrors: z.array(z.string()),
    pageErrors: z.array(z.string()),
    clientRedirects: z.array(z.url()),
  })
  .strict();

export type RenderObservation = z.infer<typeof RenderObservationSchema>;
