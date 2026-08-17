export { type CrawlConfig, CrawlConfigSchema } from "./domain/crawl/crawl-config.schema.ts";
export type { CrawlDependencies } from "./domain/crawl/crawl-site.ts";
export { crawlSite } from "./domain/crawl/crawl-site.ts";
export {
  type AutomaticWorkerCount,
  AutomaticWorkerCountSchema,
  type ExecutionResourcePlan,
  ExecutionResourcePlanSchema,
  type ExecutionResourceRequest,
  ExecutionResourceRequestSchema,
  type RuntimeResources,
  RuntimeResourcesSchema,
} from "./domain/execution/execution-resource-plan.schema.ts";
export { resolveExecutionResourcePlan } from "./domain/execution/resolve-execution-resource-plan.ts";
export { buildRuleCatalog } from "./domain/findings/build-rule-catalog.ts";
export { builtInRules } from "./domain/findings/built-in-rules.ts";
export { createFinding } from "./domain/findings/create-finding.ts";
export { evaluateRules } from "./domain/findings/evaluate-rules.ts";
export { type Finding, type FindingEvidence, FindingEvidenceSchema, FindingSchema } from "./domain/findings/finding.schema.ts";
export { indexFindingsByPage } from "./domain/findings/index-findings-by-page.ts";
export { groupLinkEvidence, type LinkEvidenceGroup, resolveLinkEvidence } from "./domain/findings/resolve-link-evidence.ts";
export {
  type RuleCapability,
  RuleCapabilitySchema,
  type RuleContext,
  type RuleDefinition,
  type RuleEvaluation,
  RuleEvaluationSchema,
  type RuleExplanation,
  RuleExplanationSchema,
  RuleMetadataSchema,
  type RuleRun,
} from "./domain/findings/rule.schema.ts";
export { type RuleCatalogEntry, RuleCatalogEntrySchema } from "./domain/findings/rule-catalog.schema.ts";
export { type Edge, EdgeSchema } from "./domain/graph/edge.schema.ts";
export { buildNavigationTree, type NavigationTreeNode, type NavigationTreeProjection } from "./domain/graph/navigation-tree.ts";
export { type PageNode, PageNodeSchema } from "./domain/graph/page-node.schema.ts";
export { classifyIndexability, type Indexability } from "./domain/indexability/classify-indexability.ts";
export { comparePageRepresentations } from "./domain/render/compare-page-representations.ts";
export { createPageRepresentation } from "./domain/render/create-page-representation.ts";
export { type PageRepresentation, PageRepresentationSchema, type RepresentationSource } from "./domain/render/page-representation.schema.ts";
export { type RenderAudit, RenderAuditSchema } from "./domain/render/render-audit.schema.ts";
export { type RenderDelta, RenderDeltaSchema } from "./domain/render/render-delta.schema.ts";
export { type AuditBundle, AuditBundleSchema, AuditManifestSchema, AuditSummarySchema } from "./domain/report/audit.schema.ts";
export { buildPageMetrics } from "./domain/report/build-page-metrics.ts";
export { buildSiteMetric } from "./domain/report/build-site-metric.ts";
export { type PageMetric, PageMetricSchema } from "./domain/report/page-metric.schema.ts";
export { REPORT_PRESENTATION_LIMITS } from "./domain/report/presentation-limits.ts";
export { type SiteMetric, SiteMetricSchema } from "./domain/report/site-metric.schema.ts";
export { detectRuntimeResources } from "./infrastructure/process/detect-runtime-resources.ts";
export { TOOL_VERSION } from "./tool-version.ts";
