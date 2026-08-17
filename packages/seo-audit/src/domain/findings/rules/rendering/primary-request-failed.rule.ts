import type { FindingEvidence } from "../../finding.schema.ts";
import { defineRenderRule } from "../define-render-rule.ts";

export const primaryRequestFailure = defineRenderRule(
  {
    id: "rendering.primary_request_failed",
    version: "1.1.0",
    category: "rendering",
    defaultSeverity: "high",
    findingType: "warning",
    confidence: "strong",
    requires: ["rendered-dom"],
    description: "Document, script, XHR, or fetch requests failed at the transport layer or returned an HTTP error during rendering.",
  },
  (audit) =>
    audit.execution.failedRequests.some((failure) => ["document", "script", "xhr", "fetch"].includes(failure.resourceType)) ||
    audit.execution.resources.some((resource) => ["document", "script", "xhr", "fetch"].includes(resource.resourceType) && (resource.status ?? 0) >= 400),
  {
    title: "Critical browser requests failed",
    summary: "One or more document, JavaScript, XHR, or fetch requests failed or returned an HTTP error while rendering the page.",
    remediation: "Fix the failed resources or API calls and provide resilient server-rendered fallbacks for primary content.",
    evidenceDescription: "Every failed or HTTP-error document, script, XHR and fetch request with URL, resource type, error/status.",
    evidence: (audit) => [
      ...audit.execution.failedRequests
        .filter((failure) => ["document", "script", "xhr", "fetch"].includes(failure.resourceType))
        .map(
          (failure): FindingEvidence => ({
            kind: "browser",
            pageUrl: audit.pageUrl,
            source: "playwright",
            evidenceType: "network-failure",
            field: "request.failure",
            value: failure.errorText,
            requestUrl: failure.url,
            resourceType: failure.resourceType,
          }),
        ),
      ...audit.execution.resources
        .filter((resource) => ["document", "script", "xhr", "fetch"].includes(resource.resourceType) && (resource.status ?? 0) >= 400)
        .map(
          (resource): FindingEvidence => ({
            kind: "browser",
            pageUrl: audit.pageUrl,
            source: "playwright",
            evidenceType: "http-error",
            field: "response.status",
            value: String(resource.status),
            requestUrl: resource.url,
            resourceType: resource.resourceType,
            status: resource.status,
          }),
        ),
    ],
    tags: ["javascript", "rendering", "network"],
  },
);
