import { z } from "zod";
import { MetricScoreSchema } from "./metric-score.schema.ts";

const TechnicalComponentsSchema = z
  .object({
    retrieval: z.number().int().min(0).max(100),
    indexability: z.number().int().min(0).max(100),
    content: z.number().int().min(0).max(100),
    connectivity: z.number().int().min(0).max(100),
  })
  .strict();

const JavaScriptComponentsSchema = z
  .object({
    contentSafety: z.number().int().min(0).max(100),
    renderReliability: z.number().int().min(0).max(100),
    mainThread: z.number().int().min(0).max(100).optional(),
    network: z.number().int().min(0).max(100),
    errors: z.number().int().min(0).max(100),
  })
  .strict();

export const PageMetricSchema = z
  .object({
    schemaVersion: z.literal(1),
    url: z.url(),
    eligibleForRendering: z.boolean(),
    technicalHealth: MetricScoreSchema.extend({
      components: TechnicalComponentsSchema,
      issueCount: z.number().int().nonnegative(),
    }).strict(),
    javascriptHealth: MetricScoreSchema.extend({
      components: JavaScriptComponentsSchema,
      evidenceCoverage: z.number().min(0).max(1),
    })
      .strict()
      .optional(),
    browser: z
      .object({
        termination: z.enum(["stable", "hard-timeout", "navigation-error"]),
        totalRenderMs: z.number().nonnegative(),
        domContentLoadedMs: z.number().nonnegative().optional(),
        loadMs: z.number().nonnegative().optional(),
        contentStableMs: z.number().nonnegative().optional(),
        scriptCpuMs: z.number().nonnegative().optional(),
        taskCpuMs: z.number().nonnegative().optional(),
        layoutCpuMs: z.number().nonnegative().optional(),
        recalcStyleCpuMs: z.number().nonnegative().optional(),
        longTaskCount: z.number().int().nonnegative(),
        longTaskTotalMs: z.number().nonnegative(),
        longestTaskMs: z.number().nonnegative(),
        transferredBytes: z.number().int().nonnegative(),
        javascriptBytes: z.number().int().nonnegative(),
        scriptNetworkDurationMs: z.number().nonnegative(),
        thirdPartyBytes: z.number().int().nonnegative(),
        thirdPartyRequests: z.number().int().nonnegative(),
        requests: z.number().int().nonnegative(),
        httpErrors: z.number().int().nonnegative(),
        failedRequests: z.number().int().nonnegative(),
        consoleErrors: z.number().int().nonnegative(),
        pageErrors: z.number().int().nonnegative(),
        rawWordCount: z.number().int().nonnegative(),
        renderedWordCount: z.number().int().nonnegative(),
        textSimilarity: z.number().min(0).max(1),
        linksAdded: z.number().int().nonnegative(),
      })
      .strict()
      .optional(),
  })
  .strict();

export type PageMetric = z.infer<typeof PageMetricSchema>;
