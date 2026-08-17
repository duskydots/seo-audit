import { browserEvidence } from "../browser-evidence.ts";
import { defineRenderRule } from "../define-render-rule.ts";

export const browserDeliveryVariant = defineRenderRule(
  {
    id: "rendering.browser_delivery_variant",
    version: "1.0.0",
    category: "rendering",
    defaultSeverity: "low",
    findingType: "opportunity",
    confidence: "heuristic",
    requires: ["rendered-dom"],
    description: "Native fetch and browser navigation receive materially different response HTML.",
  },
  (audit) =>
    audit.deliveryDelta.textSimilarity < 0.8 ||
    audit.deliveryDelta.title.state !== "unchanged" ||
    audit.deliveryDelta.canonical.state !== "unchanged" ||
    audit.deliveryDelta.robotsAdded.length > 0 ||
    audit.deliveryDelta.robotsRemoved.length > 0,
  {
    title: "Browser and crawler received different HTML",
    summary: "The native HTTP fetch and Chromium navigation response differ materially before JavaScript execution.",
    remediation:
      "Review CDN, user-agent, cookie, locale, experimentation, and client-hint behavior; confirm that legitimate crawlers receive equivalent primary content.",
    evidenceDescription: "Native-fetch versus browser-response similarity and exact metadata/indexability deltas before JavaScript execution.",
    evidence: (audit) => [
      browserEvidence(
        audit.pageUrl,
        "render-delta",
        "deliveryDelta",
        `similarity=${audit.deliveryDelta.textSimilarity}; title=${audit.deliveryDelta.title.state}; canonical=${audit.deliveryDelta.canonical.state}; robotsAdded=${audit.deliveryDelta.robotsAdded.join(",") || "none"}; robotsRemoved=${audit.deliveryDelta.robotsRemoved.join(",") || "none"}`,
      ),
    ],
    tags: ["javascript", "rendering", "delivery"],
  },
);
