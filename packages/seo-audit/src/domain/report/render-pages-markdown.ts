import { indexFindingsByPage } from "../findings/index-findings-by-page.ts";
import type { Edge } from "../graph/edge.schema.ts";
import { classifyIndexability } from "../indexability/classify-indexability.ts";
import type { BrowserResourceObservation } from "../render/browser-resource-observation.schema.ts";
import type { AuditBundle } from "./audit.schema.ts";
import { buildPageInsights } from "./build-page-insights.ts";
import { indexBrowserPageMetrics } from "./index-browser-page-metrics.ts";
import { markdownValue } from "./markdown-escape.ts";
import { REPORT_PRESENTATION_LIMITS } from "./presentation-limits.ts";
import { resolveAuditMetrics } from "./resolve-audit-metrics.ts";

export interface RenderPagesMarkdownOptions {
  pageUrls?: ReadonlySet<string>;
  includeInventory?: boolean;
  includeDetails?: boolean;
}

export function renderPagesMarkdown(bundle: AuditBundle, options: RenderPagesMarkdownOptions = {}): string[] {
  const allInternalPages = bundle.pages.filter((page) => page.internal).sort((left, right) => left.url.localeCompare(right.url));
  const internalPages = options.pageUrls ? allInternalPages.filter((page) => options.pageUrls?.has(page.url)) : allInternalPages;
  const findingsByPage = indexFindingsByPage(bundle.findings, bundle.pages, bundle.edges);
  const incomingByUrl = indexEdges(bundle.edges, "incoming");
  const outgoingByUrl = indexEdges(bundle.edges, "outgoing");
  const browserByPage = indexBrowserPageMetrics(bundle.renderAudits);
  const { pageMetrics } = resolveAuditMetrics(bundle);
  const metricsByPage = new Map(pageMetrics.map((metric) => [metric.url, metric] as const));
  const pageInsights = bundle.pageInsights.length > 0 ? bundle.pageInsights : buildPageInsights({ ...bundle, pageMetrics });
  const insightByPage = new Map(pageInsights.map((insight) => [insight.page.url, insight] as const));
  const lines = [
    "## Page documentation",
    "",
    `This section mirrors the selectable Pages UI for ${internalPages.length} internal URL${internalPages.length === 1 ? "" : "s"}. Incoming and outgoing lists use the same ${REPORT_PRESENTATION_LIMITS.pageLinkOccurrences}-occurrence per-page display bound; evidence/edges.json/jsonl remain uncapped.`,
    "",
  ];

  if (options.includeInventory !== false) {
    lines.push(
      "### Page inventory",
      "",
      "| URL | Status | Technical | JavaScript | Related findings | Depth | Words | HTML bytes | Content stable | JS CPU | JavaScript bytes |",
      "|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|",
      ...internalPages.map((page) => {
        const metric = metricsByPage.get(page.url);
        return `| ${markdownValue(page.url)} | ${markdownValue(page.status ?? page.state)} | ${metric?.technicalHealth.score ?? "—"} | ${metric?.javascriptHealth?.score ?? "—"} | ${findingsByPage.get(page.url)?.length ?? 0} | ${markdownValue(page.navigationDepth)} | ${markdownValue(page.wordCount)} | ${markdownValue(page.htmlBytes)} | ${metric?.browser?.contentStableMs === undefined ? "—" : `${Math.round(metric.browser.contentStableMs)} ms`} | ${metric?.browser?.scriptCpuMs === undefined ? "—" : `${Math.round(metric.browser.scriptCpuMs)} ms`} | ${metric?.browser?.javascriptBytes ?? "—"} |`;
      }),
      "",
    );
  }

  if (options.includeDetails === false) return lines;

  for (const [index, page] of internalPages.entries()) {
    const indexability = classifyIndexability(page);
    const relatedFindings = findingsByPage.get(page.url) ?? [];
    const incoming = incomingByUrl.get(page.url) ?? [];
    const outgoing = outgoingByUrl.get(page.url) ?? [];
    const browser = browserByPage.get(page.url);
    const metric = metricsByPage.get(page.url);
    const insight = insightByPage.get(page.url);
    lines.push(
      `### Page ${index + 1}: ${page.url}`,
      "",
      `**Title:** ${markdownValue(page.title)}`,
      "",
      "#### Retrieval and indexability",
      "",
      "| Field | Value |",
      "|---|---|",
      `| URL | ${markdownValue(page.url)} |`,
      `| Technical Health | ${metric?.technicalHealth.score ?? "—"}/100 |`,
      `| JavaScript Health | ${metric?.javascriptHealth ? `${metric.javascriptHealth.score}/100` : "Not available"} |`,
      `| State | ${page.state} |`,
      `| Status | ${markdownValue(page.status)}${page.statusText ? ` ${markdownValue(page.statusText)}` : ""} |`,
      `| Content type | ${markdownValue(page.contentType)} |`,
      `| Response time | ${page.responseTimeMs === undefined ? "—" : `${Math.round(page.responseTimeMs)} ms`} |`,
      `| Final URL | ${markdownValue(page.finalUrl ?? page.url)} |`,
      `| Indexability | ${indexability.indexable ? "Indexable candidate" : "Not indexable"} |`,
      `| Indexability reason | ${indexability.reason} |`,
      `| Robots directives | ${markdownValue(page.robots.join(", "))} |`,
      `| Canonical | ${markdownValue(page.canonical)} |`,
      `| Crawl depth | ${page.depth} |`,
      `| Navigation depth | ${markdownValue(page.navigationDepth)} |`,
      `| Discovered via | ${markdownValue(page.discoveredVia.join(", "))} |`,
      `| Discovery count | ${page.discoveryCount} |`,
      "",
      "#### Metadata and headings",
      "",
      "| Field | Value |",
      "|---|---|",
      `| Title | ${markdownValue(page.title)} |`,
      `| Description | ${markdownValue(page.description)} |`,
      "",
      "| Order | Level | Heading text |",
      "|---:|---:|---|",
      ...page.headings.map((heading, headingIndex) => `| ${headingIndex + 1} | H${heading.level} | ${markdownValue(heading.text)} |`),
      ...(page.headings.length === 0 ? ["| — | — | No headings observed |"] : []),
      "",
      "#### Content and weight",
      "",
      "| Metric | Value |",
      "|---|---:|",
      `| Words | ${markdownValue(page.wordCount)} |`,
      `| HTML bytes | ${markdownValue(page.htmlBytes)} |`,
      `| Scripts | ${markdownValue(page.scriptCount)} |`,
      `| Images | ${markdownValue(page.imageCount)} |`,
      `| Images missing alt | ${page.missingAltCount ?? 0} |`,
      "",
      "#### Browser execution",
      "",
      "| Metric | Value |",
      "|---|---:|",
      ...(browser
        ? [
            `| Total render time | ${Math.round(browser.totalRenderMs)} ms |`,
            `| DOMContentLoaded | ${milliseconds(browser.domContentLoadedMs)} |`,
            `| Load event | ${milliseconds(browser.loadMs)} |`,
            `| Content stable | ${milliseconds(browser.contentStableMs)} |`,
            `| Browser response transfer | ${browser.transferredBytes} bytes |`,
            `| JavaScript response transfer | ${browser.javascriptBytes} bytes |`,
            `| Script network duration (aggregate) | ${Math.round(browser.javascriptLoadDurationMs)} ms |`,
            `| JavaScript CPU time | ${metric?.browser?.scriptCpuMs === undefined ? "Not available" : `${Math.round(metric.browser.scriptCpuMs)} ms`} |`,
            `| Main-thread task time | ${metric?.browser?.taskCpuMs === undefined ? "Not available" : `${Math.round(metric.browser.taskCpuMs)} ms`} |`,
            `| Long tasks | ${metric?.browser ? `${metric.browser.longTaskCount} / ${Math.round(metric.browser.longTaskTotalMs)} ms` : "Not available"} |`,
            `| Browser requests | ${browser.requests} |`,
          ]
        : ["| Playwright evidence | Not rendered |"]),
      "",
      `#### Related issues (${relatedFindings.length})`,
      "",
      "| Severity | Type | Rule | Finding | Relationship | Evidence |",
      "|---|---|---|---|---|---:|",
      ...(insight?.issues ?? []).map(
        ({ finding, roles, evidenceLevel, pageEvidence }) =>
          `| ${finding.severity} | ${finding.findingType} | ${markdownValue(`${finding.ruleId}@${finding.ruleVersion}`)} | ${markdownValue(finding.title)} | ${markdownValue(roles.join(", "))} | ${evidenceLevel === "exact" ? `${pageEvidence.length} exact` : "association only"} |`,
      ),
      ...(relatedFindings.length === 0 ? ["| — | — | — | No associated findings | — |"] : []),
      "",
      ...(insight?.issues ?? []).flatMap(({ finding, roles, evidenceLevel, locations, pageEvidence }, issueIndex) => [
        `##### Issue ${issueIndex + 1}: ${finding.title}`,
        "",
        `**Relationship:** ${markdownValue(roles.join(", "))}`,
        "",
        `**Evidence level:** ${evidenceLevel}`,
        "",
        `**Summary:** ${markdownValue(finding.summary)}`,
        "",
        `**Recommended fix:** ${markdownValue(finding.remediation)}`,
        "",
        "| Where to inspect | Role |",
        "|---|---|",
        ...locations.map((location) => `| ${markdownValue(location.url)} | ${location.role} |`),
        "",
        "| Evidence type | Source | Target / field | Status / value | Anchor / representation |",
        "|---|---|---|---|---|",
        ...pageEvidence.map((evidence) =>
          evidence.kind === "link"
            ? `| Link | ${markdownValue(evidence.sourceUrl)} | ${markdownValue(evidence.targetUrl)} | ${markdownValue(evidence.targetStatus)} | ${markdownValue(evidence.text || "Empty anchor")} (${evidence.edgeKind}) |`
            : evidence.kind === "browser"
              ? `| Browser | ${markdownValue(evidence.pageUrl)} | ${markdownValue(evidence.requestUrl ?? evidence.field)} | ${markdownValue(evidence.status ?? evidence.value)} | playwright (${evidence.evidenceType}${evidence.resourceType ? `, ${evidence.resourceType}` : ""}) |`
              : `| Page | ${markdownValue(evidence.url)} | ${markdownValue(evidence.field ?? "Page")} | ${markdownValue(evidence.value ?? "Observed")} | ${evidence.source} |`,
        ),
        "",
      ]),
      `#### Network requests (${insight?.browser?.resources.length ?? 0})`,
      "",
      "| Type | Status | Transfer bytes | Duration | URL | Failure |",
      "|---|---:|---:|---:|---|---|",
      ...(insight?.browser?.resources.slice(0, REPORT_PRESENTATION_LIMITS.browserResourcesPerPage).map(resourceRow) ?? []),
      ...(insight?.browser?.resources.length ? [] : ["| — | — | — | — | No browser resources captured | — |"]),
      ...(insight?.browser?.resourcesTruncated ? ["| Note | | | | Browser resource capture limit reached; JSON marks this collection truncated. | |"] : []),
      "",
      `#### JavaScript resources (${insight?.browser?.javascriptResources.length ?? 0})`,
      "",
      "| Type | Status | Transfer bytes | Duration | URL | Failure |",
      "|---|---:|---:|---:|---|---|",
      ...(insight?.browser?.javascriptResources.slice(0, REPORT_PRESENTATION_LIMITS.browserResourcesPerPage).map(resourceRow) ?? []),
      ...(insight?.browser?.javascriptResources.length ? [] : ["| — | — | — | — | No JavaScript resources captured | — |"]),
      "",
      `#### Console and runtime errors (${(insight?.browser?.consoleEvents.length ?? 0) + (insight?.browser?.pageErrors.length ?? 0)})`,
      "",
      "| Level | Time | Source | Message |",
      "|---|---:|---|---|",
      ...(insight?.browser?.consoleEvents
        .slice(0, REPORT_PRESENTATION_LIMITS.browserConsoleEventsPerPage)
        .map(
          (event) =>
            `| ${markdownValue(event.type)} | ${Math.round(event.timestampMs)} ms | ${markdownValue(event.location.url ? `${event.location.url}:${event.location.lineNumber}:${event.location.columnNumber}` : "—")} | ${markdownValue(event.text)} |`,
        ) ?? []),
      ...(insight?.browser?.pageErrors.map((error) => `| pageerror | — | ${markdownValue(page.url)} | ${markdownValue(error)} |`) ?? []),
      ...((insight?.browser?.consoleEvents.length ?? 0) + (insight?.browser?.pageErrors.length ?? 0) === 0
        ? ["| — | — | — | No console or runtime errors captured |"]
        : []),
      ...(insight?.browser?.consoleEventsTruncated ? ["| Note | | | Console capture limit reached; JSON marks this collection truncated. |"] : []),
      "",
      `#### Incoming links (${incoming.length})`,
      "",
      "| Source page | Anchor text | Kind | Rel | Target |",
      "|---|---|---|---|---|",
      ...incoming.slice(0, REPORT_PRESENTATION_LIMITS.pageLinkOccurrences).map((edge) => linkRow(edge, "incoming")),
      ...(incoming.length === 0 ? ["| — | — | — | — | No incoming anchor links observed |"] : []),
      ...(incoming.length > REPORT_PRESENTATION_LIMITS.pageLinkOccurrences
        ? [`| …${incoming.length - REPORT_PRESENTATION_LIMITS.pageLinkOccurrences} additional occurrences omitted by the UI/report bound | | | | |`]
        : []),
      "",
      `#### Outgoing links (${outgoing.length})`,
      "",
      "| Target page | Anchor text | Kind | Rel | Source |",
      "|---|---|---|---|---|",
      ...outgoing.slice(0, REPORT_PRESENTATION_LIMITS.pageLinkOccurrences).map((edge) => linkRow(edge, "outgoing")),
      ...(outgoing.length === 0 ? ["| — | — | — | — | No outgoing anchor links observed |"] : []),
      ...(outgoing.length > REPORT_PRESENTATION_LIMITS.pageLinkOccurrences
        ? [`| …${outgoing.length - REPORT_PRESENTATION_LIMITS.pageLinkOccurrences} additional occurrences omitted by the UI/report bound | | | | |`]
        : []),
      "",
    );
  }
  return lines;
}

function milliseconds(value: number | undefined): string {
  return value === undefined ? "—" : `${Math.round(value)} ms`;
}

function resourceRow(resource: BrowserResourceObservation): string {
  const transferBytes = (resource.sizes?.responseBodyBytes ?? 0) + (resource.sizes?.responseHeaderBytes ?? 0);
  return `| ${markdownValue(resource.resourceType)} | ${markdownValue(resource.status)} | ${transferBytes} | ${milliseconds(resource.durationMs)} | ${markdownValue(resource.url)} | ${markdownValue(resource.failureText)} |`;
}

function indexEdges(edges: readonly Edge[], direction: "incoming" | "outgoing"): Map<string, Edge[]> {
  const index = new Map<string, Edge[]>();
  for (const edge of edges) {
    if (edge.kind !== "anchor" && edge.kind !== "rendered-anchor") continue;
    const key = direction === "incoming" ? edge.targetUrl : edge.sourceUrl;
    const values = index.get(key) ?? [];
    values.push(edge);
    index.set(key, values);
  }
  for (const values of index.values()) values.sort((left, right) => left.sequence - right.sequence);
  return index;
}

function linkRow(edge: Edge, direction: "incoming" | "outgoing"): string {
  const primary = direction === "incoming" ? edge.sourceUrl : edge.targetUrl;
  const counterpart = direction === "incoming" ? edge.targetUrl : edge.sourceUrl;
  return `| ${markdownValue(primary)} | ${markdownValue(edge.text)} | ${edge.kind} | ${markdownValue(edge.rel.join(" "))} | ${markdownValue(counterpart)} |`;
}
