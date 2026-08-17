import { summarizeBrowserTelemetry } from "../../../render/summarize-browser-telemetry.ts";
import { browserEvidence } from "../browser-evidence.ts";
import { defineRenderRule } from "../define-render-rule.ts";

export const largeJavascriptPayload = defineRenderRule(
  {
    id: "rendering.javascript_payload_large",
    version: "1.0.0",
    category: "rendering",
    defaultSeverity: "medium",
    findingType: "opportunity",
    confidence: "strong",
    requires: ["rendered-dom"],
    description: "Browser-observed JavaScript response transfer exceeds 500 KiB.",
  },
  (audit) => summarizeBrowserTelemetry(audit.pageUrl, audit.execution).javascriptBytes > 500 * 1024,
  {
    title: "Large JavaScript transfer payload",
    summary: "The rendered page transferred more than 500 KiB of JavaScript response data in Chromium.",
    remediation:
      "Remove unused bundles, split code by route, compress responses, and keep critical content available without waiting for large client bundles.",
    evidenceDescription: "Playwright-observed aggregate JavaScript transfer bytes and the configured 500 KiB diagnostic threshold.",
    evidence: (audit) => [
      browserEvidence(audit.pageUrl, "metric", "javascriptBytes", String(summarizeBrowserTelemetry(audit.pageUrl, audit.execution).javascriptBytes)),
    ],
    tags: ["javascript", "rendering", "performance", "payload"],
  },
);
