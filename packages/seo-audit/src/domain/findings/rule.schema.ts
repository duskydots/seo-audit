import { z } from "zod";
import type { Edge } from "../graph/edge.schema.ts";
import type { PageNode } from "../graph/page-node.schema.ts";
import type { RenderAudit } from "../render/render-audit.schema.ts";
import { type Finding, FindingTypeSchema, SeveritySchema } from "./finding.schema.ts";

export const RuleCapabilitySchema = z.enum([
  "page-summary",
  "graph",
  "rendered-dom",
  "external-status",
  "resource-fetch",
  "content-text",
  "content-markdown",
  "structured-data",
  "field-performance",
  "international",
  "prior-crawl",
]);

export const RuleMetadataSchema = z
  .object({
    id: z.string().regex(/^[a-z][a-z0-9_.-]+$/),
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
    category: z.enum([
      "response",
      "indexability",
      "metadata",
      "headings",
      "links",
      "content",
      "images",
      "sitemap",
      "rendering",
      "structured-data",
      "performance",
      "international",
    ]),
    defaultSeverity: SeveritySchema,
    findingType: FindingTypeSchema,
    confidence: z.enum(["confirmed", "strong", "heuristic"]),
    requires: z.array(RuleCapabilitySchema),
    description: z.string().min(1),
  })
  .strict();

export const RuleEvaluationSchema = z
  .object({
    ruleId: z.string().min(1),
    ruleVersion: z.string().min(1),
    status: z.enum(["passed", "failed", "not_evaluated"]),
    findingCount: z.number().int().nonnegative(),
    missingCapabilities: z.array(RuleCapabilitySchema),
  })
  .strict();

export const RuleExplanationSchema = z
  .object({
    title: z.string().min(1),
    whyItMatters: z.string().min(1),
    trigger: z.string().min(1),
    remediation: z.string().min(1),
    evidence: z.array(z.string().min(1)).min(1),
    tags: z.array(z.string().regex(/^[a-z][a-z0-9-]*$/)),
  })
  .strict();

export type RuleCapability = z.infer<typeof RuleCapabilitySchema>;
export type RuleMetadata = z.infer<typeof RuleMetadataSchema>;
export type RuleEvaluation = z.infer<typeof RuleEvaluationSchema>;
export type RuleExplanation = z.infer<typeof RuleExplanationSchema>;

export type RuleContext = Readonly<{
  pages: readonly PageNode[];
  edges: readonly Edge[];
  renderAudits: readonly RenderAudit[];
  capabilities: ReadonlySet<RuleCapability>;
}>;

export type RuleDefinition = Readonly<{
  metadata: RuleMetadata;
  explanation: RuleExplanation;
  evaluate(context: RuleContext): Iterable<Finding>;
}>;

export type RuleRun = Readonly<{
  findings: Finding[];
  evaluations: RuleEvaluation[];
}>;
