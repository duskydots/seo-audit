import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";
import { FindingSchema } from "../../packages/seo-audit/src/domain/findings/finding.schema.ts";
import { EdgeSchema } from "../../packages/seo-audit/src/domain/graph/edge.schema.ts";
import { PageNodeSchema } from "../../packages/seo-audit/src/domain/graph/page-node.schema.ts";
import { RenderAuditSchema } from "../../packages/seo-audit/src/domain/render/render-audit.schema.ts";
import { AUDIT_ARTIFACT_PATHS } from "../../packages/seo-audit/src/domain/report/audit-artifact-paths.ts";
import { PageMetricSchema } from "../../packages/seo-audit/src/domain/report/page-metric.schema.ts";
import { SiteMetricSchema } from "../../packages/seo-audit/src/domain/report/site-metric.schema.ts";

let server: ReturnType<typeof Bun.serve> | undefined;
let root: string;

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), "seo-audit-render-smoke-"));
  server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch(request) {
      const url = new URL(request.url);
      if (url.pathname === "/robots.txt") return new Response("User-agent: *\nAllow: /", { headers: { "content-type": "text/plain" } });
      if (url.pathname === "/sitemap.xml") return new Response("missing", { status: 404 });
      if (url.pathname === "/app.js")
        return new Response(
          `console.log("render-started"); console.warn("fixture-warning"); setTimeout(() => { document.querySelector('#app').innerHTML = '<h1>Rendered application</h1><p>${"rendered content ".repeat(120)}</p><a href="/js-only">Rendered destination</a>'; document.title = 'Rendered title'; }, 100);`,
          { headers: { "content-type": "text/javascript" } },
        );
      if (url.pathname === "/js-only")
        return new Response("<!doctype html><title>JS destination</title><h1>JS destination</h1>", { headers: { "content-type": "text/html" } });
      return new Response(
        '<!doctype html><html><head><title>App shell</title></head><body><div id="app">Loading</div><script src="/app.js"></script></body></html>',
        { headers: { "content-type": "text/html" } },
      );
    },
  });
});

afterAll(async () => {
  server?.stop(true);
  await rm(root, { recursive: true, force: true });
});

describe("rendered crawl smoke", () => {
  test("persists three representations and crawls rendered-only links", async () => {
    if (!existsSync(chromium.executablePath())) return;
    if (!server) throw new Error("Fixture server did not start");
    const serverPort = server.port;
    const cli = new URL("../../packages/cli/src/cli.ts", import.meta.url).pathname;
    const child = Bun.spawn(["bun", "run", cli, "crawl", `http://127.0.0.1:${serverPort}/`, "--render-workers", "1", "--max-render-pages", "2"], {
      cwd: root,
      stdout: "pipe",
      stderr: "pipe",
    });
    expect(await child.exited).toBe(0);
    const outputName = (await readdir(root)).find((name) => name.startsWith(`audit-127.0.0.1-${serverPort}-`));
    if (!outputName) throw new Error("Audit output directory was not created");
    const output = join(root, outputName);
    const audits = RenderAuditSchema.array().parse(JSON.parse(await readFile(join(output, AUDIT_ARTIFACT_PATHS.renderAudits), "utf8")));
    const edges = EdgeSchema.array().parse(JSON.parse(await readFile(join(output, AUDIT_ARTIFACT_PATHS.edges), "utf8")));
    const pages = PageNodeSchema.array().parse(JSON.parse(await readFile(join(output, AUDIT_ARTIFACT_PATHS.pages), "utf8")));
    const findings = FindingSchema.array().parse(JSON.parse(await readFile(join(output, AUDIT_ARTIFACT_PATHS.findings), "utf8")));
    const pageMetrics = PageMetricSchema.array().parse(JSON.parse(await readFile(join(output, AUDIT_ARTIFACT_PATHS.pageMetrics), "utf8")));
    const siteMetric = SiteMetricSchema.parse(JSON.parse(await readFile(join(output, AUDIT_ARTIFACT_PATHS.siteMetrics), "utf8")));
    expect(audits.map((value) => value.pageUrl)).toContain(`http://127.0.0.1:${serverPort}/`);
    expect(audits.map((value) => value.pageUrl)).toContain(`http://127.0.0.1:${serverPort}/js-only`);
    const audit = audits.find((value) => value.pageUrl === `http://127.0.0.1:${serverPort}/`);
    if (!audit) throw new Error("Rendered audit was not persisted");
    expect(audit.fetchRaw.source).toBe("fetch_raw");
    expect(audit.browserRaw.source).toBe("browser_raw");
    expect(audit.renderedDom.source).toBe("rendered_dom");
    expect(audit.totalDelta.addedWords).toBeGreaterThan(100);
    expect(audit.execution.resources.some((resource) => resource.resourceType === "script" && resource.url.endsWith("/app.js"))).toBeTrue();
    expect(audit.execution.resources.find((resource) => resource.url.endsWith("/app.js"))?.durationMs).toBeNumber();
    expect(audit.execution.consoleEvents.some((event) => event.type === "log" && event.text === "render-started")).toBeTrue();
    expect(audit.execution.runtimeMetrics?.scriptDurationMs).toBeGreaterThan(0);
    expect(pageMetrics.find((metric) => metric.url === audit.pageUrl)?.browser?.scriptCpuMs).toBeGreaterThan(0);
    expect(siteMetric.javascriptHealth?.pagesEvaluated).toBe(2);
    expect(edges.some((edge) => edge.kind === "rendered-anchor" && edge.targetUrl.endsWith("/js-only"))).toBeTrue();
    expect(pages.find((page) => page.url === audit.pageUrl)?.rendered?.durationMs).toBeGreaterThan(0);
    expect(findings.find((finding) => finding.ruleId === "rendering.primary_content_added")?.evidence).toContainEqual(
      expect.objectContaining({ kind: "browser", pageUrl: audit.pageUrl, evidenceType: "render-delta", field: "content.words" }),
    );
    expect(await Bun.file(join(output, audit.renderedDom.bodyPath)).exists()).toBeTrue();
    const report = await readFile(join(output, AUDIT_ARTIFACT_PATHS.markdownRendering), "utf8");
    const pageIndex = await readFile(join(output, AUDIT_ARTIFACT_PATHS.markdownPageIndex), "utf8");
    const pageDocuments = (await readdir(join(output, "markdown", "pages"))).filter((name) => name !== "index.md");
    const pageMarkdown = (await Promise.all(pageDocuments.map((name) => readFile(join(output, "markdown", "pages", name), "utf8")))).join("\n");
    const issueDocuments = (await readdir(join(output, "markdown", "issues"))).filter((name) => name !== "index.md");
    const issueMarkdown = (await Promise.all(issueDocuments.map((name) => readFile(join(output, "markdown", "issues", name), "utf8")))).join("\n");
    expect(report).toContain("## JavaScript rendering");
    expect(report).toContain("evidence/render-audits.json");
    expect(report).toContain("Observed JavaScript response transfer");
    expect(report).toContain("JavaScript CPU");
    expect(report).toContain("Script network duration");
    expect(pageIndex).toContain(
      "| URL | Status | Technical | JavaScript | Related findings | Depth | Words | HTML bytes | Content stable | JS CPU | JavaScript bytes |",
    );
    expect(pageMarkdown).toMatch(/\| JavaScript response transfer \| \d+ bytes \|/);
    expect(report).toContain("fixture-warning");
    expect(issueMarkdown).toContain("#### Observed browser evidence");
    expect(issueMarkdown).toContain("**Exact trigger:**");
  }, 30_000);
});
