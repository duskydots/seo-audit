import { z } from "zod";
import { FindingEvidenceSchema, FindingSchema } from "../findings/finding.schema.ts";
import { PageNodeSchema } from "../graph/page-node.schema.ts";
import { BrowserConsoleEventSchema } from "../render/browser-console-event.schema.ts";
import { BrowserResourceObservationSchema } from "../render/browser-resource-observation.schema.ts";
import { NetworkFailureSchema } from "../render/render-observation.schema.ts";
import { PageMetricSchema } from "./page-metric.schema.ts";

export const PageFindingSummarySchema = FindingSchema.pick({
  schemaVersion: true,
  id: true,
  ruleId: true,
  ruleVersion: true,
  findingType: true,
  category: true,
  severity: true,
  confidence: true,
  title: true,
  summary: true,
  remediation: true,
  count: true,
}).strict();

export const PageIssueInsightSchema = z
  .object({
    finding: PageFindingSummarySchema,
    roles: z.array(z.enum(["affected", "source", "target", "evidence"])).min(1),
    evidenceLevel: z.enum(["exact", "association-only"]),
    locations: z
      .array(
        z
          .object({
            url: z.url(),
            role: z.enum(["affected", "source", "target", "evidence"]),
          })
          .strict(),
      )
      .min(1),
    pageEvidence: z.array(FindingEvidenceSchema).min(1),
  })
  .strict();

export const PageBrowserInsightSchema = z
  .object({
    termination: z.enum(["stable", "hard-timeout", "navigation-error"]),
    resources: z.array(BrowserResourceObservationSchema),
    resourcesTruncated: z.boolean(),
    javascriptResources: z.array(BrowserResourceObservationSchema),
    failedRequests: z.array(NetworkFailureSchema),
    consoleEvents: z.array(BrowserConsoleEventSchema),
    consoleEventsTruncated: z.boolean(),
    pageErrors: z.array(z.string()),
  })
  .strict();

export const PageInsightSchema = z
  .object({
    schemaVersion: z.literal(2),
    page: PageNodeSchema,
    metric: PageMetricSchema,
    issues: z.array(PageIssueInsightSchema),
    browser: PageBrowserInsightSchema.optional(),
  })
  .strict();

export type PageInsight = z.infer<typeof PageInsightSchema>;
export type PageIssueInsight = z.infer<typeof PageIssueInsightSchema>;
export type PageFindingSummary = z.infer<typeof PageFindingSummarySchema>;
