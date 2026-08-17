import { RendererPool } from "../../infrastructure/process/renderer-pool.ts";
import { writeAuditArtifacts } from "../../infrastructure/storage/write-audit-artifacts.ts";
import type { ExecutionResourcePlan } from "../execution/execution-resource-plan.schema.ts";
import { buildRuleCatalog } from "../findings/build-rule-catalog.ts";
import { builtInRules } from "../findings/built-in-rules.ts";
import { evaluateRules } from "../findings/evaluate-rules.ts";
import type { RuleCapability, RuleDefinition } from "../findings/rule.schema.ts";
import { type DiscoveryKind, LiveGraph } from "../graph/live-graph.ts";
import { computeNavigationDepths } from "../graph/navigation-depths.ts";
import { extractPage } from "../html/extract-page.ts";
import { fetchResource } from "../http/fetch-resource.ts";
import { comparePageRepresentations } from "../render/compare-page-representations.ts";
import { createPageRepresentation } from "../render/create-page-representation.ts";
import { type RenderAudit, RenderAuditSchema } from "../render/render-audit.schema.ts";
import type { AuditBundle } from "../report/audit.schema.ts";
import { buildAuditSummary } from "../report/build-audit-summary.ts";
import { isAllowedByRobots } from "../robots/evaluate-robots.ts";
import { parseRobots } from "../robots/parse-robots.ts";
import type { RobotsPolicy } from "../robots/robots-record.schema.ts";
import { parseSitemap } from "../sitemap/parse-sitemap.ts";
import { isSameOrigin, normalizeUrl } from "../url/normalize-url.ts";
import type { CrawlConfig } from "./crawl-config.schema.ts";
import type { CrawlEvent } from "./crawl-event.schema.ts";

type QueueItem = { url: string; depth: number };

export type CrawlDependencies = {
  now?: () => Date;
  onEvent?: (event: CrawlEvent) => void;
  additionalRules?: readonly RuleDefinition[];
  additionalCapabilities?: Iterable<RuleCapability>;
  executionPlan?: ExecutionResourcePlan;
};

export async function crawlSite(config: CrawlConfig, dependencies: CrawlDependencies = {}): Promise<AuditBundle> {
  const now = dependencies.now ?? (() => new Date());
  const started = now();
  const seedResult = normalizeUrl(config.seed);
  if (!seedResult.ok) throw new Error(`Invalid seed URL: ${config.seed}`);
  const seed = seedResult.value;
  const origin = new URL(seed).origin;
  const graph = new LiveGraph();
  const queue: QueueItem[] = [];
  const queued = new Set<string>();
  let crawled = 0;
  let renderedCount = 0;
  const renderAudits: RenderAudit[] = [];
  const bodies = new Map<string, string>();
  let rendererPool: RendererPool | undefined;

  const enqueue = (url: string, depth: number, via: DiscoveryKind): void => {
    const internal = isSameOrigin(url, origin);
    const node = graph.discover(url, internal, depth, via);
    dependencies.onEvent?.({ type: "discovered", url, depth });
    if (!internal || queued.has(url) || terminal(node.state) || queued.size >= config.maxPages) return;
    queued.add(url);
    graph.transition(url, "queued");
    queue.push({ url, depth });
  };

  enqueue(seed, 0, "seed");
  const robots = await fetchRobots(origin, config).catch((): RobotsPolicy => ({ url: `${origin}/robots.txt`, status: 0, groups: [], sitemaps: [] }));
  if (config.discoverSitemaps) {
    const sitemapUrls = [...new Set([...robots.sitemaps, `${origin}/sitemap.xml`])];
    await discoverSitemapUrls(sitemapUrls, origin, config, graph, enqueue, dependencies.onEvent);
  }

  if (config.render !== "off" && config.maxRenderPages > 0) {
    try {
      rendererPool = new RendererPool(config.renderWorkers);
      await rendererPool.start();
    } catch (error) {
      rendererPool = undefined;
      dependencies.onEvent?.({
        type: "warning",
        message: `Rendering unavailable; raw crawl will continue: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  try {
    while (queue.length > 0 && crawled < config.maxPages) {
      const batch = queue.splice(0, Math.min(config.concurrency, config.maxPages - crawled));
      const observations = await Promise.all(
        batch.map(async (item) => {
          if (config.respectRobots && !isAllowedByRobots(robots, item.url, config.userAgent)) {
            return { item, blocked: true as const };
          }
          graph.transition(item.url, "fetching");
          try {
            const response = await fetchResource(item.url, { userAgent: config.userAgent, timeoutMs: config.requestTimeoutMs });
            return { item, blocked: false as const, response };
          } catch (error) {
            return { item, blocked: false as const, error: error instanceof Error ? error.message : String(error) };
          }
        }),
      );

      const renderCandidates: Array<{ pageUrl: string; finalUrl: string; html: string }> = [];

      for (const observation of observations) {
        const node = graph.node(observation.item.url)!;
        if (observation.blocked) {
          graph.transition(node.url, "blocked");
          crawled += 1;
          continue;
        }
        if ("error" in observation) {
          graph.transition(node.url, "failed");
          crawled += 1;
          dependencies.onEvent?.({ type: "warning", message: `${node.url}: ${observation.error}` });
          continue;
        }
        const response = observation.response;
        Object.assign(node, {
          status: response.status,
          statusText: response.statusText,
          contentType: response.contentType,
          responseTimeMs: Math.round(response.durationMs * 100) / 100,
          htmlBytes: response.body.byteLength,
          finalUrl: response.finalUrl,
          redirectChain: response.redirectChain,
        });
        graph.transition(node.url, "fetched");
        for (const hop of response.redirectChain) {
          enqueue(hop.target, node.depth, "redirect");
          graph.addEdge({ sourceId: node.id, sourceUrl: hop.url, targetUrl: hop.target, kind: "redirect", internal: isSameOrigin(hop.target, origin) });
        }
        if (response.text && response.contentType.includes("html")) {
          const page = extractPage(response.text, response.finalUrl);
          Object.assign(node, {
            title: page.title,
            description: page.description,
            canonical: page.canonical,
            robots: page.robots,
            headings: page.headings,
            wordCount: page.wordCount,
            scriptCount: page.scriptCount,
            imageCount: page.imageCount,
            missingAltCount: page.missingAltCount,
          });
          graph.transition(node.url, "parsed");
          for (const link of page.links) {
            const internal = isSameOrigin(link.url, origin);
            if (link.kind === "anchor") enqueue(link.url, node.depth + 1, "anchor");
            else if (link.kind === "canonical") graph.discover(link.url, internal, node.depth, "canonical");
            graph.addEdge({ sourceId: node.id, sourceUrl: node.url, targetUrl: link.url, kind: link.kind, internal, text: link.text, rel: link.rel });
          }
          const eligible =
            rendererPool &&
            renderedCount + renderCandidates.length < config.maxRenderPages &&
            response.status === 200 &&
            (config.render === "all" ||
              (page.scriptCount > 0 && (page.wordCount < 150 || !page.title || !page.headings.some((heading) => heading.level === 1))));
          if (eligible) {
            graph.transition(node.url, "render-queued");
            renderCandidates.push({ pageUrl: node.url, finalUrl: response.finalUrl, html: response.text });
          }
        }
        crawled += 1;
        dependencies.onEvent?.({ type: "fetched", url: node.url, status: response.status, completed: crawled, queued: queue.length });
      }

      if (rendererPool && renderCandidates.length > 0) {
        const renderedResults = await Promise.all(
          renderCandidates.map(async (candidate) => {
            try {
              return { candidate, result: await rendererPool!.render(candidate.finalUrl, config.userAgent, config.requestTimeoutMs) };
            } catch (error) {
              return { candidate, error: error instanceof Error ? error.message : String(error) };
            }
          }),
        );
        for (const renderedResult of renderedResults) {
          const node = graph.node(renderedResult.candidate.pageUrl)!;
          if ("error" in renderedResult) {
            graph.transition(node.url, "parsed");
            dependencies.onEvent?.({ type: "warning", message: `Render ${node.url}: ${renderedResult.error}` });
            continue;
          }
          const result = renderedResult.result;
          const fetchRaw = createPageRepresentation("fetch_raw", renderedResult.candidate.html, renderedResult.candidate.finalUrl);
          const browserRaw = createPageRepresentation("browser_raw", result.browserRawHtml, result.url);
          const renderedDom = createPageRepresentation("rendered_dom", result.renderedHtml, result.url);
          const { browserRawHtml: _browserRawHtml, renderedHtml: _renderedHtml, ...execution } = result;
          const audit = RenderAuditSchema.parse({
            schemaVersion: 1,
            pageUrl: node.url,
            fetchRaw,
            browserRaw,
            renderedDom,
            execution,
            deliveryDelta: comparePageRepresentations(fetchRaw, browserRaw),
            renderDelta: comparePageRepresentations(browserRaw, renderedDom),
            totalDelta: comparePageRepresentations(fetchRaw, renderedDom),
          });
          renderAudits.push(audit);
          bodies.set(fetchRaw.htmlHash, renderedResult.candidate.html);
          bodies.set(browserRaw.htmlHash, result.browserRawHtml);
          bodies.set(renderedDom.htmlHash, result.renderedHtml);
          const rendered = renderedDom.observation;
          node.rendered = {
            termination: result.termination,
            durationMs: result.durationMs,
            wordCount: rendered.wordCount,
            linkCount: rendered.links.filter((link) => link.kind === "anchor").length,
            ...(rendered.title ? { title: rendered.title } : {}),
            h1: rendered.headings.filter((heading) => heading.level === 1).map((heading) => heading.text),
            contentAddedWords: rendered.wordCount - (node.wordCount ?? 0),
          };
          for (const link of rendered.links.filter((link) => link.kind === "anchor")) {
            const internal = isSameOrigin(link.url, origin);
            if (internal) enqueue(link.url, node.depth + 1, "rendered-anchor");
            else graph.discover(link.url, false, node.depth + 1, "rendered-anchor");
            graph.addEdge({ sourceId: node.id, sourceUrl: node.url, targetUrl: link.url, kind: "rendered-anchor", internal, text: link.text, rel: link.rel });
          }
          graph.transition(node.url, "rendered");
          renderedCount += 1;
          dependencies.onEvent?.({ type: "rendered", url: node.url, durationMs: result.durationMs });
        }
      }
    }
  } finally {
    await rendererPool?.close();
  }

  const topology = graph.freeze();
  const navigationDepths = computeNavigationDepths(seed, topology.edges);
  for (const page of topology.pages) {
    const navigationDepth = navigationDepths.get(page.url);
    if (navigationDepth !== undefined) graph.node(page.url)!.navigationDepth = navigationDepth;
  }
  const frozen = graph.freeze();
  const capabilities = new Set<RuleCapability>(["page-summary", "graph", ...(dependencies.additionalCapabilities ?? [])]);
  if (frozen.pages.some((page) => page.rendered)) capabilities.add("rendered-dom");
  const enabledRules = [...builtInRules, ...(dependencies.additionalRules ?? [])];
  const ruleRun = evaluateRules({
    pages: frozen.pages,
    edges: frozen.edges,
    renderAudits,
    capabilities,
    rules: enabledRules,
  });
  const findings = ruleRun.findings;
  const completed = now();
  const summary = buildAuditSummary(seed, started, completed, crawled >= config.maxPages && queue.length > 0 ? "bounded" : "complete", frozen.pages, findings);
  const bundle: AuditBundle = {
    summary,
    pages: frozen.pages,
    edges: frozen.edges,
    findings,
    renderAudits,
    pageMetrics: [],
    pageInsights: [],
    ruleEvaluations: ruleRun.evaluations,
    ruleCatalog: buildRuleCatalog(enabledRules),
    ...(dependencies.executionPlan ? { executionPlan: dependencies.executionPlan } : {}),
  };
  return await writeAuditArtifacts(config.outputDirectory, bundle, bodies);
}

function terminal(state: string): boolean {
  return state === "parsed" || state === "rendered" || state === "blocked" || state === "failed";
}

async function fetchRobots(origin: string, config: CrawlConfig): Promise<RobotsPolicy> {
  const url = `${origin}/robots.txt`;
  const response = await fetchResource(url, { userAgent: config.userAgent, timeoutMs: config.requestTimeoutMs, maxRedirects: 5 });
  return parseRobots(response.text ?? "", url, response.status);
}

async function discoverSitemapUrls(
  initial: string[],
  origin: string,
  config: CrawlConfig,
  graph: LiveGraph,
  enqueue: (url: string, depth: number, via: DiscoveryKind) => void,
  onEvent?: (event: CrawlEvent) => void,
): Promise<void> {
  const pending = [...initial];
  const visited = new Set<string>();
  while (pending.length > 0 && visited.size < 50) {
    const sitemapUrl = pending.shift()!;
    if (visited.has(sitemapUrl)) continue;
    visited.add(sitemapUrl);
    try {
      const response = await fetchResource(sitemapUrl, { userAgent: config.userAgent, timeoutMs: config.requestTimeoutMs });
      if (response.status !== 200 || !response.text) continue;
      const sitemap = parseSitemap(response.text, sitemapUrl);
      if (!sitemap) continue;
      const sourceId = `sitemap:${sitemap.url}`;
      for (const entry of sitemap.entries) {
        if (sitemap.kind === "index") {
          if (isSameOrigin(entry.location, origin)) pending.push(entry.location);
          continue;
        }
        const internal = isSameOrigin(entry.location, origin);
        if (!internal) continue;
        enqueue(entry.location, 0, "sitemap");
        const node = graph.node(entry.location)!;
        graph.addEdge({ sourceId, sourceUrl: sitemap.url, targetUrl: node.url, kind: "sitemap-entry", internal: true });
      }
    } catch (error) {
      onEvent?.({ type: "warning", message: `Sitemap ${sitemapUrl}: ${error instanceof Error ? error.message : String(error)}` });
    }
  }
}
