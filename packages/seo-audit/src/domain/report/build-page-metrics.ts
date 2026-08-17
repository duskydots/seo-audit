import type { Finding } from "../findings/finding.schema.ts";
import { indexFindingsByPage } from "../findings/index-findings-by-page.ts";
import type { RenderAudit } from "../render/render-audit.schema.ts";
import { summarizeBrowserTelemetry } from "../render/summarize-browser-telemetry.ts";
import type { AuditBundle } from "./audit.schema.ts";
import { type PageMetric, PageMetricSchema } from "./page-metric.schema.ts";

type TechnicalComponent = "retrieval" | "indexability" | "content" | "connectivity";

const technicalCategories: Readonly<Record<Finding["category"], TechnicalComponent | undefined>> = {
  response: "retrieval",
  indexability: "indexability",
  metadata: "content",
  headings: "content",
  links: "connectivity",
  content: "content",
  images: "content",
  sitemap: "connectivity",
  rendering: undefined,
  "structured-data": "content",
  performance: undefined,
  international: "indexability",
};

const severityPenalty: Readonly<Record<Finding["severity"], number>> = {
  critical: 40,
  high: 25,
  medium: 12,
  low: 5,
  info: 0,
};

function healthStatus(score: number): "good" | "needs-work" | "poor" {
  if (score >= 85) return "good";
  if (score >= 60) return "needs-work";
  return "poor";
}

function findingPenalty(finding: Finding): number {
  const typeMultiplier = finding.findingType === "issue" ? 1 : finding.findingType === "warning" ? 0.75 : 0.5;
  const confidenceMultiplier = finding.confidence === "confirmed" ? 1 : finding.confidence === "strong" ? 0.85 : 0.6;
  return severityPenalty[finding.severity] * typeMultiplier * confidenceMultiplier;
}

function buildTechnicalHealth(findings: readonly Finding[]) {
  const values: Record<TechnicalComponent, number> = { retrieval: 100, indexability: 100, content: 100, connectivity: 100 };
  for (const finding of findings) {
    const component = technicalCategories[finding.category];
    if (component) values[component] = Math.max(0, values[component] - findingPenalty(finding));
  }
  const components = {
    retrieval: Math.round(values.retrieval),
    indexability: Math.round(values.indexability),
    content: Math.round(values.content),
    connectivity: Math.round(values.connectivity),
  };
  const score = Math.round(components.retrieval * 0.35 + components.indexability * 0.25 + components.content * 0.2 + components.connectivity * 0.2);
  return { score, status: healthStatus(score), components, issueCount: findings.length } as const;
}

function scoreNetwork(javascriptBytes: number, thirdPartyBytes: number, transferredBytes: number, requests: number): number {
  const javascriptPenalty = javascriptBytes <= 200_000 ? 0 : javascriptBytes <= 500_000 ? 12 : javascriptBytes <= 1_000_000 ? 28 : 45;
  const thirdPartyRatio = transferredBytes === 0 ? 0 : thirdPartyBytes / transferredBytes;
  const thirdPartyPenalty = thirdPartyRatio <= 0.2 ? 0 : thirdPartyRatio <= 0.4 ? 8 : thirdPartyRatio <= 0.6 ? 16 : 25;
  const requestPenalty = requests <= 50 ? 0 : requests <= 100 ? 7 : requests <= 200 ? 15 : 25;
  return Math.max(0, 100 - javascriptPenalty - thirdPartyPenalty - requestPenalty);
}

function scoreMainThread(scriptCpuMs: number, taskCpuMs: number, longTaskTotalMs: number): number {
  const scriptPenalty = scriptCpuMs <= 200 ? 0 : scriptCpuMs <= 500 ? 12 : scriptCpuMs <= 1_000 ? 28 : 45;
  const taskPenalty = taskCpuMs <= 1_000 ? 0 : taskCpuMs <= 2_500 ? 10 : taskCpuMs <= 5_000 ? 20 : 30;
  const longTaskPenalty = longTaskTotalMs <= 100 ? 0 : longTaskTotalMs <= 300 ? 8 : longTaskTotalMs <= 1_000 ? 18 : 30;
  return Math.max(0, 100 - scriptPenalty - taskPenalty - longTaskPenalty);
}

function buildJavaScriptMetric(audit: RenderAudit): Pick<PageMetric, "browser" | "javascriptHealth"> {
  const telemetry = summarizeBrowserTelemetry(audit.pageUrl, audit.execution);
  const longTaskTotalMs = audit.execution.longTasks.reduce((sum, task) => sum + task.durationMs, 0);
  const longestTaskMs = audit.execution.longTasks.reduce((maximum, task) => Math.max(maximum, task.durationMs), 0);
  const runtime = audit.execution.runtimeMetrics;
  const signalChanged =
    audit.totalDelta.canonical.state !== "unchanged" || audit.totalDelta.robotsAdded.length > 0 || audit.totalDelta.robotsRemoved.length > 0;
  const contentSafety = Math.max(
    0,
    Math.round(audit.totalDelta.textSimilarity * 100) -
      (signalChanged ? 35 : 0) -
      (audit.totalDelta.removedWords > audit.totalDelta.rawWordCount * 0.2 ? 20 : 0),
  );
  const renderReliability = audit.execution.termination === "stable" ? 100 : audit.execution.termination === "hard-timeout" ? 35 : 0;
  const mainThread = runtime ? scoreMainThread(runtime.scriptDurationMs, runtime.taskDurationMs, longTaskTotalMs) : undefined;
  const network = scoreNetwork(telemetry.javascriptBytes, telemetry.thirdPartyBytes, telemetry.transferredBytes, telemetry.requests);
  const errorCount = telemetry.httpErrors + telemetry.failedRequests + telemetry.pageErrors + telemetry.consoleErrors;
  const errors = Math.max(0, 100 - Math.min(100, errorCount * 15));
  const weighted = [
    { value: contentSafety, weight: 30 },
    { value: renderReliability, weight: 20 },
    ...(mainThread === undefined ? [] : [{ value: mainThread, weight: 20 }]),
    { value: network, weight: 20 },
    { value: errors, weight: 10 },
  ];
  const availableWeight = weighted.reduce((sum, component) => sum + component.weight, 0);
  const score = Math.round(weighted.reduce((sum, component) => sum + component.value * component.weight, 0) / availableWeight);
  return {
    javascriptHealth: {
      score,
      status: healthStatus(score),
      components: { contentSafety, renderReliability, ...(mainThread === undefined ? {} : { mainThread }), network, errors },
      evidenceCoverage: availableWeight / 100,
    },
    browser: {
      termination: audit.execution.termination,
      totalRenderMs: audit.execution.durationMs,
      ...(audit.execution.checkpoints.domContentLoadedMs === undefined ? {} : { domContentLoadedMs: audit.execution.checkpoints.domContentLoadedMs }),
      ...(audit.execution.checkpoints.loadMs === undefined ? {} : { loadMs: audit.execution.checkpoints.loadMs }),
      ...(audit.execution.checkpoints.contentStableMs === undefined ? {} : { contentStableMs: audit.execution.checkpoints.contentStableMs }),
      ...(runtime
        ? {
            scriptCpuMs: runtime.scriptDurationMs,
            taskCpuMs: runtime.taskDurationMs,
            layoutCpuMs: runtime.layoutDurationMs,
            recalcStyleCpuMs: runtime.recalcStyleDurationMs,
          }
        : {}),
      longTaskCount: audit.execution.longTasks.length,
      longTaskTotalMs,
      longestTaskMs,
      transferredBytes: telemetry.transferredBytes,
      javascriptBytes: telemetry.javascriptBytes,
      scriptNetworkDurationMs: telemetry.javascriptLoadDurationMs,
      thirdPartyBytes: telemetry.thirdPartyBytes,
      thirdPartyRequests: telemetry.thirdPartyRequests,
      requests: telemetry.requests,
      httpErrors: telemetry.httpErrors,
      failedRequests: telemetry.failedRequests,
      consoleErrors: telemetry.consoleErrors,
      pageErrors: telemetry.pageErrors,
      rawWordCount: audit.totalDelta.rawWordCount,
      renderedWordCount: audit.totalDelta.renderedWordCount,
      textSimilarity: audit.totalDelta.textSimilarity,
      linksAdded: audit.totalDelta.linksAdded.filter((link) => link.kind === "anchor").length,
    },
  };
}

export function buildPageMetrics(bundle: AuditBundle): readonly PageMetric[] {
  const findingsByPage = indexFindingsByPage(bundle.findings, bundle.pages, bundle.edges);
  const renderByUrl = new Map<string, RenderAudit>();
  for (const audit of bundle.renderAudits) {
    if (renderByUrl.has(audit.pageUrl)) throw new Error(`Duplicate render audit for page: ${audit.pageUrl}`);
    renderByUrl.set(audit.pageUrl, audit);
  }
  return bundle.pages
    .filter((page) => page.internal)
    .sort((left, right) => left.url.localeCompare(right.url))
    .map((page) => {
      const audit = renderByUrl.get(page.url);
      return PageMetricSchema.parse({
        schemaVersion: 1,
        url: page.url,
        eligibleForRendering: Boolean(page.status && page.status >= 200 && page.status < 300 && page.contentType?.includes("html")),
        technicalHealth: buildTechnicalHealth(findingsByPage.get(page.url) ?? []),
        ...(audit ? buildJavaScriptMetric(audit) : {}),
      });
    });
}
