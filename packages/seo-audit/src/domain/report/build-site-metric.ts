import { getDomain } from "tldts";
import type { RenderAudit } from "../render/render-audit.schema.ts";
import { calculateMetricDistribution } from "./calculate-metric-distribution.ts";
import type { PageMetric } from "./page-metric.schema.ts";
import { type SiteMetric, SiteMetricSchema } from "./site-metric.schema.ts";

function healthStatus(score: number): "good" | "needs-work" | "poor" {
  if (score >= 85) return "good";
  if (score >= 60) return "needs-work";
  return "poor";
}

function average(values: readonly number[]): number {
  return values.length === 0 ? 0 : Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export function buildSiteMetric(site: string, pageMetrics: readonly PageMetric[], renderAudits: readonly RenderAudit[]): SiteMetric {
  const technicalScores = pageMetrics.map((metric) => metric.technicalHealth.score);
  const javascriptMetrics = pageMetrics.filter((metric) => metric.javascriptHealth && metric.browser);
  const javascriptScores = javascriptMetrics.flatMap((metric) => (metric.javascriptHealth ? [metric.javascriptHealth.score] : []));
  const browserMetrics = javascriptMetrics.flatMap((metric) => (metric.browser ? [metric.browser] : []));
  const eligiblePages = pageMetrics.filter((metric) => metric.eligibleForRendering).length;
  const resourceTypes: Record<string, { requests: number; bytes: number }> = {};
  const thirdParty = new Map<string, { pages: Set<string>; requests: number; bytes: number }>();
  const siteDomain = getDomain(new URL(site).hostname) ?? new URL(site).hostname;
  for (const audit of renderAudits) {
    for (const resource of audit.execution.resources) {
      const bytes = resource.sizes ? resource.sizes.responseBodyBytes + resource.sizes.responseHeaderBytes : 0;
      const type = resource.resourceType;
      const current = resourceTypes[type] ?? { requests: 0, bytes: 0 };
      current.requests += 1;
      current.bytes += bytes;
      resourceTypes[type] = current;
      const hostname = new URL(resource.url).hostname;
      const domain = getDomain(hostname) ?? hostname;
      if (domain === siteDomain) continue;
      const external = thirdParty.get(domain) ?? { pages: new Set<string>(), requests: 0, bytes: 0 };
      external.pages.add(audit.pageUrl);
      external.requests += 1;
      external.bytes += bytes;
      thirdParty.set(domain, external);
    }
  }
  const javascriptScore = average(javascriptScores);
  const runtimeEvidencePages = browserMetrics.filter((metric) => metric.scriptCpuMs !== undefined).length;
  return SiteMetricSchema.parse({
    schemaVersion: 1,
    technicalHealth: { score: average(technicalScores), status: healthStatus(average(technicalScores)), pagesEvaluated: technicalScores.length },
    ...(javascriptScores.length === 0
      ? {}
      : {
          javascriptHealth: {
            score: javascriptScore,
            status: healthStatus(javascriptScore),
            pagesEvaluated: javascriptScores.length,
            eligiblePages,
            coverage: eligiblePages === 0 ? 0 : javascriptScores.length / eligiblePages,
            evidenceCoverage: javascriptScores.length === 0 ? 0 : runtimeEvidencePages / javascriptScores.length,
          },
        }),
    distributions: {
      technicalHealth: calculateMetricDistribution(technicalScores),
      ...(javascriptScores.length === 0 ? {} : { javascriptHealth: calculateMetricDistribution(javascriptScores) }),
      ...(browserMetrics.some((metric) => metric.contentStableMs !== undefined)
        ? {
            contentStableMs: calculateMetricDistribution(
              browserMetrics.flatMap((metric) => (metric.contentStableMs === undefined ? [] : [metric.contentStableMs])),
            ),
          }
        : {}),
      ...(runtimeEvidencePages === 0
        ? {}
        : { scriptCpuMs: calculateMetricDistribution(browserMetrics.flatMap((metric) => (metric.scriptCpuMs === undefined ? [] : [metric.scriptCpuMs]))) }),
      ...(browserMetrics.length === 0 ? {} : { javascriptBytes: calculateMetricDistribution(browserMetrics.map((metric) => metric.javascriptBytes)) }),
      ...(browserMetrics.length === 0 ? {} : { transferredBytes: calculateMetricDistribution(browserMetrics.map((metric) => metric.transferredBytes)) }),
    },
    crawlTransferBytes: browserMetrics.reduce((sum, metric) => sum + metric.transferredBytes, 0),
    crawlJavaScriptBytes: browserMetrics.reduce((sum, metric) => sum + metric.javascriptBytes, 0),
    crawlThirdPartyBytes: browserMetrics.reduce((sum, metric) => sum + metric.thirdPartyBytes, 0),
    browserRequests: browserMetrics.reduce((sum, metric) => sum + metric.requests, 0),
    runtimeErrors: browserMetrics.reduce((sum, metric) => sum + metric.httpErrors + metric.failedRequests + metric.consoleErrors + metric.pageErrors, 0),
    resourceTypes,
    thirdPartyDomains: [...thirdParty]
      .map(([domain, values]) => ({ domain, pages: values.pages.size, requests: values.requests, bytes: values.bytes }))
      .sort((left, right) => right.bytes - left.bytes || left.domain.localeCompare(right.domain)),
  });
}
