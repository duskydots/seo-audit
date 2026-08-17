import { describe, expect, test } from "bun:test";
import { evaluateRules } from "../../packages/seo-audit/src/domain/findings/evaluate-rules.ts";
import { renderingRules } from "../../packages/seo-audit/src/domain/findings/rendering-rules.ts";
import { comparePageRepresentations } from "../../packages/seo-audit/src/domain/render/compare-page-representations.ts";
import { createPageRepresentation } from "../../packages/seo-audit/src/domain/render/create-page-representation.ts";
import { RenderAuditSchema } from "../../packages/seo-audit/src/domain/render/render-audit.schema.ts";

function contentAudit() {
  const fetchRaw = createPageRepresentation("fetch_raw", "<title>App</title><div>Loading</div>", "https://example.com/");
  const browserRaw = createPageRepresentation("browser_raw", "<title>App</title><div>Loading</div>", "https://example.com/");
  const renderedDom = createPageRepresentation(
    "rendered_dom",
    `<title>App</title><h1>Application</h1><p>${"useful rendered content ".repeat(120)}</p><a href="/next">Next</a>`,
    "https://example.com/",
  );
  return RenderAuditSchema.parse({
    schemaVersion: 1,
    pageUrl: "https://example.com/",
    fetchRaw,
    browserRaw,
    renderedDom,
    deliveryDelta: comparePageRepresentations(fetchRaw, browserRaw),
    renderDelta: comparePageRepresentations(browserRaw, renderedDom),
    totalDelta: comparePageRepresentations(fetchRaw, renderedDom),
    execution: {
      jobId: "render_1",
      url: "https://example.com/",
      documentStatus: 200,
      termination: "stable",
      durationMs: 1200,
      requests: 2,
      requestCounts: { document: 1, script: 1 },
      checkpoints: { domContentLoadedMs: 100, contentStableMs: 1200 },
      mutationCount: 2,
      resources: [],
      consoleEvents: [],
      failedRequests: [],
      consoleErrors: [],
      pageErrors: [],
      clientRedirects: [],
    },
  });
}

describe("rendering rules", () => {
  test("finds substantial rendered content and rendered-only links", () => {
    const rules = renderingRules.filter((rule) => rule.metadata.id === "rendering.primary_content_added" || rule.metadata.id === "rendering.links_added");
    const run = evaluateRules({ pages: [], edges: [], renderAudits: [contentAudit()], capabilities: ["rendered-dom", "graph"], rules });
    expect(run.findings.map((finding) => finding.ruleId).sort()).toEqual(["rendering.links_added", "rendering.primary_content_added"]);
    expect(run.findings.find((finding) => finding.ruleId === "rendering.links_added")?.evidence).toContainEqual(
      expect.objectContaining({ kind: "browser", pageUrl: "https://example.com/", field: "linksAdded", value: "https://example.com/next | text=Next" }),
    );
  });

  test("marks the rule unavailable without rendered evidence", () => {
    const rule = renderingRules.find((item) => item.metadata.id === "rendering.primary_content_added");
    if (!rule) throw new Error("Expected rendering rule was not registered");
    const run = evaluateRules({ pages: [], edges: [], capabilities: ["graph"], rules: [rule] });
    expect(run.evaluations[0]?.status).toBe("not_evaluated");
    expect(run.findings).toHaveLength(0);
  });

  test("finds large JavaScript transfers and HTTP resource errors", () => {
    const audit = contentAudit();
    audit.execution.resources.push(
      {
        sequence: 0,
        url: "https://example.com/app.js",
        method: "GET",
        resourceType: "script",
        status: 200,
        sizes: { requestBodyBytes: 0, requestHeaderBytes: 100, responseBodyBytes: 600 * 1024, responseHeaderBytes: 200 },
      },
      { sequence: 1, url: "https://example.com/api", method: "GET", resourceType: "fetch", status: 500 },
    );
    const rules = renderingRules.filter(
      (rule) => rule.metadata.id === "rendering.javascript_payload_large" || rule.metadata.id === "rendering.primary_request_failed",
    );
    const run = evaluateRules({ pages: [], edges: [], renderAudits: [audit], capabilities: ["rendered-dom"], rules });
    expect(run.findings.map((finding) => finding.ruleId).sort()).toEqual(["rendering.javascript_payload_large", "rendering.primary_request_failed"]);
    expect(run.findings.find((finding) => finding.ruleId === "rendering.primary_request_failed")?.evidence).toContainEqual(
      expect.objectContaining({
        kind: "browser",
        pageUrl: "https://example.com/",
        evidenceType: "http-error",
        requestUrl: "https://example.com/api",
        resourceType: "fetch",
        status: 500,
      }),
    );
    expect(run.findings.find((finding) => finding.ruleId === "rendering.javascript_payload_large")?.evidence).toContainEqual(
      expect.objectContaining({ kind: "browser", field: "javascriptBytes", value: String(600 * 1024 + 200) }),
    );
  });
});
