import type { RenderAudit } from "../render/render-audit.schema.ts";
import { summarizeBrowserTelemetry } from "../render/summarize-browser-telemetry.ts";

export type BrowserPageMetrics = Readonly<{
  termination: RenderAudit["execution"]["termination"];
  totalRenderMs: number;
  domContentLoadedMs?: number;
  loadMs?: number;
  contentStableMs?: number;
  transferredBytes: number;
  javascriptBytes: number;
  javascriptLoadDurationMs: number;
  requests: number;
}>;

export function indexBrowserPageMetrics(renderAudits: readonly RenderAudit[]): ReadonlyMap<string, BrowserPageMetrics> {
  const index = new Map<string, BrowserPageMetrics>();
  for (const audit of renderAudits) {
    if (index.has(audit.pageUrl)) throw new Error(`Duplicate render audit for page: ${audit.pageUrl}`);
    const telemetry = summarizeBrowserTelemetry(audit.pageUrl, audit.execution);
    index.set(
      audit.pageUrl,
      Object.freeze({
        termination: audit.execution.termination,
        totalRenderMs: audit.execution.durationMs,
        ...(audit.execution.checkpoints.domContentLoadedMs === undefined ? {} : { domContentLoadedMs: audit.execution.checkpoints.domContentLoadedMs }),
        ...(audit.execution.checkpoints.loadMs === undefined ? {} : { loadMs: audit.execution.checkpoints.loadMs }),
        ...(audit.execution.checkpoints.contentStableMs === undefined ? {} : { contentStableMs: audit.execution.checkpoints.contentStableMs }),
        transferredBytes: telemetry.transferredBytes,
        javascriptBytes: telemetry.javascriptBytes,
        javascriptLoadDurationMs: telemetry.javascriptLoadDurationMs,
        requests: telemetry.requests,
      }),
    );
  }
  return index;
}
