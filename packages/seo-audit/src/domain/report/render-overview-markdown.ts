import type { AuditBundle } from "./audit.schema.ts";
import { markdownValue } from "./markdown-escape.ts";
import { resolveAuditMetrics } from "./resolve-audit-metrics.ts";

export function renderOverviewMarkdown(bundle: AuditBundle): string[] {
  const { summary, pages, findings, renderAudits, ruleEvaluations } = bundle;
  const { siteMetric } = resolveAuditMetrics(bundle);
  const depthCounts = new Map<number, number>();
  for (const page of pages) {
    if (!page.internal || page.navigationDepth === undefined) continue;
    depthCounts.set(page.navigationDepth, (depthCounts.get(page.navigationDepth) ?? 0) + 1);
  }
  const coverage = {
    passed: ruleEvaluations.filter((rule) => rule.status === "passed").length,
    failed: ruleEvaluations.filter((rule) => rule.status === "failed").length,
    unavailable: ruleEvaluations.filter((rule) => rule.status === "not_evaluated").length,
  };
  return [
    "## Overview",
    "",
    "### Crawl profile",
    "",
    "| Field | Value |",
    "|---|---|",
    `| Site | ${markdownValue(summary.site)} |`,
    `| Status | ${summary.status} |`,
    `| Started | ${markdownValue(summary.startedAt)} |`,
    `| Completed | ${markdownValue(summary.completedAt)} |`,
    `| Duration | ${Math.round(summary.durationMs)} ms |`,
    "",
    "### Summary metrics",
    "",
    "| Metric | Value |",
    "|---|---:|",
    `| Technical Health | ${siteMetric.technicalHealth.score}/100 (${siteMetric.technicalHealth.status}) |`,
    `| JavaScript Health | ${siteMetric.javascriptHealth ? `${siteMetric.javascriptHealth.score}/100 (${siteMetric.javascriptHealth.status})` : "Not available"} |`,
    `| JavaScript render coverage | ${siteMetric.javascriptHealth ? `${(siteMetric.javascriptHealth.coverage * 100).toFixed(1)}%` : "Not available"} |`,
    `| URLs discovered | ${summary.totals.discovered} |`,
    `| URLs crawled | ${summary.totals.crawled} |`,
    `| Internal URLs | ${summary.totals.internal} |`,
    `| External URLs | ${summary.totals.external} |`,
    `| HTML pages | ${summary.totals.html} |`,
    `| Indexable candidates | ${summary.totals.indexable} |`,
    `| Non-indexable | ${summary.totals.nonIndexable} |`,
    `| Robots-blocked | ${summary.totals.blocked} |`,
    `| 4xx errors | ${summary.totals.errors4xx} |`,
    `| 5xx errors | ${summary.totals.errors5xx} |`,
    `| Redirecting URLs | ${summary.totals.redirects} |`,
    `| Finding occurrences | ${summary.totals.issues} |`,
    `| Rendered pages | ${renderAudits.length} |`,
    `| Rendered pages reaching stability | ${renderAudits.filter((audit) => audit.execution.termination === "stable").length} |`,
    `| Rules passed / failed / unavailable | ${coverage.passed} / ${coverage.failed} / ${coverage.unavailable} |`,
    "",
    "### Health distribution",
    "",
    "| Score | Minimum | p50 | p75 | p95 | Maximum | Pages |",
    "|---|---:|---:|---:|---:|---:|---:|",
    `| Technical Health | ${siteMetric.distributions.technicalHealth.minimum} | ${siteMetric.distributions.technicalHealth.p50} | ${siteMetric.distributions.technicalHealth.p75} | ${siteMetric.distributions.technicalHealth.p95} | ${siteMetric.distributions.technicalHealth.maximum} | ${siteMetric.distributions.technicalHealth.count} |`,
    ...(siteMetric.distributions.javascriptHealth
      ? [
          `| JavaScript Health | ${siteMetric.distributions.javascriptHealth.minimum} | ${siteMetric.distributions.javascriptHealth.p50} | ${siteMetric.distributions.javascriptHealth.p75} | ${siteMetric.distributions.javascriptHealth.p95} | ${siteMetric.distributions.javascriptHealth.maximum} | ${siteMetric.distributions.javascriptHealth.count} |`,
        ]
      : []),
    "",
    "Technical Health is a deterministic weighted projection of evidence-backed findings: retrieval 35%, indexability 25%, content 20%, and connectivity 20%. Finding severity, type, and confidence determine the component penalty; an intentional state such as noindex is not penalized unless a rule produces a contradictory or harmful finding.",
    "",
    "JavaScript Health combines content safety 30%, render reliability 20%, main-thread work 20%, network cost 20%, and execution errors 10%. When Chromium CPU evidence is unavailable, that component is omitted and available weights are normalized; the evidence-coverage field makes this explicit. Scores prioritize audit navigation and do not replace the underlying findings or raw observations.",
    "",
    "### Response distribution",
    "",
    "| Response/state | URLs |",
    "|---|---:|",
    ...Object.entries(summary.responseCodes)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([status, count]) => `| ${markdownValue(status)} | ${count} |`),
    "",
    "### Crawl-depth distribution",
    "",
    "Depth is shortest observed click depth through internal HTML anchors. Sitemap declarations are excluded.",
    "",
    "| Depth | Pages |",
    "|---:|---:|",
    ...[...depthCounts].sort(([left], [right]) => left - right).map(([depth, count]) => `| ${depth} | ${count} |`),
    "",
    "### Top prioritized findings",
    "",
    "| Severity | Type | Finding | Affected URLs |",
    "|---|---|---|---:|",
    ...findings.slice(0, 6).map((finding) => `| ${finding.severity} | ${finding.findingType} | ${markdownValue(finding.title)} | ${finding.count} |`),
    ...(findings.length === 0 ? ["No findings were produced by the enabled rules."] : []),
    "",
    "### Rule coverage",
    "",
    "| Rule | Status | Findings | Missing capabilities |",
    "|---|---|---:|---|",
    ...ruleEvaluations.map(
      (rule) =>
        `| ${markdownValue(`${rule.ruleId}@${rule.ruleVersion}`)} | ${rule.status} | ${rule.findingCount} | ${markdownValue(rule.missingCapabilities.join(", "))} |`,
    ),
    "",
    "### Rule catalog",
    "",
    "The catalog is the canonical explanation of every enabled rule. Thresholds are deterministic diagnostics, not guarantees of ranking impact.",
    "",
    "| Rule | Category | Severity | Type | Confidence | Exact trigger | Evidence collected | Tags |",
    "|---|---|---|---|---|---|---|---|",
    ...bundle.ruleCatalog.map(
      ({ metadata, explanation }) =>
        `| ${markdownValue(`${metadata.id}@${metadata.version}`)} | ${metadata.category} | ${metadata.defaultSeverity} | ${metadata.findingType} | ${metadata.confidence} | ${markdownValue(explanation.trigger)} | ${markdownValue(explanation.evidence.join("; "))} | ${markdownValue(explanation.tags.join(", "))} |`,
    ),
    ...(bundle.ruleCatalog.length === 0 ? ["| — | — | — | — | — | Rule catalog unavailable for this legacy audit | — | — |"] : []),
    "",
  ];
}
