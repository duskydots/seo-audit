import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FindingSchema } from "../../packages/seo-audit/src/domain/findings/finding.schema.ts";
import { RuleEvaluationSchema } from "../../packages/seo-audit/src/domain/findings/rule.schema.ts";
import { RuleCatalogEntrySchema } from "../../packages/seo-audit/src/domain/findings/rule-catalog.schema.ts";
import { EdgeSchema } from "../../packages/seo-audit/src/domain/graph/edge.schema.ts";
import { PageNodeSchema } from "../../packages/seo-audit/src/domain/graph/page-node.schema.ts";
import { RenderAuditSchema } from "../../packages/seo-audit/src/domain/render/render-audit.schema.ts";
import { AuditManifestSchema, AuditSummarySchema } from "../../packages/seo-audit/src/domain/report/audit.schema.ts";
import { AUDIT_ARTIFACT_PATHS } from "../../packages/seo-audit/src/domain/report/audit-artifact-paths.ts";
import { PageInsightSchema } from "../../packages/seo-audit/src/domain/report/page-insight.schema.ts";
import { PageMetricSchema } from "../../packages/seo-audit/src/domain/report/page-metric.schema.ts";
import { SiteMetricSchema } from "../../packages/seo-audit/src/domain/report/site-metric.schema.ts";
import { TOOL_VERSION } from "../../packages/seo-audit/src/tool-version.ts";

let server: ReturnType<typeof Bun.serve> | undefined;
let root: string;

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), "seo-audit-smoke-"));
  server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch(request) {
      const url = new URL(request.url);
      const origin = url.origin;
      if (url.pathname === "/robots.txt")
        return new Response(`User-agent: *\nDisallow: /blocked\nSitemap: ${origin}/sitemap.xml`, { headers: { "content-type": "text/plain" } });
      if (url.pathname === "/sitemap.xml")
        return new Response(
          `<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${origin}/</loc></url><url><loc>${origin}/about</loc></url><url><loc>${origin}/orphan</loc></url><url><loc>${origin}/blocked</loc></url></urlset>`,
          { headers: { "content-type": "application/xml" } },
        );
      if (url.pathname === "/")
        return new Response(
          `<!doctype html><title>Home</title><meta name="description" content="Home"><h1>Home</h1><a href="/about">About</a><a href="/broken">Broken</a><a href="/redirect">Redirect</a>`,
          { headers: { "content-type": "text/html" } },
        );
      if (url.pathname === "/about")
        return new Response(`<!doctype html><title>About</title><h1>About</h1><p>${"content ".repeat(110)}</p>`, { headers: { "content-type": "text/html" } });
      if (url.pathname === "/orphan")
        return new Response(`<!doctype html><title>Orphan</title><h1>Orphan</h1><p>${"orphan ".repeat(110)}</p>`, { headers: { "content-type": "text/html" } });
      if (url.pathname === "/redirect") return new Response(null, { status: 301, headers: { location: "/about" } });
      if (url.pathname === "/broken") return new Response("missing", { status: 404, headers: { "content-type": "text/html" } });
      if (url.pathname === "/blocked") return new Response("should not fetch", { headers: { "content-type": "text/html" } });
      return new Response("missing", { status: 404 });
    },
  });
});

afterAll(async () => {
  server?.stop(true);
  await rm(root, { recursive: true, force: true });
});

describe("CLI crawl smoke", () => {
  test("produces schema-valid graph, findings and report", async () => {
    if (!server) throw new Error("Fixture server did not start");
    const cli = new URL("../../packages/cli/src/cli.ts", import.meta.url).pathname;
    const child = Bun.spawn(["bun", "run", cli, "crawl", `http://127.0.0.1:${server.port}/`, "--concurrency", "3", "--render", "off"], {
      cwd: root,
      stdout: "pipe",
      stderr: "pipe",
    });
    expect(await child.exited).toBe(0);
    const outputName = (await readdir(root)).find((name) => name.startsWith(`audit-127.0.0.1-${server!.port}-`));
    expect(outputName).toBeDefined();
    const output = join(root, outputName!);
    const manifest = AuditManifestSchema.parse(JSON.parse(await readFile(join(output, "manifest.json"), "utf8")));
    const summary = AuditSummarySchema.parse(JSON.parse(await readFile(join(output, AUDIT_ARTIFACT_PATHS.summary), "utf8")));
    const pages = PageNodeSchema.array().parse(JSON.parse(await readFile(join(output, AUDIT_ARTIFACT_PATHS.pages), "utf8")));
    const edges = EdgeSchema.array().parse(JSON.parse(await readFile(join(output, AUDIT_ARTIFACT_PATHS.edges), "utf8")));
    const findings = FindingSchema.array().parse(JSON.parse(await readFile(join(output, AUDIT_ARTIFACT_PATHS.findings), "utf8")));
    const rules = RuleEvaluationSchema.array().parse(JSON.parse(await readFile(join(output, AUDIT_ARTIFACT_PATHS.ruleEvaluations), "utf8")));
    const ruleCatalog = RuleCatalogEntrySchema.array().parse(JSON.parse(await readFile(join(output, AUDIT_ARTIFACT_PATHS.ruleCatalog), "utf8")));
    const ruleCatalogJsonl = RuleCatalogEntrySchema.array().parse(
      (await readFile(join(output, AUDIT_ARTIFACT_PATHS.ruleCatalogJsonl), "utf8"))
        .trim()
        .split("\n")
        .map((line) => JSON.parse(line)),
    );
    const renderAudits = RenderAuditSchema.array().parse(JSON.parse(await readFile(join(output, AUDIT_ARTIFACT_PATHS.renderAudits), "utf8")));
    const pageMetrics = PageMetricSchema.array().parse(JSON.parse(await readFile(join(output, AUDIT_ARTIFACT_PATHS.pageMetrics), "utf8")));
    const pageInsights = PageInsightSchema.array().parse(JSON.parse(await readFile(join(output, AUDIT_ARTIFACT_PATHS.pageInsights), "utf8")));
    const pageInsightsJsonl = PageInsightSchema.array().parse(
      (await readFile(join(output, AUDIT_ARTIFACT_PATHS.pageInsightsJsonl), "utf8"))
        .trim()
        .split("\n")
        .map((line) => JSON.parse(line)),
    );
    const siteMetric = SiteMetricSchema.parse(JSON.parse(await readFile(join(output, AUDIT_ARTIFACT_PATHS.siteMetrics), "utf8")));
    expect(manifest.files.length).toBeGreaterThan(5);
    expect(manifest.toolVersion).toBe(TOOL_VERSION);
    expect(manifest.executionPlan?.fetchConcurrency).toBe(3);
    expect(manifest.executionPlan?.source.fetchConcurrency).toBe("override");
    expect(summary.totals.errors4xx).toBe(1);
    expect(pages.find((page) => page.url.endsWith("/blocked"))?.state).toBe("blocked");
    expect(edges.some((edge) => edge.kind === "sitemap-entry")).toBeTrue();
    expect(edges.some((edge) => edge.kind === "anchor" && edge.targetUrl.endsWith("/orphan"))).toBeFalse();
    const brokenLinkFinding = findings.find((finding) => finding.ruleId === "links.internal_broken");
    expect(brokenLinkFinding).toBeDefined();
    expect(brokenLinkFinding?.evidence).toContainEqual(
      expect.objectContaining({
        kind: "link",
        sourceUrl: `http://127.0.0.1:${server.port}/`,
        targetUrl: `http://127.0.0.1:${server.port}/broken`,
        targetStatus: 404,
        text: "Broken",
      }),
    );
    expect(findings.some((finding) => finding.ruleId === "sitemap.orphan_candidate")).toBeTrue();
    expect(rules.some((rule) => rule.status === "not_evaluated" && rule.missingCapabilities.includes("rendered-dom"))).toBeTrue();
    expect(ruleCatalog.length).toBeGreaterThanOrEqual(41);
    expect(ruleCatalogJsonl).toEqual(ruleCatalog);
    expect(ruleCatalog.find((rule) => rule.metadata.id === "links.internal_broken")?.explanation.evidence[0]).toContain("source URL");
    expect(renderAudits).toHaveLength(0);
    expect(pageMetrics.length).toBe(summary.totals.internal);
    expect(pageInsights.length).toBe(summary.totals.internal);
    expect(pageInsightsJsonl).toEqual(pageInsights);
    expect(pageInsights.find((insight) => insight.page.url.endsWith("/"))?.issues.some((issue) => issue.finding.ruleId === "links.internal_broken")).toBeTrue();
    expect(pageInsights.every((insight) => insight.issues.every((issue) => !("evidence" in issue.finding)))).toBeTrue();
    expect(siteMetric.javascriptHealth).toBeUndefined();
    const report = await readFile(join(output, "report.md"), "utf8");
    expect(report).toContain("## Documentation map");
    expect(report).toContain("markdown/issues/index.md");
    const issueDocumentPath = manifest.files.find((file) => file.path.startsWith("markdown/issues/") && file.path.includes("links-internal-broken"))?.path;
    const pageDocumentPath = manifest.files.find((file) => file.path.startsWith("markdown/pages/") && file.path !== "markdown/pages/index.md")?.path;
    expect(issueDocumentPath).toBeDefined();
    expect(pageDocumentPath).toBeDefined();
    const issueDocument = await readFile(join(output, issueDocumentPath!), "utf8");
    const pageDocument = await readFile(join(output, pageDocumentPath!), "utf8");
    const overview = await readFile(join(output, AUDIT_ARTIFACT_PATHS.markdownOverview), "utf8");
    const structure = await readFile(join(output, AUDIT_ARTIFACT_PATHS.markdownStructure), "utf8");
    const rendering = await readFile(join(output, AUDIT_ARTIFACT_PATHS.markdownRendering), "utf8");
    expect(issueDocument).toContain("| Source page | Target | Status | Anchor text | Edge kind | Rel | Occurrences |");
    expect(issueDocument).toContain(`| http://127.0.0.1:${server.port}/ | http://127.0.0.1:${server.port}/broken | 404 | Broken | anchor | — | 1 |`);
    expect(overview).toContain("### Rule coverage");
    expect(overview).toContain("### Rule catalog");
    expect(structure).toContain("### Hierarchy nodes");
    expect(rendering).toContain("Rendering was unavailable, explicitly disabled, bounded to zero pages, or no eligible page reached the render stage.");
    expect(pageDocument).toContain("#### Retrieval and indexability");
    expect(pageDocument).toContain("#### Metadata and headings");
    expect(pageDocument).toContain("#### Content and weight");
    expect(pageDocument).toContain("#### Related issues (");
    expect(pageDocument).toContain("Broken internal links");
    expect(pageDocument).toContain("#### Network requests (0)");
    expect(pageDocument).toContain("#### Incoming links (");
    expect(pageDocument).toContain("#### Outgoing links (");

    if (reportPortAvailable()) {
      const openChild = Bun.spawn(["bun", "run", cli, "open", output], { cwd: root, stdout: "pipe", stderr: "pipe" });
      try {
        const response = await waitForReport();
        expect(response.status).toBe(200);
        expect(await response.text()).toContain("SEO Audit");
        const summaryResponse = await fetch("http://127.0.0.1:4173/data/summary.json");
        expect(AuditSummarySchema.parse(await summaryResponse.json())).toEqual(summary);

        const conflictingOpen = Bun.spawn(["bun", "run", cli, "open", output], { cwd: root, stdout: "pipe", stderr: "pipe" });
        expect(await conflictingOpen.exited).toBe(2);
        expect(await new Response(conflictingOpen.stderr).text()).toContain("http://localhost:4173 is unavailable");
      } finally {
        openChild.kill();
        await openChild.exited;
      }
    } else {
      const occupiedOpen = Bun.spawn(["bun", "run", cli, "open", output], { cwd: root, stdout: "pipe", stderr: "pipe" });
      expect(await occupiedOpen.exited).toBe(2);
      expect(await new Response(occupiedOpen.stderr).text()).toContain("http://localhost:4173 is unavailable");
    }
  }, 20_000);
});

async function waitForReport(): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      return await fetch("http://127.0.0.1:4173/");
    } catch (error) {
      lastError = error;
      await Bun.sleep(50);
    }
  }
  throw new Error("Report server did not become ready", { cause: lastError });
}

function reportPortAvailable(): boolean {
  try {
    const probe = Bun.serve({ hostname: "127.0.0.1", port: 4173, fetch: () => new Response("probe") });
    probe.stop(true);
    return true;
  } catch {
    return false;
  }
}
