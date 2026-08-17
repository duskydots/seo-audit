import { z } from "zod";
import { ExecutionResourcePlanSchema } from "../execution/execution-resource-plan.schema.ts";
import { FindingSchema } from "../findings/finding.schema.ts";
import { RuleEvaluationSchema } from "../findings/rule.schema.ts";
import { RuleCatalogEntrySchema } from "../findings/rule-catalog.schema.ts";
import { EdgeSchema } from "../graph/edge.schema.ts";
import { PageNodeSchema } from "../graph/page-node.schema.ts";
import { RenderAuditSchema } from "../render/render-audit.schema.ts";
import { PageInsightSchema } from "./page-insight.schema.ts";
import { PageMetricSchema } from "./page-metric.schema.ts";
import { SiteMetricSchema } from "./site-metric.schema.ts";

export const AuditSummarySchema = z
  .object({
    schemaVersion: z.literal(1),
    site: z.url(),
    startedAt: z.string(),
    completedAt: z.string(),
    durationMs: z.number().nonnegative(),
    status: z.enum(["complete", "bounded", "failed"]),
    totals: z
      .object({
        discovered: z.number().int().nonnegative(),
        crawled: z.number().int().nonnegative(),
        internal: z.number().int().nonnegative(),
        external: z.number().int().nonnegative(),
        html: z.number().int().nonnegative(),
        indexable: z.number().int().nonnegative(),
        nonIndexable: z.number().int().nonnegative(),
        blocked: z.number().int().nonnegative(),
        errors4xx: z.number().int().nonnegative(),
        errors5xx: z.number().int().nonnegative(),
        redirects: z.number().int().nonnegative(),
        issues: z.number().int().nonnegative(),
      })
      .strict(),
    responseCodes: z.record(z.string(), z.number().int().nonnegative()),
    issueCounts: z.record(z.string(), z.number().int().nonnegative()),
  })
  .strict();

export const AuditManifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    toolVersion: z.string(),
    generatedAt: z.string(),
    files: z.array(z.object({ path: z.string(), rows: z.number().int().nonnegative() }).strict()),
    executionPlan: ExecutionResourcePlanSchema.optional(),
  })
  .strict();

export const AuditBundleSchema = z
  .object({
    summary: AuditSummarySchema,
    pages: z.array(PageNodeSchema),
    edges: z.array(EdgeSchema),
    findings: z.array(FindingSchema),
    renderAudits: z.array(RenderAuditSchema).default([]),
    pageMetrics: z.array(PageMetricSchema).default([]),
    pageInsights: z.array(PageInsightSchema).default([]),
    siteMetric: SiteMetricSchema.optional(),
    ruleEvaluations: z.array(RuleEvaluationSchema).default([]),
    ruleCatalog: z.array(RuleCatalogEntrySchema).default([]),
    executionPlan: ExecutionResourcePlanSchema.optional(),
  })
  .strict();

export type AuditSummary = z.infer<typeof AuditSummarySchema>;
export type AuditManifest = z.infer<typeof AuditManifestSchema>;
export type AuditBundle = z.infer<typeof AuditBundleSchema>;
