import { z } from "zod";
import { EdgeKindSchema } from "../graph/edge.schema.ts";

export const SeveritySchema = z.enum(["critical", "high", "medium", "low", "info"]);
export const FindingTypeSchema = z.enum(["issue", "warning", "opportunity"]);

export const PageFindingEvidenceSchema = z
  .object({
    kind: z.literal("page"),
    url: z.url(),
    source: z.enum(["fetch_raw", "rendered_dom", "sitemap", "derived"]),
    field: z.string().min(1).optional(),
    value: z.string().optional(),
  })
  .strict();

export const LinkFindingEvidenceSchema = z
  .object({
    kind: z.literal("link"),
    edgeId: z.string().min(1),
    edgeKind: EdgeKindSchema,
    sourceUrl: z.url(),
    targetUrl: z.url(),
    targetStatus: z.number().int().min(0).max(599).optional(),
    text: z.string().optional(),
    rel: z.array(z.string()),
    sequence: z.number().int().nonnegative(),
  })
  .strict();

export const BrowserFindingEvidenceSchema = z
  .object({
    kind: z.literal("browser"),
    pageUrl: z.url(),
    source: z.literal("playwright"),
    evidenceType: z.enum(["render-delta", "network-failure", "http-error", "runtime-error", "metric", "termination"]),
    field: z.string().min(1),
    value: z.string(),
    requestUrl: z.url().optional(),
    resourceType: z.string().min(1).optional(),
    status: z.number().int().min(0).max(599).optional(),
  })
  .strict();

export const FindingEvidenceSchema = z.discriminatedUnion("kind", [PageFindingEvidenceSchema, LinkFindingEvidenceSchema, BrowserFindingEvidenceSchema]);

export const FindingSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.string().min(1),
    ruleId: z.string().min(1),
    ruleVersion: z.string().min(1).default("1.0.0"),
    findingType: FindingTypeSchema.default("issue"),
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
    severity: SeveritySchema,
    confidence: z.enum(["confirmed", "strong", "heuristic"]),
    title: z.string().min(1),
    summary: z.string().min(1),
    remediation: z.string().min(1),
    affectedUrls: z.array(z.url()),
    sourceUrls: z.array(z.url()),
    evidence: z.array(FindingEvidenceSchema).default([]),
    count: z.number().int().positive(),
  })
  .strict();

export type Finding = z.infer<typeof FindingSchema>;
export type FindingType = z.infer<typeof FindingTypeSchema>;
export type FindingEvidence = z.infer<typeof FindingEvidenceSchema>;
