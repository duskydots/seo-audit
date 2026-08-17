export { buildRuleCatalog } from "./domain/findings/build-rule-catalog.ts";
export { type Finding, type FindingEvidence, FindingEvidenceSchema, FindingSchema } from "./domain/findings/finding.schema.ts";
export { indexFindingsByPage } from "./domain/findings/index-findings-by-page.ts";
export { groupLinkEvidence, type LinkEvidenceGroup, resolveLinkEvidence } from "./domain/findings/resolve-link-evidence.ts";
export { type RuleEvaluation, RuleEvaluationSchema, type RuleExplanation, RuleExplanationSchema } from "./domain/findings/rule.schema.ts";
export { type RuleCatalogEntry, RuleCatalogEntrySchema } from "./domain/findings/rule-catalog.schema.ts";
export { type Edge, EdgeSchema } from "./domain/graph/edge.schema.ts";
export { buildNavigationTree, type NavigationTreeNode, type NavigationTreeProjection } from "./domain/graph/navigation-tree.ts";
export { type PageNode, PageNodeSchema } from "./domain/graph/page-node.schema.ts";
export { classifyIndexability, type Indexability } from "./domain/indexability/classify-indexability.ts";
export { summarizeBrowserTelemetry } from "./domain/render/summarize-browser-telemetry.ts";
export { type AuditBundle, AuditBundleSchema, AuditManifestSchema, AuditSummarySchema } from "./domain/report/audit.schema.ts";
export { AUDIT_ARTIFACT_PATHS, LEGACY_AUDIT_ARTIFACT_PATHS } from "./domain/report/audit-artifact-paths.ts";
export { buildPageInsights } from "./domain/report/build-page-insights.ts";
export { buildPageMetrics } from "./domain/report/build-page-metrics.ts";
export { buildSiteMetric } from "./domain/report/build-site-metric.ts";
export { type BrowserPageMetrics, indexBrowserPageMetrics } from "./domain/report/index-browser-page-metrics.ts";
export {
  type PageFindingSummary,
  PageFindingSummarySchema,
  type PageInsight,
  PageInsightSchema,
  type PageIssueInsight,
  PageIssueInsightSchema,
} from "./domain/report/page-insight.schema.ts";
export { type PageMetric, PageMetricSchema } from "./domain/report/page-metric.schema.ts";
export { REPORT_PRESENTATION_LIMITS } from "./domain/report/presentation-limits.ts";
export { type SiteMetric, SiteMetricSchema } from "./domain/report/site-metric.schema.ts";
