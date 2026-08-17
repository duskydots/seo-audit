import { z } from "zod";
import { MetricScoreSchema } from "./metric-score.schema.ts";

export const MetricDistributionSchema = z
  .object({
    count: z.number().int().nonnegative(),
    minimum: z.number().nonnegative(),
    p50: z.number().nonnegative(),
    p75: z.number().nonnegative(),
    p95: z.number().nonnegative(),
    maximum: z.number().nonnegative(),
  })
  .strict();

export const SiteMetricSchema = z
  .object({
    schemaVersion: z.literal(1),
    technicalHealth: MetricScoreSchema.extend({ pagesEvaluated: z.number().int().nonnegative() }).strict(),
    javascriptHealth: MetricScoreSchema.extend({
      pagesEvaluated: z.number().int().nonnegative(),
      eligiblePages: z.number().int().nonnegative(),
      coverage: z.number().min(0).max(1),
      evidenceCoverage: z.number().min(0).max(1),
    })
      .strict()
      .optional(),
    distributions: z
      .object({
        technicalHealth: MetricDistributionSchema,
        javascriptHealth: MetricDistributionSchema.optional(),
        contentStableMs: MetricDistributionSchema.optional(),
        scriptCpuMs: MetricDistributionSchema.optional(),
        javascriptBytes: MetricDistributionSchema.optional(),
        transferredBytes: MetricDistributionSchema.optional(),
      })
      .strict(),
    crawlTransferBytes: z.number().int().nonnegative(),
    crawlJavaScriptBytes: z.number().int().nonnegative(),
    crawlThirdPartyBytes: z.number().int().nonnegative(),
    browserRequests: z.number().int().nonnegative(),
    runtimeErrors: z.number().int().nonnegative(),
    resourceTypes: z.record(z.string(), z.object({ requests: z.number().int().nonnegative(), bytes: z.number().int().nonnegative() }).strict()),
    thirdPartyDomains: z.array(
      z
        .object({
          domain: z.string().min(1),
          pages: z.number().int().nonnegative(),
          requests: z.number().int().nonnegative(),
          bytes: z.number().int().nonnegative(),
        })
        .strict(),
    ),
  })
  .strict();

export type MetricDistribution = z.infer<typeof MetricDistributionSchema>;
export type SiteMetric = z.infer<typeof SiteMetricSchema>;
