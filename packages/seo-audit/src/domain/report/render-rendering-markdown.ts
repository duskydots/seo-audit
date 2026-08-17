import { summarizeBrowserTelemetry } from "../render/summarize-browser-telemetry.ts";
import type { AuditBundle } from "./audit.schema.ts";
import { markdownValue } from "./markdown-escape.ts";
import { REPORT_PRESENTATION_LIMITS } from "./presentation-limits.ts";
import { resolveAuditMetrics } from "./resolve-audit-metrics.ts";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / 1024 ** 2).toFixed(2)} MiB`;
}

export function renderRenderingMarkdown(bundle: AuditBundle): string[] {
  const { renderAudits } = bundle;
  const { pageMetrics, siteMetric } = resolveAuditMetrics(bundle);
  const metricsByPage = new Map(pageMetrics.map((metric) => [metric.url, metric] as const));
  const summaries = renderAudits.map((audit) => summarizeBrowserTelemetry(audit.pageUrl, audit.execution));
  const stable = renderAudits.filter((audit) => audit.execution.termination === "stable").length;
  const jsLinks = renderAudits.reduce((sum, audit) => sum + audit.totalDelta.linksAdded.filter((link) => link.kind === "anchor").length, 0);
  const signalChanges = renderAudits.filter(
    (audit) => audit.totalDelta.canonical.state !== "unchanged" || audit.totalDelta.robotsAdded.length > 0 || audit.totalDelta.robotsRemoved.length > 0,
  ).length;
  const total = summaries.reduce(
    (result, summary) => ({
      transfer: result.transfer + summary.transferredBytes,
      javascript: result.javascript + summary.javascriptBytes,
      javascriptLoad: result.javascriptLoad + summary.javascriptLoadDurationMs,
      thirdParty: result.thirdParty + summary.thirdPartyBytes,
      httpErrors: result.httpErrors + summary.httpErrors,
      failures: result.failures + summary.failedRequests,
      consoleErrors: result.consoleErrors + summary.consoleErrors,
      pageErrors: result.pageErrors + summary.pageErrors,
    }),
    { transfer: 0, javascript: 0, javascriptLoad: 0, thirdParty: 0, httpErrors: 0, failures: 0, consoleErrors: 0, pageErrors: 0 },
  );
  const lines = [
    "## JavaScript rendering",
    "",
    "Independent native-fetch, browser-response, rendered-DOM, resource, and console evidence captured by Playwright Chromium.",
    "",
    "| Metric | Value |",
    "|---|---:|",
    `| JavaScript Health | ${siteMetric.javascriptHealth ? `${siteMetric.javascriptHealth.score}/100 (${siteMetric.javascriptHealth.status})` : "Not available"} |`,
    `| Render coverage | ${siteMetric.javascriptHealth ? `${(siteMetric.javascriptHealth.coverage * 100).toFixed(1)}%` : "Not available"} |`,
    `| Pages with CPU evidence | ${siteMetric.javascriptHealth ? `${(siteMetric.javascriptHealth.evidenceCoverage * 100).toFixed(1)}%` : "Not available"} |`,
    `| Pages rendered | ${renderAudits.length} |`,
    `| Pages reaching stability | ${stable} |`,
    `| Anchor links added after rendering | ${jsLinks} |`,
    `| Pages changing canonical or robots signals | ${signalChanges} |`,
    `| Observed browser response transfer | ${formatBytes(total.transfer)} |`,
    `| Observed JavaScript response transfer | ${formatBytes(total.javascript)} |`,
    `| Aggregate JavaScript resource load time | ${Math.round(total.javascriptLoad)} ms |`,
    `| Observed third-party response transfer | ${formatBytes(total.thirdParty)} |`,
    `| Browser responses with HTTP errors | ${total.httpErrors} |`,
    `| Browser transport failures | ${total.failures} |`,
    `| Console error/assert events | ${total.consoleErrors} |`,
    `| Uncaught page errors | ${total.pageErrors} |`,
    "",
    "### Browser metric distributions",
    "",
    "| Metric | p50 | p75 | p95 | Maximum | Pages |",
    "|---|---:|---:|---:|---:|---:|",
    ...(siteMetric.distributions.contentStableMs
      ? [
          `| Content stable | ${Math.round(siteMetric.distributions.contentStableMs.p50)} ms | ${Math.round(siteMetric.distributions.contentStableMs.p75)} ms | ${Math.round(siteMetric.distributions.contentStableMs.p95)} ms | ${Math.round(siteMetric.distributions.contentStableMs.maximum)} ms | ${siteMetric.distributions.contentStableMs.count} |`,
        ]
      : []),
    ...(siteMetric.distributions.scriptCpuMs
      ? [
          `| JavaScript CPU | ${Math.round(siteMetric.distributions.scriptCpuMs.p50)} ms | ${Math.round(siteMetric.distributions.scriptCpuMs.p75)} ms | ${Math.round(siteMetric.distributions.scriptCpuMs.p95)} ms | ${Math.round(siteMetric.distributions.scriptCpuMs.maximum)} ms | ${siteMetric.distributions.scriptCpuMs.count} |`,
        ]
      : []),
    ...(siteMetric.distributions.javascriptBytes
      ? [
          `| JavaScript bytes | ${formatBytes(siteMetric.distributions.javascriptBytes.p50)} | ${formatBytes(siteMetric.distributions.javascriptBytes.p75)} | ${formatBytes(siteMetric.distributions.javascriptBytes.p95)} | ${formatBytes(siteMetric.distributions.javascriptBytes.maximum)} | ${siteMetric.distributions.javascriptBytes.count} |`,
        ]
      : []),
    "",
    "### Resource composition",
    "",
    "| Resource type | Requests | Transfer |",
    "|---|---:|---:|",
    ...Object.entries(siteMetric.resourceTypes)
      .sort(([, left], [, right]) => right.bytes - left.bytes)
      .map(([type, values]) => `| ${markdownValue(type)} | ${values.requests} | ${formatBytes(values.bytes)} |`),
    "",
    "### Third-party domains",
    "",
    "| Domain | Pages | Requests | Transfer |",
    "|---|---:|---:|---:|",
    ...siteMetric.thirdPartyDomains
      .slice(0, 20)
      .map((domain) => `| ${markdownValue(domain.domain)} | ${domain.pages} | ${domain.requests} | ${formatBytes(domain.bytes)} |`),
    ...(siteMetric.thirdPartyDomains.length === 0 ? ["| — | 0 | 0 | 0 B |"] : []),
    "",
  ];
  if (renderAudits.length === 0) {
    return [
      ...lines,
      "Rendering was unavailable, explicitly disabled, bounded to zero pages, or no eligible page reached the render stage. Render-dependent rules are not evaluated.",
      "",
    ];
  }
  lines.push(
    "### Rendered page inventory",
    "",
    "| URL | JS Health | End state | Content stable | JS CPU | Long tasks | Words | Similarity | Requests | Transfer | JavaScript | Script network duration | Third-party | Errors |",
    "|---|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|",
    ...renderAudits.map((audit, index) => {
      const summary = summaries[index] ?? summarizeBrowserTelemetry(audit.pageUrl, audit.execution);
      const metric = metricsByPage.get(audit.pageUrl);
      return `| ${markdownValue(audit.pageUrl)} | ${metric?.javascriptHealth?.score ?? "—"} | ${audit.execution.termination} | ${metric?.browser?.contentStableMs === undefined ? "—" : `${Math.round(metric.browser.contentStableMs)} ms`} | ${metric?.browser?.scriptCpuMs === undefined ? "—" : `${Math.round(metric.browser.scriptCpuMs)} ms`} | ${metric?.browser ? `${metric.browser.longTaskCount} / ${Math.round(metric.browser.longTaskTotalMs)} ms` : "—"} | ${audit.totalDelta.rawWordCount} → ${audit.totalDelta.renderedWordCount} | ${(audit.totalDelta.textSimilarity * 100).toFixed(1)}% | ${summary.requests} | ${formatBytes(summary.transferredBytes)} | ${formatBytes(summary.javascriptBytes)} | ${Math.round(summary.javascriptLoadDurationMs)} ms | ${summary.thirdPartyRequests} / ${formatBytes(summary.thirdPartyBytes)} | ${summary.httpErrors + summary.failedRequests + summary.pageErrors} / ${summary.consoleErrors} |`;
    }),
    "",
  );
  for (const audit of renderAudits) {
    const resources = [...audit.execution.resources]
      .sort(
        (left, right) =>
          (right.sizes?.responseBodyBytes ?? 0) +
            (right.sizes?.responseHeaderBytes ?? 0) -
            ((left.sizes?.responseBodyBytes ?? 0) + (left.sizes?.responseHeaderBytes ?? 0)) || left.sequence - right.sequence,
      )
      .slice(0, REPORT_PRESENTATION_LIMITS.browserResourcesPerPage);
    const events = audit.execution.consoleEvents.slice(0, REPORT_PRESENTATION_LIMITS.browserConsoleEventsPerPage);
    lines.push(
      `### Browser execution: ${markdownValue(audit.pageUrl)}`,
      "",
      `Termination: **${audit.execution.termination}** · DOM mutations: **${audit.execution.mutationCount}** · Client redirects: **${audit.execution.clientRedirects.length}**`,
      ...(audit.execution.resourcesTruncated || audit.execution.consoleEventsTruncated
        ? [
            "",
            `Evidence bound reached: resources ${audit.execution.resourcesTruncated ? "truncated" : "complete"}; console events ${audit.execution.consoleEventsTruncated ? `truncated (${audit.execution.consoleMessages} observed)` : "complete"}.`,
          ]
        : []),
      "",
      "#### Largest and failed browser resources",
      "",
      "| Type | Status | Transfer | Duration | Service worker | URL | Failure |",
      "|---|---:|---:|---:|---|---|---|",
      ...resources.map((resource) => {
        const bytes = (resource.sizes?.responseBodyBytes ?? 0) + (resource.sizes?.responseHeaderBytes ?? 0);
        return `| ${markdownValue(resource.resourceType)} | ${resource.status ?? "—"} | ${formatBytes(bytes)} | ${resource.durationMs === undefined ? "—" : `${Math.round(resource.durationMs)} ms`} | ${resource.fromServiceWorker ? "yes" : "no"} | ${markdownValue(resource.url)} | ${markdownValue(resource.failureText)} |`;
      }),
      ...(resources.length === 0 ? ["| — | — | — | — | — | No browser resources recorded | — |"] : []),
      "",
      "#### Console and runtime errors",
      "",
      "| Level | Time | Source | Message |",
      "|---|---:|---|---|",
      ...events.map(
        (event) =>
          `| ${markdownValue(event.type)} | ${Math.round(event.timestampMs)} ms | ${markdownValue(event.location.url ? `${event.location.url}:${event.location.lineNumber}:${event.location.columnNumber}` : undefined)} | ${markdownValue(event.text)} |`,
      ),
      ...audit.execution.pageErrors.map((error) => `| pageerror | — | ${markdownValue(audit.pageUrl)} | ${markdownValue(error)} |`),
      ...(events.length === 0 && audit.execution.pageErrors.length === 0 ? ["| — | — | — | No console or uncaught runtime errors recorded |"] : []),
      "",
    );
  }
  lines.push(
    `Resource tables show the ${REPORT_PRESENTATION_LIMITS.browserResourcesPerPage} largest observations per rendered page; console tables show the first ${REPORT_PRESENTATION_LIMITS.browserConsoleEventsPerPage}. Complete, bounded evidence remains in evidence/render-audits.json/jsonl. Transfer sizes are Playwright-reported encoded response body plus response header bytes. Script network duration is the aggregate duration of script requests and may overlap. JavaScript CPU time is the Chromium Performance-domain ScriptDuration delta. These are lab observations, not Core Web Vitals.`,
    "",
  );
  return lines;
}
