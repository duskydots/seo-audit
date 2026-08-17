import { getDomain } from "tldts";
import type { BrowserResourceObservation } from "./browser-resource-observation.schema.ts";
import type { RenderObservation } from "./render-observation.schema.ts";

export type BrowserTelemetrySummary = Readonly<{
  requests: number;
  transferredBytes: number;
  javascriptBytes: number;
  javascriptLoadDurationMs: number;
  thirdPartyBytes: number;
  thirdPartyRequests: number;
  httpErrors: number;
  failedRequests: number;
  consoleErrors: number;
  consoleWarnings: number;
  pageErrors: number;
}>;

function responseBytes(resource: BrowserResourceObservation): number {
  return resource.sizes ? resource.sizes.responseBodyBytes + resource.sizes.responseHeaderBytes : 0;
}

type BrowserTelemetryExecution = Pick<RenderObservation, "requests" | "resources" | "failedRequests" | "consoleEvents" | "pageErrors">;

export function summarizeBrowserTelemetry(pageUrl: string, execution: BrowserTelemetryExecution): BrowserTelemetrySummary {
  const pageHostname = new URL(pageUrl).hostname;
  const pageDomain = getDomain(pageHostname) ?? pageHostname;
  let transferredBytes = 0;
  let javascriptBytes = 0;
  let javascriptLoadDurationMs = 0;
  let thirdPartyBytes = 0;
  let thirdPartyRequests = 0;
  let httpErrors = 0;
  for (const resource of execution.resources) {
    const bytes = responseBytes(resource);
    transferredBytes += bytes;
    if (resource.resourceType === "script") {
      javascriptBytes += bytes;
      javascriptLoadDurationMs += resource.durationMs ?? 0;
    }
    let thirdParty = false;
    try {
      const resourceHostname = new URL(resource.url).hostname;
      thirdParty = (getDomain(resourceHostname) ?? resourceHostname) !== pageDomain;
    } catch {
      thirdParty = false;
    }
    if (thirdParty) {
      thirdPartyRequests += 1;
      thirdPartyBytes += bytes;
    }
    if ((resource.status ?? 0) >= 400) httpErrors += 1;
  }
  return Object.freeze({
    requests: execution.requests,
    transferredBytes,
    javascriptBytes,
    javascriptLoadDurationMs,
    thirdPartyBytes,
    thirdPartyRequests,
    httpErrors,
    failedRequests: execution.failedRequests.length,
    consoleErrors: execution.consoleEvents.filter((event) => event.type === "error" || event.type === "assert").length,
    consoleWarnings: execution.consoleEvents.filter((event) => event.type === "warning").length,
    pageErrors: execution.pageErrors.length,
  });
}
