import { describe, expect, test } from "bun:test";
import { comparePageRepresentations } from "../../packages/seo-audit/src/domain/render/compare-page-representations.ts";
import { createPageRepresentation } from "../../packages/seo-audit/src/domain/render/create-page-representation.ts";
import { RenderAuditSchema } from "../../packages/seo-audit/src/domain/render/render-audit.schema.ts";
import { AuditBundleSchema } from "../../packages/seo-audit/src/domain/report/audit.schema.ts";
import { buildPageMetrics } from "../../packages/seo-audit/src/domain/report/build-page-metrics.ts";
import { buildSiteMetric } from "../../packages/seo-audit/src/domain/report/build-site-metric.ts";
import { PageMetricSchema } from "../../packages/seo-audit/src/domain/report/page-metric.schema.ts";
import { SiteMetricSchema } from "../../packages/seo-audit/src/domain/report/site-metric.schema.ts";

const url = "https://www.example.com/";

describe("consolidated audit metrics", () => {
  test("builds stable page and site health with browser CPU and third-party evidence", () => {
    const bundle = auditBundle();
    const pageMetrics = buildPageMetrics(bundle);
    expect(pageMetrics).toHaveLength(1);
    const page = pageMetrics[0];
    if (!page) throw new Error("Expected one page metric");
    expect(page.technicalHealth.score).toBeLessThan(100);
    expect(page.technicalHealth.components.content).toBeLessThan(100);
    expect(page.javascriptHealth?.evidenceCoverage).toBe(1);
    expect(page.browser?.scriptCpuMs).toBe(350);
    expect(page.browser?.longTaskCount).toBe(1);
    expect(page.browser?.scriptNetworkDurationMs).toBe(120);
    expect(PageMetricSchema.parse(JSON.parse(JSON.stringify(page)))).toEqual(page);

    const site = buildSiteMetric(bundle.summary.site, pageMetrics, bundle.renderAudits);
    expect(site.javascriptHealth?.pagesEvaluated).toBe(1);
    expect(site.distributions.scriptCpuMs?.p75).toBe(350);
    expect(site.resourceTypes.script?.requests).toBe(2);
    expect(site.thirdPartyDomains).toContainEqual({ domain: "vendor.net", pages: 1, requests: 1, bytes: 510_000 });
    expect(SiteMetricSchema.parse(JSON.parse(JSON.stringify(site)))).toEqual(site);
  });

  test("rejects unknown fields and schema-version drift", () => {
    const page = buildPageMetrics(auditBundle())[0];
    if (!page) throw new Error("Expected one page metric");
    const site = buildSiteMetric(url, [page], auditBundle().renderAudits);
    expect(PageMetricSchema.safeParse({ ...page, unknown: true }).success).toBeFalse();
    expect(PageMetricSchema.safeParse({ ...page, schemaVersion: 2 }).success).toBeFalse();
    expect(SiteMetricSchema.safeParse({ ...site, unknown: true }).success).toBeFalse();
    expect(SiteMetricSchema.safeParse({ ...site, schemaVersion: 2 }).success).toBeFalse();
  });
});

function auditBundle() {
  const fetchRaw = createPageRepresentation("fetch_raw", "<title>Raw</title><h1>Raw</h1><p>delivered content</p>", url);
  const browserRaw = createPageRepresentation("browser_raw", "<title>Raw</title><h1>Raw</h1><p>delivered content</p>", url);
  const renderedDom = createPageRepresentation("rendered_dom", "<title>Rendered</title><h1>Rendered</h1><p>delivered content and more</p>", url);
  const renderAudit = RenderAuditSchema.parse({
    schemaVersion: 1,
    pageUrl: url,
    fetchRaw,
    browserRaw,
    renderedDom,
    deliveryDelta: comparePageRepresentations(fetchRaw, browserRaw),
    renderDelta: comparePageRepresentations(browserRaw, renderedDom),
    totalDelta: comparePageRepresentations(fetchRaw, renderedDom),
    execution: {
      jobId: "metrics",
      url,
      termination: "stable",
      durationMs: 1500,
      requests: 3,
      requestCounts: { document: 1, script: 2 },
      checkpoints: { domContentLoadedMs: 200, loadMs: 450, contentStableMs: 1200 },
      mutationCount: 3,
      runtimeMetrics: {
        scriptDurationMs: 350,
        taskDurationMs: 900,
        layoutDurationMs: 30,
        recalcStyleDurationMs: 20,
        jsHeapUsedBytes: 1000,
        jsHeapTotalBytes: 2000,
        domNodes: 40,
        layoutCount: 2,
        recalcStyleCount: 3,
      },
      longTasks: [{ sequence: 0, startTimeMs: 100, durationMs: 80, name: "self" }],
      resources: [
        resource(0, url, "document", 10_000, 30),
        resource(1, "https://cdn.example.com/app.js", "script", 100_000, 50),
        resource(2, "https://vendor.net/tracker.js", "script", 510_000, 70),
      ],
      consoleEvents: [],
      failedRequests: [],
      consoleErrors: [],
      pageErrors: [],
      clientRedirects: [],
    },
  });
  return AuditBundleSchema.parse({
    summary: {
      schemaVersion: 1,
      site: url,
      startedAt: "2026-08-15T00:00:00.000Z",
      completedAt: "2026-08-15T00:00:02.000Z",
      durationMs: 2000,
      status: "complete",
      totals: {
        discovered: 1,
        crawled: 1,
        internal: 1,
        external: 0,
        html: 1,
        indexable: 1,
        nonIndexable: 0,
        blocked: 0,
        errors4xx: 0,
        errors5xx: 0,
        redirects: 0,
        issues: 1,
      },
      responseCodes: { "200": 1 },
      issueCounts: { medium: 1 },
    },
    pages: [
      {
        schemaVersion: 1,
        id: "page",
        url,
        key: url,
        internal: true,
        state: "rendered",
        depth: 0,
        navigationDepth: 0,
        discoveryCount: 1,
        discoveredVia: ["seed"],
        status: 200,
        contentType: "text/html",
        robots: [],
        headings: [{ level: 1, text: "Raw" }],
      },
    ],
    edges: [],
    findings: [
      {
        schemaVersion: 1,
        id: "finding",
        ruleId: "metadata.title_changed",
        ruleVersion: "1.0.0",
        findingType: "warning",
        category: "metadata",
        severity: "medium",
        confidence: "strong",
        title: "Title needs review",
        summary: "Title changed.",
        remediation: "Review it.",
        affectedUrls: [url],
        sourceUrls: [],
        evidence: [],
        count: 1,
      },
    ],
    renderAudits: [renderAudit],
    ruleEvaluations: [],
  });
}

function resource(sequence: number, resourceUrl: string, resourceType: string, responseBodyBytes: number, durationMs: number) {
  return {
    sequence,
    url: resourceUrl,
    method: "GET",
    resourceType,
    status: 200,
    durationMs,
    sizes: { requestBodyBytes: 0, requestHeaderBytes: 0, responseBodyBytes, responseHeaderBytes: 0 },
  };
}
