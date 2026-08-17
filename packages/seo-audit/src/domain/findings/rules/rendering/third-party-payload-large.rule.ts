import { summarizeBrowserTelemetry } from "../../../render/summarize-browser-telemetry.ts";
import { browserEvidence } from "../browser-evidence.ts";
import { defineRenderRule } from "../define-render-rule.ts";

export const largeThirdPartyPayload = defineRenderRule(
  {
    id: "rendering.third_party_payload_large",
    version: "1.0.0",
    category: "rendering",
    defaultSeverity: "low",
    findingType: "opportunity",
    confidence: "strong",
    requires: ["rendered-dom"],
    description: "Third-party browser resources exceed 500 KiB and 40% of the observed response transfer.",
  },
  (audit) => {
    const summary = summarizeBrowserTelemetry(audit.pageUrl, audit.execution);
    return summary.thirdPartyBytes > 500 * 1024 && summary.thirdPartyBytes > summary.transferredBytes * 0.4;
  },
  {
    title: "Heavy third-party browser payload",
    summary: "Third-party origins account for a substantial share of the page's observed browser transfer.",
    remediation: "Audit tags and embeds, remove redundant vendors, defer non-critical integrations, and load third-party code only where it is needed.",
    evidenceDescription: "Playwright-observed third-party bytes, total transfer bytes and resulting transfer share.",
    evidence: (audit) => {
      const telemetry = summarizeBrowserTelemetry(audit.pageUrl, audit.execution);
      return [
        browserEvidence(
          audit.pageUrl,
          "metric",
          "thirdPartyBytes",
          `${telemetry.thirdPartyBytes}; total=${telemetry.transferredBytes}; share=${telemetry.transferredBytes === 0 ? 0 : telemetry.thirdPartyBytes / telemetry.transferredBytes}`,
        ),
      ];
    },
    tags: ["javascript", "rendering", "performance", "third-party"],
  },
);
