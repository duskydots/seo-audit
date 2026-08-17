import { describe, expect, test } from "bun:test";
import { comparePageRepresentations } from "../../packages/seo-audit/src/domain/render/compare-page-representations.ts";
import { createPageRepresentation } from "../../packages/seo-audit/src/domain/render/create-page-representation.ts";
import { type RenderAudit, RenderAuditSchema } from "../../packages/seo-audit/src/domain/render/render-audit.schema.ts";
import { type AuditBundle, AuditBundleSchema } from "../../packages/seo-audit/src/domain/report/audit.schema.ts";
import { buildPageInsights } from "../../packages/seo-audit/src/domain/report/build-page-insights.ts";
import { buildPageMetrics } from "../../packages/seo-audit/src/domain/report/build-page-metrics.ts";
import { indexBrowserPageMetrics } from "../../packages/seo-audit/src/domain/report/index-browser-page-metrics.ts";
import { PageInsightSchema } from "../../packages/seo-audit/src/domain/report/page-insight.schema.ts";
import { renderPagesMarkdown } from "../../packages/seo-audit/src/domain/report/render-pages-markdown.ts";

const renderedUrl = "https://example.com/";
const rawOnlyUrl = "https://example.com/raw-only";

describe("browser page metrics", () => {
  test("joins render and script-only network evidence by page URL", () => {
    const audit = renderAudit();
    const metrics = indexBrowserPageMetrics([audit]).get(renderedUrl);
    expect(metrics).toEqual({
      termination: "stable",
      totalRenderMs: 1234.4,
      domContentLoadedMs: 101.2,
      contentStableMs: 1200.1,
      transferredBytes: 2750,
      javascriptBytes: 1100,
      javascriptLoadDurationMs: 100,
      requests: 4,
    });
    expect(metrics && Object.isFrozen(metrics)).toBeTrue();
    expect(metrics && "loadMs" in metrics).toBeFalse();
    expect(indexBrowserPageMetrics([audit]).has(rawOnlyUrl)).toBeFalse();
  });

  test("rejects duplicate page audits instead of silently selecting one", () => {
    const audit = renderAudit();
    expect(() => indexBrowserPageMetrics([audit, audit])).toThrow(`Duplicate render audit for page: ${renderedUrl}`);
  });

  test("keeps Markdown page inventory and details aligned with the page metrics projection", () => {
    const markdown = renderPagesMarkdown(auditBundle()).join("\n");
    expect(markdown).toContain(
      "| URL | Status | Technical | JavaScript | Related findings | Depth | Words | HTML bytes | Content stable | JS CPU | JavaScript bytes |",
    );
    expect(markdown).toContain(`| ${renderedUrl} | 200 | 100 |`);
    expect(markdown).toContain("| DOMContentLoaded | 101 ms |");
    expect(markdown).toContain("| Load event | — |");
    expect(markdown).toContain("| Browser response transfer | 2750 bytes |");
    expect(markdown).toContain("| JavaScript response transfer | 1100 bytes |");
    expect(markdown).toContain("| Script network duration (aggregate) | 100 ms |");
    expect(markdown).toContain("| JavaScript CPU time | Not available |");
    expect(markdown).toContain("| Playwright evidence | Not rendered |");
    expect(markdown).toContain("#### Network requests (4)");
    expect(markdown).toContain("#### JavaScript resources (2)");
    expect(markdown).toContain("https://example.com/app.js");
    expect(markdown).toContain("https://example.com/app.js:4:9");
  });

  test("builds schema-valid per-page issue, link, network, JavaScript and error evidence", () => {
    const base = auditBundle();
    const edge = {
      schemaVersion: 1 as const,
      id: "edge_broken",
      sourceId: "rendered",
      sourceUrl: renderedUrl,
      targetId: "raw-only",
      targetUrl: rawOnlyUrl,
      kind: "anchor" as const,
      internal: true,
      text: "Broken target",
      rel: [],
      nofollow: false,
      sequence: 0,
    };
    const finding = {
      schemaVersion: 1 as const,
      id: "finding_broken",
      ruleId: "links.internal_broken",
      ruleVersion: "1.0.0",
      findingType: "issue" as const,
      category: "links" as const,
      severity: "high" as const,
      confidence: "confirmed" as const,
      title: "Broken internal links",
      summary: "A link target returned an error.",
      remediation: "Update or remove the link.",
      affectedUrls: [rawOnlyUrl],
      sourceUrls: [renderedUrl],
      evidence: [
        {
          kind: "link" as const,
          edgeId: edge.id,
          edgeKind: edge.kind,
          sourceUrl: renderedUrl,
          targetUrl: rawOnlyUrl,
          targetStatus: 404,
          text: edge.text,
          rel: [],
          sequence: 0,
        },
      ],
      count: 1,
    };
    const associationFinding = {
      ...finding,
      id: "finding_association",
      ruleId: "metadata.title_missing",
      category: "metadata" as const,
      severity: "medium" as const,
      title: "Missing page title",
      summary: "The page has no title.",
      remediation: "Add a descriptive title.",
      affectedUrls: [renderedUrl],
      sourceUrls: [],
      evidence: [],
    };
    const bundle = AuditBundleSchema.parse({ ...base, edges: [edge], findings: [finding, associationFinding] });
    const insights = buildPageInsights({ ...bundle, pageMetrics: buildPageMetrics(bundle) });
    const source = insights.find((insight) => insight.page.url === renderedUrl);
    const target = insights.find((insight) => insight.page.url === rawOnlyUrl);
    expect(source?.issues[0]?.roles).toContain("source");
    expect(source?.issues[0]?.pageEvidence[0]).toMatchObject({ kind: "link", sourceUrl: renderedUrl, targetUrl: rawOnlyUrl, targetStatus: 404 });
    expect(source?.issues[0]?.finding).toMatchObject({ id: finding.id, count: 1 });
    expect(source?.issues[0]?.finding).not.toHaveProperty("affectedUrls");
    expect(source?.issues[0]?.finding).not.toHaveProperty("sourceUrls");
    expect(source?.issues[0]?.finding).not.toHaveProperty("evidence");
    expect(source?.issues[0]?.locations).toEqual([
      { url: renderedUrl, role: "source" },
      { url: rawOnlyUrl, role: "target" },
    ]);
    expect(target?.issues[0]?.roles).toEqual(expect.arrayContaining(["affected", "target"]));
    expect(source?.browser?.javascriptResources.map((resource) => resource.url)).toEqual(["https://example.com/app.js", "https://cdn.example.net/vendor.js"]);
    expect(source?.browser?.consoleEvents[0]?.location).toEqual({ url: "https://example.com/app.js", lineNumber: 4, columnNumber: 9 });
    const association = source?.issues.find((issue) => issue.finding.id === associationFinding.id);
    expect(association?.evidenceLevel).toBe("association-only");
    expect(association?.locations).toEqual([{ url: renderedUrl, role: "affected" }]);
    expect(association?.pageEvidence).toEqual([{ kind: "page", url: renderedUrl, source: "derived", field: "finding_association", value: "affected" }]);
    expect(PageInsightSchema.array().parse(JSON.parse(JSON.stringify(insights)))).toEqual(insights);
    expect(PageInsightSchema.safeParse({ ...source, unexpected: true }).success).toBeFalse();
    expect(PageInsightSchema.safeParse({ ...source, schemaVersion: 3 }).success).toBeFalse();
  });

  test("keeps repeated page projections local instead of copying global finding evidence", () => {
    const urls = Array.from({ length: 50 }, (_, index) => `https://example.com/page-${index}`);
    const base = auditBundle();
    const pages = urls.map((url, index) => page(`page-${index}`, url, 1));
    const finding = {
      schemaVersion: 1 as const,
      id: "finding_site_wide",
      ruleId: "metadata.title_missing",
      ruleVersion: "1.0.0",
      findingType: "issue" as const,
      category: "metadata" as const,
      severity: "medium" as const,
      confidence: "confirmed" as const,
      title: "Missing page title",
      summary: "Pages have no title.",
      remediation: "Add descriptive titles.",
      affectedUrls: urls,
      sourceUrls: [],
      evidence: urls.map((url, index) => ({ kind: "page" as const, url, source: "fetch_raw" as const, field: `title-${index}`, value: "missing" })),
      count: urls.length,
    };
    const bundle = AuditBundleSchema.parse({ ...base, pages, renderAudits: [], findings: [finding] });
    const insights = buildPageInsights({ ...bundle, pageMetrics: buildPageMetrics(bundle) });
    expect(insights).toHaveLength(urls.length);
    expect(insights.every((insight) => !("affectedUrls" in (insight.issues[0]?.finding ?? {})))).toBeTrue();
    expect(insights.every((insight) => !("evidence" in (insight.issues[0]?.finding ?? {})))).toBeTrue();
    expect(insights.every((insight) => insight.issues[0]?.pageEvidence.length === 1)).toBeTrue();
    expect(JSON.stringify(insights).match(/title-49/gu)).toHaveLength(1);
  });
});

function renderAudit(): RenderAudit {
  const fetchRaw = createPageRepresentation("fetch_raw", "<title>Raw</title><p>Raw</p>", renderedUrl);
  const browserRaw = createPageRepresentation("browser_raw", "<title>Raw</title><p>Raw</p>", renderedUrl);
  const renderedDom = createPageRepresentation("rendered_dom", "<title>Rendered</title><h1>Rendered</h1>", renderedUrl);
  return RenderAuditSchema.parse({
    schemaVersion: 1,
    pageUrl: renderedUrl,
    fetchRaw,
    browserRaw,
    renderedDom,
    deliveryDelta: comparePageRepresentations(fetchRaw, browserRaw),
    renderDelta: comparePageRepresentations(browserRaw, renderedDom),
    totalDelta: comparePageRepresentations(fetchRaw, renderedDom),
    execution: {
      jobId: "render_page_metrics",
      url: renderedUrl,
      documentStatus: 200,
      termination: "stable",
      durationMs: 1234.4,
      requests: 4,
      requestCounts: { document: 1, script: 2, stylesheet: 1 },
      checkpoints: { domContentLoadedMs: 101.2, contentStableMs: 1200.1 },
      mutationCount: 2,
      resources: [
        resource(0, renderedUrl, "document", 1000, 100, 40),
        resource(1, "https://example.com/app.js", "script", 400, 50, 30),
        resource(2, "https://cdn.example.net/vendor.js", "script", 600, 50, 70),
        resource(3, "https://example.com/app.css", "stylesheet", 500, 50, 100),
      ],
      consoleEvents: [
        {
          sequence: 0,
          type: "error",
          text: "Example failure",
          timestampMs: 90,
          location: { url: "https://example.com/app.js", lineNumber: 4, columnNumber: 9 },
        },
      ],
      failedRequests: [],
      consoleErrors: [],
      pageErrors: [],
      clientRedirects: [],
    },
  });
}

function resource(sequence: number, url: string, resourceType: string, responseBodyBytes: number, responseHeaderBytes: number, durationMs: number) {
  return {
    sequence,
    url,
    method: "GET",
    resourceType,
    status: 200,
    durationMs,
    sizes: { requestBodyBytes: 0, requestHeaderBytes: 10, responseBodyBytes, responseHeaderBytes },
  };
}

function auditBundle(): AuditBundle {
  return AuditBundleSchema.parse({
    summary: {
      schemaVersion: 1,
      site: renderedUrl,
      startedAt: "2026-08-14T00:00:00.000Z",
      completedAt: "2026-08-14T00:00:02.000Z",
      durationMs: 2000,
      status: "complete",
      totals: {
        discovered: 2,
        crawled: 2,
        internal: 2,
        external: 0,
        html: 2,
        indexable: 2,
        nonIndexable: 0,
        blocked: 0,
        errors4xx: 0,
        errors5xx: 0,
        redirects: 0,
        issues: 0,
      },
      responseCodes: { "200": 2 },
      issueCounts: {},
    },
    pages: [page("rendered", renderedUrl, 0), page("raw-only", rawOnlyUrl, 1)],
    edges: [],
    findings: [],
    renderAudits: [renderAudit()],
    ruleEvaluations: [],
  });
}

function page(id: string, url: string, depth: number) {
  return {
    schemaVersion: 1,
    id,
    url,
    key: url,
    internal: true,
    state: "parsed",
    depth,
    navigationDepth: depth,
    discoveryCount: 1,
    discoveredVia: depth === 0 ? ["seed"] : ["anchor"],
    status: 200,
    statusText: "OK",
    contentType: "text/html",
    htmlBytes: 120,
    title: id,
    robots: [],
    headings: [{ level: 1, text: id }],
    wordCount: 1,
    scriptCount: 1,
    imageCount: 0,
    missingAltCount: 0,
  };
}
