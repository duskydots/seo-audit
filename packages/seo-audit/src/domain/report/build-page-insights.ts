import type { Finding, FindingEvidence } from "../findings/finding.schema.ts";
import { indexFindingsByPage } from "../findings/index-findings-by-page.ts";
import { type LinkFindingEvidence, resolveLinkEvidence } from "../findings/resolve-link-evidence.ts";
import type { Edge } from "../graph/edge.schema.ts";
import type { PageNode } from "../graph/page-node.schema.ts";
import type { RenderAudit } from "../render/render-audit.schema.ts";
import { type PageInsight, PageInsightSchema, type PageIssueInsight } from "./page-insight.schema.ts";
import type { PageMetric } from "./page-metric.schema.ts";

export interface PageInsightInput {
  pages: readonly PageNode[];
  edges: readonly Edge[];
  findings: readonly Finding[];
  renderAudits: readonly RenderAudit[];
  pageMetrics: readonly PageMetric[];
}

export function buildPageInsights(input: PageInsightInput): PageInsight[] {
  const findingsByPage = indexFindingsByPage(input.findings, input.pages, input.edges);
  const linkEvidenceByFinding = new Map(input.findings.map((finding) => [finding.id, resolveLinkEvidence(finding, input.pages, input.edges)] as const));
  const metricsByUrl = uniqueIndex(input.pageMetrics, (metric) => metric.url, "page metric");
  const renderAuditsByUrl = uniqueIndex(input.renderAudits, (audit) => audit.pageUrl, "render audit");

  return [...input.pages]
    .filter((page) => page.internal)
    .sort((left, right) => left.url.localeCompare(right.url))
    .map((page) => {
      const metric = metricsByUrl.get(page.url);
      if (!metric) throw new Error(`Page insight invariant violated: missing metric for ${page.url}`);
      const renderAudit = renderAuditsByUrl.get(page.url);
      return PageInsightSchema.parse({
        schemaVersion: 2,
        page,
        metric,
        issues: (findingsByPage.get(page.url) ?? []).map((finding) => buildIssueInsight(page.url, finding, linkEvidenceByFinding.get(finding.id) ?? [])),
        ...(renderAudit
          ? {
              browser: {
                termination: renderAudit.execution.termination,
                resources: [...renderAudit.execution.resources].sort((left, right) => left.sequence - right.sequence),
                resourcesTruncated: renderAudit.execution.resourcesTruncated,
                javascriptResources: renderAudit.execution.resources
                  .filter((resource) => resource.resourceType.toLowerCase() === "script")
                  .sort((left, right) => left.sequence - right.sequence),
                failedRequests: renderAudit.execution.failedRequests,
                consoleEvents: [...renderAudit.execution.consoleEvents].sort((left, right) => left.sequence - right.sequence),
                consoleEventsTruncated: renderAudit.execution.consoleEventsTruncated,
                pageErrors: renderAudit.execution.pageErrors,
              },
            }
          : {}),
      });
    });
}

function buildIssueInsight(url: string, finding: Finding, linkEvidence: readonly LinkFindingEvidence[]): PageIssueInsight {
  const pageEvidence = finding.evidence.filter((evidence) => evidence.kind === "page" && evidence.url === url);
  const browserEvidence = finding.evidence.filter((evidence) => evidence.kind === "browser" && evidence.pageUrl === url);
  const relevantLinks = linkEvidence.filter((evidence) => evidence.sourceUrl === url || evidence.targetUrl === url);
  const roles = new Set<PageIssueInsight["roles"][number]>();
  if (finding.affectedUrls.includes(url)) roles.add("affected");
  if (finding.sourceUrls.includes(url) || relevantLinks.some((evidence) => evidence.sourceUrl === url)) roles.add("source");
  if (relevantLinks.some((evidence) => evidence.targetUrl === url)) roles.add("target");
  if (pageEvidence.length > 0 || browserEvidence.length > 0) roles.add("evidence");
  if (roles.size === 0) roles.add("evidence");

  const exactEvidence = [...pageEvidence, ...browserEvidence, ...relevantLinks] as FindingEvidence[];
  const locations = new Map<string, { url: string; role: PageIssueInsight["locations"][number]["role"] }>();
  const addLocation = (locationUrl: string, role: PageIssueInsight["locations"][number]["role"]) =>
    locations.set(`${role}:${locationUrl}`, { url: locationUrl, role });
  for (const role of roles) addLocation(url, role);
  for (const evidence of relevantLinks) {
    addLocation(evidence.sourceUrl, "source");
    addLocation(evidence.targetUrl, "target");
  }
  if (locations.size === 0) addLocation(url, [...roles][0] ?? "evidence");

  const hasExactEvidence = exactEvidence.some((evidence) => evidence.kind !== "page" || evidence.source !== "derived" || evidence.field !== undefined);
  const evidenceLevel = hasExactEvidence ? "exact" : "association-only";
  const inspectableEvidence: FindingEvidence[] = hasExactEvidence
    ? exactEvidence
    : [{ kind: "page", url, source: "derived", field: "finding_association", value: [...roles].join(",") }];

  return {
    finding: {
      schemaVersion: finding.schemaVersion,
      id: finding.id,
      ruleId: finding.ruleId,
      ruleVersion: finding.ruleVersion,
      findingType: finding.findingType,
      category: finding.category,
      severity: finding.severity,
      confidence: finding.confidence,
      title: finding.title,
      summary: finding.summary,
      remediation: finding.remediation,
      count: finding.count,
    },
    roles: [...roles],
    evidenceLevel,
    locations: [...locations.values()].sort((left, right) => left.url.localeCompare(right.url) || left.role.localeCompare(right.role)),
    pageEvidence: inspectableEvidence,
  };
}

function uniqueIndex<T>(values: readonly T[], key: (value: T) => string, label: string): Map<string, T> {
  const index = new Map<string, T>();
  for (const value of values) {
    const identity = key(value);
    if (index.has(identity)) throw new Error(`Page insight invariant violated: duplicate ${label} for ${identity}`);
    index.set(identity, value);
  }
  return index;
}
